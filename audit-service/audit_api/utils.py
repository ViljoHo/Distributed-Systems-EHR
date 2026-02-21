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


def require_service_token(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        auth_context = _authenticate()
        return func(*args, auth_context=auth_context, **kwargs)
    return wrapper


def require_scope(required_scope):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            auth_context = kwargs.get("auth_context")
            if not auth_context:
                raise Forbidden("Authentication context missing")

            scopes = auth_context.get("scopes", [])
            if required_scope not in scopes:
                raise Forbidden("Insufficient token scope")
            return func(*args, **kwargs)
        return wrapper
    return decorator


def _authenticate():
    token = _token_from_bearer_header()
    if not token:
        raise Unauthorized("Missing bearer token")

    return _authenticate_jwt(token)


def _token_from_bearer_header():
    authorization = request.headers.get(API_BEARER_HEADER, "")
    if not authorization.lower().startswith("bearer "):
        return None
    return authorization[7:]


def _authenticate_jwt(token):
    jwt_secret = current_app.config.get("AUTH_JWT_SECRET")
    expected_issuer = current_app.config.get("AUTH_JWT_EXPECTED_ISSUER")
    expected_audience = current_app.config.get("AUTH_JWT_EXPECTED_AUDIENCE")

    try:
        payload = jwt.decode(
            token,
            jwt_secret,
            algorithms=["HS256"],
            issuer=expected_issuer,
            audience=expected_audience,
            options={"require": ["exp", "sub", "iss", "aud"]},
        )
    except jwt.ExpiredSignatureError as exc:
        raise Unauthorized("Token expired") from exc
    except jwt.MissingRequiredClaimError as exc:
        raise Unauthorized(f"Invalid token: missing '{exc.claim}' claim") from exc
    except (jwt.InvalidIssuerError, jwt.InvalidAudienceError) as exc:
        raise Unauthorized("Invalid token claims") from exc
    except jwt.PyJWTError as exc:
        raise Unauthorized("Invalid token") from exc

    return {"scopes": _extract_scopes(payload)}


def _extract_scopes(payload):
    token_scope = payload.get("scope")
    if not isinstance(token_scope, str):
        return []

    scopes = token_scope.split()
    return list(set(scopes))


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
    except FormatError as exc:
        raise BadRequest(description=f"{field_name} must be RFC3339 date-time") from exc

    normalized = value.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(normalized)
    except ValueError as exc:
        raise BadRequest(description=f"{field_name} must be RFC3339 date-time") from exc
