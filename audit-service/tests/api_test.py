import os
import tempfile
from datetime import datetime, timedelta, timezone

import jwt
import pytest

from audit_api import create_app, db
from audit_api.models import AuditEvent

TEST_JWT_SECRET = "test-jwt-secret"


@pytest.fixture
def client():
    db_fd, db_file_name = tempfile.mkstemp()
    os.close(db_fd)
    config = {
        "SQLALCHEMY_DATABASE_URI": "sqlite:///" + db_file_name,
        "TESTING": True,
        "AUTH_JWT_SECRET": TEST_JWT_SECRET,
    }

    app = create_app(config)

    ctx = app.app_context()
    ctx.push()

    db.create_all()
    yield app.test_client()

    db.session.rollback()
    db.drop_all()
    db.session.remove()
    db.engine.dispose()
    ctx.pop()
    os.unlink(db_file_name)


def _admin_auth_headers(role="ADMIN"):
    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {
            "user_id": "admin-user-id",
            "email": "admin@test.com",
            "role": role,
            "exp": int((now + timedelta(minutes=10)).timestamp()),
        },
        TEST_JWT_SECRET,
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}


def _insert_event(occurred_at, resource_id):
    event = AuditEvent()
    event.deserialize({
        "source_service": "hospital-api",
        "source_node_id": "hospital-1",
        "action": "PATIENT_READ",
        "resource_type": "PATIENT",
        "resource_id": resource_id,
        "outcome": "ALLOW",
        "occurred_at": occurred_at,
    })
    db.session.add(event)
    db.session.commit()
    return event


def test_health_check(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.get_json()
    assert body["status"] == "ok"


def test_get_events_rejects_invalid_from_datetime(client):
    response = client.get(
        "/api/v1/audit/events/?from=not-a-date",
        headers=_admin_auth_headers(),
    )
    assert response.status_code == 400


def test_get_events_rejects_invalid_to_datetime(client):
    response = client.get(
        "/api/v1/audit/events/?to=not-a-date",
        headers=_admin_auth_headers(),
    )
    assert response.status_code == 400


def test_get_events_filters_by_from_and_to(client):
    _insert_event("2026-02-18T10:00:00Z", "early")
    _insert_event("2026-02-18T12:00:00Z", "middle")
    _insert_event("2026-02-18T14:00:00Z", "late")

    response = client.get(
        "/api/v1/audit/events/?from=2026-02-18T11:00:00Z&to=2026-02-18T13:00:00Z",
        headers=_admin_auth_headers(),
    )

    assert response.status_code == 200
    items = response.get_json()
    assert len(items) == 1
    assert items[0]["resource_id"] == "middle"


def test_get_events_allows_admin_user_token(client):
    _insert_event("2026-02-18T12:00:00Z", "test-resource")

    response = client.get(
        "/api/v1/audit/events/",
        headers=_admin_auth_headers(),
    )
    assert response.status_code == 200
    items = response.get_json()
    assert len(items) == 1


def test_get_events_rejects_non_admin_token(client):
    response = client.get(
        "/api/v1/audit/events/",
        headers=_admin_auth_headers(role="DOCTOR"),
    )
    assert response.status_code == 403


def test_get_events_rejects_missing_token(client):
    response = client.get("/api/v1/audit/events/")
    assert response.status_code == 401
