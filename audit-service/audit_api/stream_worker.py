import json
import logging
import os
import threading
import time

import redis

logger = logging.getLogger(__name__)

STREAM_KEY = "audit_events"
GROUP_NAME = "audit_service_group"
CONSUMER_NAME = f"consumer_{os.getpid()}"
BLOCK_MS = 5000


def start_worker(app):
    thread = threading.Thread(
        target=_run_consumer,
        args=(app,),
        daemon=True,
        name="redis-stream-worker",
    )
    thread.start()
    logger.info("Redis stream worker started (thread=%s)", thread.name)
    return thread


def _run_consumer(app):
    redis_url = app.config.get("REDIS_URL", "redis://localhost:6379")

    while True:
        try:
            r = redis.from_url(redis_url, decode_responses=True)
            _ensure_consumer_group(r)
            logger.info("Redis stream consumer connected, reading from '%s'", STREAM_KEY)
            _read_loop(r, app)
        except redis.ConnectionError as exc:
            logger.error("Redis connection lost: %s — retrying in 5s", exc)
            time.sleep(5)
        except Exception as exc:
            logger.exception("Unexpected error in stream worker: %s — retrying in 5s", exc)
            time.sleep(5)


def _ensure_consumer_group(r):
    try:
        r.xgroup_create(STREAM_KEY, GROUP_NAME, id="0", mkstream=True)
        logger.info("Created consumer group '%s' on stream '%s'", GROUP_NAME, STREAM_KEY)
    except redis.ResponseError as exc:
        if "BUSYGROUP" in str(exc):
            logger.debug("Consumer group '%s' already exists", GROUP_NAME)
        else:
            raise


def _read_loop(r, app):
    from .models import AuditEvent
    from . import db

    while True:
        results = r.xreadgroup(
            GROUP_NAME,
            CONSUMER_NAME,
            {STREAM_KEY: ">"},
            count=10,
            block=BLOCK_MS,
        )

        if not results:
            continue

        for stream_name, messages in results:
            for msg_id, fields in messages:
                try:
                    _process_message(app, db, AuditEvent, msg_id, fields)
                    r.xack(STREAM_KEY, GROUP_NAME, msg_id)
                except Exception as exc:
                    logger.error(
                        "Failed to process message %s: %s", msg_id, exc,
                        exc_info=True,
                    )


def _process_message(app, db, AuditEvent, msg_id, fields):
    raw = fields.get("data")
    if not raw:
        logger.warning("Message %s has no 'data' field, skipping", msg_id)
        return

    payload = json.loads(raw)

    with app.app_context():
        event = AuditEvent()
        event.deserialize(payload)
        db.session.add(event)
        db.session.commit()

    logger.debug("Persisted audit event from message %s", msg_id)
