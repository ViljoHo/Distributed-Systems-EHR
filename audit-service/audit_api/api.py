from flask import Blueprint
from flask_restful import Api

from .resources.event import AuditEventCollection, AuditEventItem
from .resources.health import Health
from .resources.patient_timeline import PatientTimeline

api_bp = Blueprint("api", __name__, url_prefix="/api/v1")
api = Api(api_bp)

api.add_resource(Health, "/health")
api.add_resource(AuditEventCollection, "/audit/events/")
api.add_resource(AuditEventItem, "/audit/events/<audit_event:audit_event>/")
api.add_resource(PatientTimeline, "/audit/patients/<string:patient_id>/timeline/")
