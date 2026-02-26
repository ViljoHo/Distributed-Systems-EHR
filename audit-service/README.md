# audit_service

## Endpoints

- `GET /internal/v1/health`
- `GET /internal/v1/audit/events/`
- `GET /internal/v1/audit/events/<event_id>/`
- `GET /internal/v1/audit/patients/<patient_id>/timeline/`

`GET /internal/v1/audit/events/` query params: `patient_id`, `actor_id`, `action`, `outcome`, `from`, `to`.
`GET /internal/v1/audit/patients/<patient_id>/timeline/` query params: `from`, `to`.

All `/internal/v1/audit/*` endpoints require `Authorization: Bearer <token>`.

## Event ingestion

- Audit events are ingested from Redis Streams (`audit_events`).
- Each stream entry must include a `data` field containing the JSON payload.

## Auth (JWT)

- Bearer token is verified with `AUTH_JWT_SECRET` (HS256)
- Admin user token claims (used for `GET`): `exp` and `role=ADMIN`
- Endpoint auth rules:
    - `GET` audit endpoints require admin user token with role `ADMIN`


## Quick start (Docker)

1. Copy `.env.example` to `.env`.
2. Reset old volumes:
    - `docker compose -f docker-compose.dev.yml down -v`
    - `docker volume rm audit-service-dev-postgres-volume 2>/dev/null || true`
3. Start API + DB + Redis:
    - `docker compose -f docker-compose.dev.yml up --build`
4. Health check:
    - `curl http://localhost:5004/internal/v1/health`


## Extra commands

- `flask --app=audit_api init-db`
- `flask --app=audit_api reset-db`
