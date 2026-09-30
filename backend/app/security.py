from functools import wraps

from flask import jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request
from sqlalchemy.exc import IntegrityError

from .extensions import db
from .models import AuditLog, PaymentReference, User


class ApiError(Exception):
    def __init__(self, status, message, field=None):
        super().__init__(message)
        self.status = status
        self.message = message
        self.field = field

    def response(self):
        body = {"message": self.message}
        if self.field:
            body["field"] = self.field
        return jsonify(body), self.status


def current_user() -> User:
    user = db.session.get(User, int(get_jwt_identity()))
    if not user or not user.active:
        raise ApiError(401, "Your account is no longer active.")
    return user


def login_required(*roles):

    def deco(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user = current_user()
            if roles and user.role not in roles:
                raise ApiError(403, "You don't have access to this.")
            return fn(user, *args, **kwargs)

        return wrapper

    return deco


def scope_branch(user):
    if user.role == "bishop":
        b = request.args.get("branch_id", type=int)
        return b or None
    return user.branch_id


def apply_scope(query, model, user):
    b = scope_branch(user)
    return query if b is None else query.filter(model.branch_id == b)


def ensure_can_read(user, branch_id):
    if user.role != "bishop" and branch_id != user.branch_id:
        raise ApiError(403, "This record belongs to another branch.")


def require_write(user, branch_id=None):
    if user.role != "secretary":
        raise ApiError(403, "Only the branch secretary can enter or edit records.")
    if branch_id is not None and branch_id != user.branch_id:
        raise ApiError(403, "You can only enter records for your own branch.")


def claim_reference(method, reference, source):
    if method == "cash" or not reference:
        return
    if db.session.get(PaymentReference, reference):
        raise ApiError(409, f"The reference {reference} has already been recorded.", "reference")
    db.session.add(PaymentReference(reference=reference, source=source))
    try:
        db.session.flush()
    except IntegrityError:
        db.session.rollback()
        raise ApiError(409, f"The reference {reference} has already been recorded.", "reference")


def release_reference(reference):
    if reference:
        ref = db.session.get(PaymentReference, reference)
        if ref:
            db.session.delete(ref)


def audit(user, action, target=""):
    db.session.add(AuditLog(user_id=user.id, user_name=user.name, branch_id=user.branch_id, action=action, target=target[:300]))


def jwt_role_claims(user):
    return {"role": user.role, "branch_id": user.branch_id, "cell_id": user.cell_id}


def claims():
    return get_jwt()
