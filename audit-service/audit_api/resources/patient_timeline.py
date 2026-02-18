from flask import request
from flask_restful import Resource

from audit_api.models import AuditEvent
from audit_api.utils import (
    parse_occurred_at_or_raise,
    require_scope,
    require_service_token,
)


class PatientTimeline(Resource):
    @require_service_token
    @require_scope("audit:read")
    def get(self, patient_id, auth_context):
        occurred_from = parse_occurred_at_or_raise(request.args.get("from"), "from")
        occurred_to = parse_occurred_at_or_raise(request.args.get("to"), "to")

        query = AuditEvent.query.filter_by(patient_id=patient_id)

        if occurred_from:
            query = query.filter(AuditEvent.occurred_at >= occurred_from)
        if occurred_to:
            query = query.filter(AuditEvent.occurred_at <= occurred_to)

        rows = (
            query.order_by(AuditEvent.occurred_at.desc(), AuditEvent.created_at.desc())
            .all()
        )

        return {
            "patient_id": patient_id,
            "items": [row.serialize() for row in rows],
        }
