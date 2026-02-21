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
- Service token claims (used for `POST`): `exp`, `sub`, `iss`, `aud`
    - `exp`: token expiration time
    - `sub`: token subject (service identity, e.g. `hospital-api`)
    - `iss`: token issuer (who created/signed the token)
    - `aud`: token audience (intended target service, here audit-service)
- Admin user token claims (used for `GET`): `exp` and `role=ADMIN`
- Endpoint auth rules:
    - `POST /internal/v1/audit/events/` is service-to-service only
    - `GET` audit endpoints require admin user token with role `ADMIN`


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
