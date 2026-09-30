from pathlib import Path

from flask import Flask, jsonify, send_from_directory
from flask_jwt_extended.exceptions import JWTExtendedException
from jwt.exceptions import PyJWTError
from werkzeug.exceptions import HTTPException

from .config import Config
from .extensions import bcrypt, cors, db, jwt, limiter, migrate
from .security import ApiError


def create_app(config=Config):
    app = Flask(__name__, static_folder=None)
    app.config.from_object(config)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    bcrypt.init_app(app)
    limiter.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})

    from . import models
    from .models import TokenBlocklist
    from .routes import api

    app.register_blueprint(api)

    @jwt.token_in_blocklist_loader
    def revoked(_header, payload):
        return db.session.query(TokenBlocklist.id).filter_by(jti=payload["jti"]).scalar() is not None

    @jwt.expired_token_loader
    def expired(_h, _p):
        return jsonify(message="Session expired — please sign in again."), 401

    @jwt.invalid_token_loader
    @jwt.unauthorized_loader
    def unauthorized(reason):
        return jsonify(message="Please sign in."), 401

    @jwt.revoked_token_loader
    def revoked_resp(_h, _p):
        return jsonify(message="You have been signed out."), 401

    @app.errorhandler(ApiError)
    def api_error(e):
        db.session.rollback()
        return e.response()

    @app.errorhandler(JWTExtendedException)
    @app.errorhandler(PyJWTError)
    def jwt_error(_e):
        return jsonify(message="Please sign in."), 401

    @app.errorhandler(HTTPException)
    def http_error(e):
        return jsonify(message=e.description if e.code != 404 else "Not found"), e.code

    @app.errorhandler(Exception)
    def unexpected(e):
        db.session.rollback()
        app.logger.exception(e)
        return jsonify(message="Something went wrong on the server."), 500

    @app.get("/api/health")
    def health():
        return {"ok": True}

    dist = app.config.get("FRONTEND_DIST")
    if dist:
        dist_path = (Path(app.root_path).parent / dist).resolve()
        if dist_path.exists():

            @app.get("/", defaults={"path": ""})
            @app.get("/<path:path>")
            def spa(path):
                target = dist_path / path
                if path and target.is_file():
                    return send_from_directory(dist_path, path)
                return send_from_directory(dist_path, "index.html")

    from .cli import register_cli

    register_cli(app)
    return app
