from datetime import timedelta, timezone

from flask import jsonify, request
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt, get_jwt_identity, jwt_required

from ..extensions import bcrypt, db, limiter
from ..models import Branch, TokenBlocklist, User, utcnow
from ..security import ApiError, jwt_role_claims, login_required
from . import api


MAX_FAILED_LOGINS = 5
LOCK_MINUTES = 15
_DUMMY_HASH = "$2b$12$i6oqK2EfnkNItiEPpNKIYezKKnd7y.u3/3v8P5igqYHSqsJlIq5h."


def _aware(dt):
    return dt.replace(tzinfo=timezone.utc) if dt and dt.tzinfo is None else dt


@api.post("/auth/login")
@limiter.limit("10 per minute; 50 per hour")
def login():
    body = request.get_json(silent=True) or {}
    email = str(body.get("email", "")).strip().lower()
    password = str(body.get("password", ""))
    user = User.query.filter(db.func.lower(User.email) == email).first()
    now = utcnow()
    if not user or not user.active:
        bcrypt.check_password_hash(_DUMMY_HASH, password)
        raise ApiError(401, "Email or password is incorrect.")
    locked = _aware(user.locked_until)
    if locked and locked > now:
        minutes = max(1, int((locked - now).total_seconds() // 60) + 1)
        raise ApiError(429, f"Too many wrong passwords. Try again in {minutes} minute{'s' if minutes > 1 else ''}, or ask the office to reset it.")
    if not user.check_password(password):
        user.failed_logins = (user.failed_logins or 0) + 1
        if user.failed_logins >= MAX_FAILED_LOGINS:
            user.failed_logins = 0
            user.locked_until = now + timedelta(minutes=LOCK_MINUTES)
            db.session.commit()
            raise ApiError(429, f"Too many wrong passwords. This account is locked for {LOCK_MINUTES} minutes.")
        left = MAX_FAILED_LOGINS - user.failed_logins
        db.session.commit()
        raise ApiError(401, f"Email or password is incorrect. {left} attempt{'s' if left > 1 else ''} left before the account is locked.")
    user.failed_logins = 0
    user.locked_until = None
    user.last_login_at = now
    db.session.commit()
    extra = jwt_role_claims(user)
    return jsonify(
        access_token=create_access_token(identity=str(user.id), additional_claims=extra),
        refresh_token=create_refresh_token(identity=str(user.id), additional_claims=extra),
        user=user.to_dict(),
    )


@api.post("/auth/refresh")
@jwt_required(refresh=True)
def refresh():
    user = db.session.get(User, int(get_jwt_identity()))
    if not user or not user.active:
        raise ApiError(401, "Your account is no longer active.")
    return jsonify(access_token=create_access_token(identity=str(user.id), additional_claims=jwt_role_claims(user)))


@api.post("/auth/logout")
@jwt_required(verify_type=False)
def logout():
    db.session.add(TokenBlocklist(jti=get_jwt()["jti"]))
    db.session.commit()
    return jsonify(ok=True)


@api.get("/auth/me")
@login_required()
def me(user):
    return jsonify(user.to_dict())


@api.post("/auth/password")
@login_required()
@limiter.limit("5 per minute")
def change_password(user):
    body = request.get_json(silent=True) or {}
    if not user.check_password(str(body.get("current_password", ""))):
        raise ApiError(422, "Current password is wrong.", "current_password")
    new = str(body.get("new_password", ""))
    if len(new) < 10:
        raise ApiError(422, "Use at least 10 characters.", "new_password")
    user.set_password(new)
    db.session.commit()
    return jsonify(ok=True)


@api.get("/branches")
@login_required()
def branches(user):
    return jsonify([{"id": b.id, "code": b.code, "name": b.name} for b in Branch.query.order_by(Branch.id)])
