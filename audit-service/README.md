# audit_service

## Endpoints

- `GET /internal/v1/health`
- `POST /internal/v1/audit/events/`
- `GET /internal/v1/audit/events/`
- `GET /internal/v1/audit/events/<event_id>/`
- `GET /internal/v1/audit/patients/<patient_id>/timeline/`

`GET /internal/v1/audit/events/` query params: `patient_id`, `actor_id`, `action`, `outcome`, `from`, `to`.

All `/internal/v1/audit/*` endpoints require `Authorization: Bearer <token>`.

## Auth (JWT)

- Bearer token is verified with `AUTH_JWT_SECRET` (HS256)
- Required JWT claims: `exp`, `iat`, `sub`, `iss`, `aud`
- Expected claim values come from:
    - `AUTH_JWT_EXPECTED_ISSUER`
    - `AUTH_JWT_EXPECTED_AUDIENCE`
- Endpoint scope checks:
    - `POST /internal/v1/audit/events/` requires scope `audit:write`
    - `GET` audit endpoints require scope `audit:read`
    - `scope` claim must be a space-separated string


## Quick start (Docker)

1. Copy `.env.example` to `.env`.
2. Reset old volumes:
    - `docker compose -f docker-compose.dev.yml down -v`
    - `docker volume rm audit-service-dev-postgres-volume 2>/dev/null || true`
3. Start API + DB:
    - `docker compose -f docker-compose.dev.yml up --build`
4. Health check:
    - `curl http://localhost:5004/internal/v1/health`


## Extra commands

- `flask --app=audit_api init-db`
- `flask --app=audit_api reset-db`
