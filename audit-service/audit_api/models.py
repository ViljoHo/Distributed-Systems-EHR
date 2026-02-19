from datetime import datetime, timezone
import uuid

import click
from flask.cli import with_appcontext

from . import db


class AuditEvent(db.Model):
    event_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    occurred_at = db.Column(db.DateTime, nullable=False)
    received_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    actor_id = db.Column(db.String(36), nullable=True) # user.id from auth, etc
    source_service = db.Column(db.String(128), nullable=False)  # hospital, auth
    source_node_id = db.Column(db.String(128), nullable=False)  # hospital_1
    action = db.Column(db.String(128), nullable=False)  # PATIENT_READ, PATIENT_WRITE, PATIENT_UPDATE 
    resource_type = db.Column(db.String(128), nullable=False) # PATIENT / MEDICAL_RECORD
    resource_id = db.Column(db.String(36), nullable=True) # patient.id / record.id
    patient_id = db.Column(db.String(36), nullable=True) # for easy searching by patient
    outcome = db.Column(db.String(16), nullable=False) # ALLOW, DENY, ERROR
    details = db.Column(db.JSON, nullable=False, default=dict) # changed_fields = [name, birthdate, etc]

    def deserialize(self, json_dict):
        self.occurred_at = _parse_iso_datetime(json_dict["occurred_at"])
        self.actor_id = json_dict.get("actor_id")
        self.source_service = json_dict["source_service"]
        self.source_node_id = json_dict["source_node_id"]
        self.action = json_dict["action"]
        self.resource_type = json_dict["resource_type"]
        self.resource_id = json_dict.get("resource_id")
        self.patient_id = json_dict.get("patient_id")
        self.outcome = json_dict["outcome"]

        self.details = json_dict.get("details", {})

    def serialize(self):
        return {
            "event_id": self.event_id,
            "occurred_at": self.occurred_at.isoformat() if self.occurred_at else None,
            "received_at": self.received_at.isoformat() if self.received_at else None,
            "actor_id": self.actor_id,
            "source_service": self.source_service,
            "source_node_id": self.source_node_id,
            "action": self.action,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "patient_id": self.patient_id,
            "outcome": self.outcome,
            "details": self.details,
        }


@click.command("init-db")
@with_appcontext
def init_db_command():
    db.create_all()


@click.command("reset-db")
@with_appcontext
def reset_db_command():
    db.drop_all()
    db.create_all()


def _parse_iso_datetime(value):
    if not value:
        return None

    normalized = value.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(normalized)
    except ValueError:
        return None
