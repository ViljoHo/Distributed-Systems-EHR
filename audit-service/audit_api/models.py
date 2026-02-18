from datetime import datetime, timezone
import uuid

import click
from flask.cli import with_appcontext

from . import db


class AuditEvent(db.Model):
    event_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    occurred_at = db.Column(db.DateTime, nullable=False)
    received_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    request_id = db.Column(db.String(36), nullable=True)
    actor_type = db.Column(db.String(32), nullable=False)
    actor_id = db.Column(db.String(36), nullable=True)
    source_service = db.Column(db.String(128), nullable=False)
    source_node_id = db.Column(db.String(128), nullable=False)
    action = db.Column(db.String(128), nullable=False)
    resource_type = db.Column(db.String(128), nullable=False)
    resource_id = db.Column(db.String(36), nullable=True)
    patient_id = db.Column(db.String(36), nullable=True)
    outcome = db.Column(db.String(16), nullable=False)

    details = db.Column(db.JSON, nullable=False, default=dict)

    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    def deserialize(self, json_dict, request_id):
        self.occurred_at = _parse_iso_datetime(json_dict["occurred_at"])
        self.request_id = request_id

        self.actor_type = json_dict["actor_type"]
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
            "request_id": self.request_id,
            "actor_type": self.actor_type,
            "actor_id": self.actor_id,
            "source_service": self.source_service,
            "source_node_id": self.source_node_id,
            "action": self.action,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "patient_id": self.patient_id,
            "outcome": self.outcome,
            "details": self.details,
            "created_at": self.created_at.isoformat() if self.created_at else None,
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
