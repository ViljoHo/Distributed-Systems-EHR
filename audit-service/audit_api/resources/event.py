from flask import Response, request, url_for
from flask_restful import Resource
from jsonschema import Draft202012Validator, ValidationError, validate
from werkzeug.exceptions import BadRequest, UnsupportedMediaType

from audit_api import db
from audit_api.models import AuditEvent
from audit_api.utils import (
    load_json_schema,
    parse_occurred_at_or_raise,
    require_admin_token,
    require_service_token,
)

SCHEMA = load_json_schema("audit_event.json")
FORMAT_CHECKER = Draft202012Validator.FORMAT_CHECKER


class AuditEventCollection(Resource):
    @require_admin_token
    def get(self):
        query = AuditEvent.query

        patient_id = request.args.get("patient_id")
        actor_id = request.args.get("actor_id")
        action = request.args.get("action")
        outcome = request.args.get("outcome")
        occurred_from = parse_occurred_at_or_raise(request.args.get("from"), "from")
        occurred_to = parse_occurred_at_or_raise(request.args.get("to"), "to")

        if patient_id:
            query = query.filter_by(patient_id=patient_id)
        if actor_id:
            query = query.filter_by(actor_id=actor_id)
        if action:
            query = query.filter_by(action=action)
        if outcome:
            query = query.filter_by(outcome=outcome)
        if occurred_from:
            query = query.filter(AuditEvent.occurred_at >= occurred_from)
        if occurred_to:
            query = query.filter(AuditEvent.occurred_at <= occurred_to)

        rows = (
            query.order_by(AuditEvent.occurred_at.desc(), AuditEvent.received_at.desc())
            .all()
        )

        return [row.serialize() for row in rows]

    @require_service_token
    def post(self):
        if not request.json:
            raise UnsupportedMediaType

        try:
            validate(request.json, SCHEMA, format_checker=FORMAT_CHECKER)
        except ValidationError as error:
            raise BadRequest(description=str(error))

        event = AuditEvent()
        event.deserialize(request.json)

        db.session.add(event)
        db.session.commit()

        return Response(
            status=201,
            headers={
                "Location": url_for("api.auditeventitem", audit_event=event)
            },
        )


class AuditEventItem(Resource):
    @require_admin_token
    def get(self, audit_event: AuditEvent):
        return audit_event.serialize()
