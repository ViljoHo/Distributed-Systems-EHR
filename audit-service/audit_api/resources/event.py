from flask import request
from flask_restful import Resource

from audit_api.models import AuditEvent
from audit_api.utils import (
    parse_occurred_at_or_raise,
    require_admin_token,
)


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


class AuditEventItem(Resource):
    @require_admin_token
    def get(self, audit_event: AuditEvent):
        return audit_event.serialize()
