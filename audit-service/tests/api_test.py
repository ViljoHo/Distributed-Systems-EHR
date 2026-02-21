import os
import tempfile
from datetime import datetime, timedelta, timezone

import jwt
import pytest

from audit_api import create_app, db

TEST_JWT_SECRET = "test-jwt-secret"
TEST_JWT_ISSUER = "auth-service"
TEST_JWT_AUDIENCE = "audit-service"


@pytest.fixture
def client():
    db_fd, db_file_name = tempfile.mkstemp()
    os.close(db_fd)
    config = {
        "SQLALCHEMY_DATABASE_URI": "sqlite:///" + db_file_name,
        "TESTING": True,
        "AUTH_JWT_SECRET": TEST_JWT_SECRET,
        "AUTH_JWT_EXPECTED_ISSUER": TEST_JWT_ISSUER,
        "AUTH_JWT_EXPECTED_AUDIENCE": TEST_JWT_AUDIENCE,
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


def _service_auth_headers():
    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {
            "sub": "hospital-api",
            "iss": TEST_JWT_ISSUER,
            "aud": TEST_JWT_AUDIENCE,
            "exp": int((now + timedelta(minutes=10)).timestamp()),
        },
        TEST_JWT_SECRET,
        algorithm="HS256",
    )
    return {
        "Authorization": f"Bearer {token}",
    }


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


def _valid_event_payload():
    return {
        "source_service": "hospital-api",
        "source_node_id": "hospital-1",
        "action": "PATIENT_READ",
        "resource_type": "PATIENT",
        "resource_id": "123",
        "outcome": "ALLOW",
        "occurred_at": "2026-02-18T12:00:00Z",
    }


def _post_event(client, occurred_at, resource_id):
    payload = _valid_event_payload()
    payload["occurred_at"] = occurred_at
    payload["resource_id"] = resource_id
    return client.post(
        "/internal/v1/audit/events/",
        json=payload,
        headers=_service_auth_headers(),
    )


def test_post_event_rejects_invalid_datetime(client):
    payload = _valid_event_payload()
    payload["occurred_at"] = "not-a-date"

    response = client.post(
        "/internal/v1/audit/events/",
        json=payload,
        headers=_service_auth_headers(),
    )
    assert response.status_code == 400


def test_post_event_rejects_missing_occurred_at(client):
    payload = _valid_event_payload()
    payload.pop("occurred_at")

    response = client.post(
        "/internal/v1/audit/events/",
        json=payload,
        headers=_service_auth_headers(),
    )
    assert response.status_code == 400


def test_post_event_accepts_rfc3339_datetime(client):
    response = client.post(
        "/internal/v1/audit/events/",
        json=_valid_event_payload(),
        headers=_service_auth_headers(),
    )
    assert response.status_code == 201


def test_get_events_rejects_invalid_from_datetime(client):
    response = client.get(
        "/internal/v1/audit/events/?from=not-a-date",
        headers=_admin_auth_headers(),
    )
    assert response.status_code == 400


def test_health_check(client):
    response = client.get("/internal/v1/health")
    assert response.status_code == 200
    body = response.get_json()
    assert body["status"] == "ok"


def test_get_events_rejects_invalid_to_datetime(client):
    response = client.get(
        "/internal/v1/audit/events/?to=not-a-date",
        headers=_admin_auth_headers(),
    )
    assert response.status_code == 400


def test_get_events_filters_by_from_and_to(client):
    assert _post_event(client, "2026-02-18T10:00:00Z", "early").status_code == 201
    assert _post_event(client, "2026-02-18T12:00:00Z", "middle").status_code == 201
    assert _post_event(client, "2026-02-18T14:00:00Z", "late").status_code == 201

    response = client.get(
        "/internal/v1/audit/events/?from=2026-02-18T11:00:00Z&to=2026-02-18T13:00:00Z",
        headers=_admin_auth_headers(),
    )

    assert response.status_code == 200
    items = response.get_json()
    assert len(items) == 1
    assert items[0]["resource_id"] == "middle"


def test_get_events_allows_admin_user_token(client):
    assert _post_event(client, "2026-02-18T12:00:00Z", "middle").status_code == 201

    response = client.get(
        "/internal/v1/audit/events/",
        headers=_admin_auth_headers(),
    )
    assert response.status_code == 200
    items = response.get_json()
    assert len(items) == 1


def test_post_event_rejects_admin_user_token(client):
    response = client.post(
        "/internal/v1/audit/events/",
        json=_valid_event_payload(),
        headers=_admin_auth_headers(),
    )
    assert response.status_code == 401


def test_get_events_rejects_service_token(client):
    response = client.get(
        "/internal/v1/audit/events/",
        headers=_service_auth_headers(),
    )
    assert response.status_code == 403
