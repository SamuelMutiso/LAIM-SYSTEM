from flask import jsonify, request
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt, get_jwt_identity, jwt_required

from ..extensions import db, limiter
from ..models import Branch, TokenBlocklist, User, utcnow
from ..security import ApiError, jwt_role_claims, login_required
from . import api


@api.post("/auth/login")
@limiter.limit("10 per minute; 50 per hour")
def login():
    body = request.get_json(silent=True) or {}
    email = str(body.get("email", "")).strip().lower()
    user = User.query.filter(db.func.lower(User.email) == email).first()
    if not user or not user.active or not user.check_password(str(body.get("password", ""))):
        raise ApiError(401, "Email or password is incorrect.")
    user.last_login_at = utcnow()
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
