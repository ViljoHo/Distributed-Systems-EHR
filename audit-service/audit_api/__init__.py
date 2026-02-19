import os

from dotenv import load_dotenv
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from werkzeug.exceptions import HTTPException


load_dotenv()

db = SQLAlchemy()

def create_app(test_config=None):
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        PORT=int(os.getenv("PORT", "5004")),
        SECRET_KEY=os.getenv("SECRET_KEY", "dev"),
        SQLALCHEMY_DATABASE_URI=os.getenv(
            "DATABASE_URL",
            "sqlite:///" + os.path.join(app.instance_path, "development.db"),
        ),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        AUTH_JWT_SECRET=os.getenv("AUTH_JWT_SECRET", ""),
        AUTH_JWT_EXPECTED_ISSUER=os.getenv("AUTH_JWT_EXPECTED_ISSUER", ""),
        AUTH_JWT_EXPECTED_AUDIENCE=os.getenv("AUTH_JWT_EXPECTED_AUDIENCE", ""),
    )

    if test_config is not None:
        app.config.from_mapping(test_config)

    _validate_auth_config(app.config)

    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    db.init_app(app)

    from . import api
    from . import models
    from .utils import AuditEventConverter

    app.url_map.converters["audit_event"] = AuditEventConverter
    app.register_blueprint(api.api_bp)
    app.cli.add_command(models.init_db_command)
    app.cli.add_command(models.reset_db_command)

    # Convert HTTP error responses to JSON
    @app.errorhandler(HTTPException)
    def handle_http_exception(error):
        return {"error": error.description}, error.code

    return app


def _validate_auth_config(config):
    if not str(config.get("AUTH_JWT_SECRET", "")).strip():
        raise RuntimeError("AUTH_JWT_SECRET is required")
    if not str(config.get("AUTH_JWT_EXPECTED_ISSUER", "")).strip():
        raise RuntimeError("AUTH_JWT_EXPECTED_ISSUER is required")
    if not str(config.get("AUTH_JWT_EXPECTED_AUDIENCE", "")).strip():
        raise RuntimeError("AUTH_JWT_EXPECTED_AUDIENCE is required")
