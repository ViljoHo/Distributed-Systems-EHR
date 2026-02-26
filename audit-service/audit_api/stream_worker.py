import json
import threading
import time
import traceback

import redis
from jsonschema import ValidationError, validate
from sqlalchemy.exc import SQLAlchemyError

from audit_api import db
from audit_api.models import AuditEvent
from audit_api.utils import FORMAT_CHECKER, load_json_schema

STREAM_KEY = "audit_events"
GROUP_NAME = "audit_service_group"
CONSUMER_NAME = "audit_service_consumer"
SCHEMA = load_json_schema("audit_event.json")


def start_worker(app):
    thread = threading.Thread(
        target=_run_consumer,
        args=(app,),
        daemon=True,
        name="redis-stream-worker",
    )
    thread.start()
    return thread


def _run_consumer(app):
    redis_url = app.config.get("REDIS_URL", "redis://localhost:6379")

    while True:
        try:
            redis_client = redis.from_url(redis_url, decode_responses=True)
            _ensure_consumer_group_exists(redis_client)
            _process_messages(redis_client, app)
        except redis.ConnectionError as err:
            print(f"Redis connection error: {err} - retrying in 5s")
            time.sleep(5)
        except Exception as err:
            print(f"Unexpected error: {err} - retrying in 5s")
            traceback.print_exc()
            time.sleep(5)


def _ensure_consumer_group_exists(redis_client):
    try:
        redis_client.xgroup_create(STREAM_KEY, GROUP_NAME, id="0", mkstream=True)
    except redis.ResponseError as err:
        if "BUSYGROUP" in str(err):
            return  # group already created, continue
        raise


def _process_messages(redis_client, app):
    while True:
        results = redis_client.xreadgroup(
            GROUP_NAME,
            CONSUMER_NAME,
            {STREAM_KEY: ">"},
            count=10,
            block=5000,
        )
        if not results:
            continue

        _, messages = results[0]
        for msg_id, fields in messages:
            try:
                _process_message(app, fields)
                redis_client.xack(STREAM_KEY, GROUP_NAME, msg_id)
            except ValueError as err:
                print(f"Invalid message {msg_id}: {err}")
                traceback.print_exc()
                # Invalid payload -> will never succeed -> ack to avoid stuck pending messages
                redis_client.xack(STREAM_KEY, GROUP_NAME, msg_id)
            except Exception as err:
                print(f"Failed to process message {msg_id}: {err}")
                traceback.print_exc()


def _process_message(app, fields):
    raw = fields.get("data")
    if raw is None:
        raise ValueError("Missing 'data' field")

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as err:
        raise ValueError("Invalid JSON payload") from err

    try:
        validate(payload, SCHEMA, format_checker=FORMAT_CHECKER)
    except ValidationError as err:
        raise ValueError(str(err)) from err

    with app.app_context():
        event = AuditEvent()
        event.deserialize(json_dict=payload)
        db.session.add(event)
        try:
            db.session.commit()
        except SQLAlchemyError as err:
            db.session.rollback()
            raise RuntimeError(f"Database error: {err}") from err
