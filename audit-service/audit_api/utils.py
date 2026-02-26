from datetime import datetime
from functools import wraps
import json
import os

import jwt
from flask import current_app, request
from jsonschema import Draft202012Validator
from jsonschema.exceptions import FormatError
from werkzeug.exceptions import (
    BadRequest,
    Forbidden,
    NotFound,
    Unauthorized,
)
from werkzeug.routing import BaseConverter

from .constants import API_BEARER_HEADER
from .models import AuditEvent

SCHEMA_FOLDER_PATH = os.path.join(os.path.dirname(__file__), "static", "schema")
FORMAT_CHECKER = Draft202012Validator.FORMAT_CHECKER


def load_json_schema(file_name):
    schema_path = os.path.join(SCHEMA_FOLDER_PATH, file_name)
    with open(schema_path, encoding="utf-8") as file:
        return json.load(file)


def require_admin_token(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        _authenticate_admin()
        return func(*args, **kwargs)
    return wrapper


def _authenticate_admin():
    token = _token_from_bearer_header()
    if not token:
        raise Unauthorized("Missing bearer token")

    _authenticate_admin_jwt(token)


def _token_from_bearer_header():
    authorization = request.headers.get(API_BEARER_HEADER, "")
    if not authorization.lower().startswith("bearer "):
        return None
    return authorization[7:]


def _authenticate_admin_jwt(token):
    jwt_secret = current_app.config.get("AUTH_JWT_SECRET")

    try:
        payload = jwt.decode(
            token,
            jwt_secret,
            algorithms=["HS256"],
            options={"require": ["exp"], "verify_aud": False},
        )
    except jwt.ExpiredSignatureError as err:
        raise Unauthorized("Token expired") from err
    except jwt.MissingRequiredClaimError as err:
        raise Unauthorized(f"Invalid token: missing '{err.claim}' claim") from err
    except jwt.PyJWTError as err:
        raise Unauthorized("Invalid token") from err

    if payload.get("role") != "ADMIN":
        raise Forbidden("Admin role required")


class AuditEventConverter(BaseConverter):
    def to_python(self, event_id):
        db_event = AuditEvent.query.filter_by(event_id=event_id).first()
        if db_event is None:
            raise NotFound(description=f"Audit event with id '{event_id}' not found")
        return db_event

    def to_url(self, db_event):
        return str(db_event.event_id)


def parse_occurred_at_or_raise(value, field_name):
    if value is None:
        return None

    value = str(value).strip()
    if not value:
        return None

    try:
        FORMAT_CHECKER.check(value, "date-time")
    except FormatError as err:
        raise BadRequest(description=f"{field_name} must be RFC3339 date-time") from err

    normalized = value.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(normalized)
    except ValueError as err:
        raise BadRequest(description=f"{field_name} must be RFC3339 date-time") from err
