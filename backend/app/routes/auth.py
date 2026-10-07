from datetime import timedelta, timezone

from flask import jsonify, request
from flask_jwt_extended import create_access_token, create_refresh_token, decode_token, get_jwt, get_jwt_identity, jwt_required

from ..extensions import bcrypt, db, limiter, login_key
from ..models import Branch, TokenBlocklist, User, utcnow
from ..security import ApiError, jwt_role_claims, login_required
from . import api


FAILS_PER_DEVICE = "5 per 15 minutes"
MAX_FAILED_LOGINS = 20
LOCK_MINUTES = 15
_DUMMY_HASH = "$2b$12$i6oqK2EfnkNItiEPpNKIYezKKnd7y.u3/3v8P5igqYHSqsJlIq5h."


def _aware(dt):
    return dt.replace(tzinfo=timezone.utc) if dt and dt.tzinfo is None else dt


def _failed(resp):
    return resp.status_code == 401


def _tokens(user):
    extra = jwt_role_claims(user)
    return {
        "access_token": create_access_token(identity=str(user.id), additional_claims=extra),
        "refresh_token": create_refresh_token(identity=str(user.id), additional_claims=extra),
    }


@api.post("/auth/login")
@limiter.limit(FAILS_PER_DEVICE, key_func=login_key, deduct_when=_failed)
@limiter.limit("30 per minute; 300 per hour")
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
        raise ApiError(401, "Email or password is incorrect.")
    user.failed_logins = 0
    user.locked_until = None
    user.last_login_at = now
    db.session.commit()
    return jsonify(**_tokens(user), user=user.to_dict())


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
    jtis = {get_jwt()["jti"]}
    refresh_token = (request.get_json(silent=True) or {}).get("refresh_token")
    if refresh_token:
        try:
            other = decode_token(str(refresh_token))
            if other.get("sub") == get_jwt_identity():
                jtis.add(other["jti"])
        except Exception:
            pass
    for jti in jtis:
        if not TokenBlocklist.query.filter_by(jti=jti).first():
            db.session.add(TokenBlocklist(jti=jti))
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
    user.sign_out_everywhere()
    db.session.commit()
    return jsonify(ok=True, **_tokens(user))


@api.get("/branches")
@login_required()
def branches(user):
    return jsonify([{"id": b.id, "code": b.code, "name": b.name} for b in Branch.query.order_by(Branch.id)])
