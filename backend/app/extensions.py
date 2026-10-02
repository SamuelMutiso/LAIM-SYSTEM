from flask import request
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from flask_jwt_extended import JWTManager, get_jwt_identity, verify_jwt_in_request
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
bcrypt = Bcrypt()
cors = CORS()


def person_or_address():
    try:
        verify_jwt_in_request(optional=True)
        who = get_jwt_identity()
    except Exception:
        who = None
    return f"user:{who}" if who else get_remote_address()


def login_key():
    body = request.get_json(silent=True) or {}
    return f"{get_remote_address()}|{str(body.get('email', '')).strip().lower()}"


limiter = Limiter(key_func=person_or_address, default_limits=["300 per minute"])
