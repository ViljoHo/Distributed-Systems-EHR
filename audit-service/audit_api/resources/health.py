from datetime import datetime, timezone

from flask_restful import Resource


class Health(Resource):
    def get(self):
        return {
            "status": "ok",
            "service": "audit_service",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
