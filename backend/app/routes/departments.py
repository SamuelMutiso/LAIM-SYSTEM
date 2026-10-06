import secrets

from flask import jsonify

from ..extensions import db
from ..models import Department, DepartmentMember, DepartmentReport, Member, User
from ..schemas import DepartmentIn, DepartmentMemberIn, DepartmentReportIn, LoginIn, d
from ..security import ApiError, apply_scope, audit, ensure_can_read, login_required, require_write
from . import api
from .people import OFFICE, load

READERS = (*OFFICE, "dept_leader")


def _get(user, did):
    dep = db.get_or_404(Department, did)
    if user.role == "dept_leader":
        if user.department_id != dep.id:
            raise ApiError(403, "This is not your department.")
    else:
        ensure_can_read(user, dep.branch_id)
    return dep


def _can_manage(user, dep):
    if user.role == "secretary" and user.branch_id == dep.branch_id:
        return True
    return user.role == "dept_leader" and user.department_id == dep.id


def _person(m):
    return {"id": m.id, "name": m.full_name, "phone": m.phone} if m else None


def _check_member(dep_branch, member_id, field):
    if member_id is None:
        return None
    m = db.session.get(Member, member_id)
    if not m or m.branch_id != dep_branch:
        raise ApiError(422, "Choose a member from this branch.", field)
    return m


def department_out(dep):
    last = DepartmentReport.query.filter_by(department_id=dep.id).order_by(DepartmentReport.date.desc()).first()
    login = User.query.filter_by(department_id=dep.id, role="dept_leader", active=True).first()
    return {
        "id": dep.id,
        "branch_id": dep.branch_id,
        "name": dep.name,
        "description": dep.description or "",
        "active": dep.active,
        "leader": _person(dep.leader),
        "assistant": _person(dep.assistant),
        "leader_member_id": dep.leader_member_id,
        "assistant_member_id": dep.assistant_member_id,
        "members_count": DepartmentMember.query.filter_by(department_id=dep.id).count(),
        "reports_count": DepartmentReport.query.filter_by(department_id=dep.id).count(),
        "last_report_date": d(last.date) if last else None,
        "login_email": login.email if login else None,
    }


def report_out(r):
    return {
        "id": r.id,
        "department_id": r.department_id,
        "branch_id": r.branch_id,
        "date": d(r.date),
        "title": r.title,
        "details": r.details or "",
        "people_involved": r.people_involved,
        "submitted_by": r.submitted_by_name or "",
    }


@api.get("/departments")
@login_required(*READERS)
def list_departments(user):
    if user.role == "dept_leader":
        q = Department.query.filter(Department.id == user.department_id)
    else:
        q = apply_scope(Department.query, Department, user)
    return jsonify([department_out(x) for x in q.order_by(Department.branch_id, Department.name)])


@api.get("/departments/<int:did>")
@login_required(*READERS)
def get_department(user, did):
    return jsonify(department_out(_get(user, did)))


@api.post("/departments")
@login_required("secretary")
def create_department(user):
    require_write(user)
    data = load(DepartmentIn)
    name = data["name"].strip()
    if Department.query.filter(Department.branch_id == user.branch_id, db.func.lower(Department.name) == name.lower()).first():
        raise ApiError(409, "This branch already has a department with that name.", "name")
    _check_member(user.branch_id, data["leader_member_id"], "leader_member_id")
    _check_member(user.branch_id, data["assistant_member_id"], "assistant_member_id")
    dep = Department(branch_id=user.branch_id, name=name, description=data["description"], leader_member_id=data["leader_member_id"], assistant_member_id=data["assistant_member_id"], active=True)
    db.session.add(dep)
    db.session.flush()
    for mid in {data["leader_member_id"], data["assistant_member_id"]} - {None}:
        db.session.add(DepartmentMember(department_id=dep.id, member_id=mid, role="Leader" if mid == data["leader_member_id"] else "Assistant leader"))
    audit(user, "Created department", name)
    db.session.commit()
    return jsonify(department_out(dep)), 201


@api.put("/departments/<int:did>")
@login_required("secretary")
def update_department(user, did):
    dep = db.get_or_404(Department, did)
    require_write(user, dep.branch_id)
    data = load(DepartmentIn)
    name = data["name"].strip()
    clash = Department.query.filter(Department.branch_id == dep.branch_id, db.func.lower(Department.name) == name.lower(), Department.id != dep.id).first()
    if clash:
        raise ApiError(409, "This branch already has a department with that name.", "name")
    _check_member(dep.branch_id, data["leader_member_id"], "leader_member_id")
    _check_member(dep.branch_id, data["assistant_member_id"], "assistant_member_id")
    dep.name, dep.description, dep.active = name, data["description"], data["active"]
    dep.leader_member_id, dep.assistant_member_id = data["leader_member_id"], data["assistant_member_id"]
    for mid, role in ((data["leader_member_id"], "Leader"), (data["assistant_member_id"], "Assistant leader")):
        if mid and not DepartmentMember.query.filter_by(department_id=dep.id, member_id=mid).first():
            db.session.add(DepartmentMember(department_id=dep.id, member_id=mid, role=role))
    if not dep.active:
        for u in User.query.filter_by(department_id=dep.id, role="dept_leader"):
            u.active = False
    audit(user, "Updated department", name)
    db.session.commit()
    return jsonify(department_out(dep))


@api.get("/departments/<int:did>/members")
@login_required(*READERS)
def department_members(user, did):
    dep = _get(user, did)
    rows = DepartmentMember.query.filter_by(department_id=dep.id).all()
    rows.sort(key=lambda r: (r.role not in ("Leader", "Assistant leader"), r.role != "Leader", r.member.full_name))
    return jsonify([{"id": r.id, "member_id": r.member_id, "name": r.member.full_name, "phone": r.member.phone, "role": r.role or ""} for r in rows])


@api.get("/departments/<int:did>/candidates")
@login_required("secretary", "dept_leader")
def department_candidates(user, did):
    dep = _get(user, did)
    if not _can_manage(user, dep):
        raise ApiError(403, "You can't change this department.")
    taken = {r.member_id for r in DepartmentMember.query.filter_by(department_id=dep.id)}
    ms = Member.query.filter_by(branch_id=dep.branch_id, membership_status="Active").order_by(Member.first_name, Member.last_name).all()
    return jsonify([{"id": m.id, "name": m.full_name} for m in ms if m.id not in taken])


@api.post("/departments/<int:did>/members")
@login_required("secretary", "dept_leader")
def add_department_member(user, did):
    dep = _get(user, did)
    if not _can_manage(user, dep):
        raise ApiError(403, "You can't change this department.")
    data = load(DepartmentMemberIn)
    m = _check_member(dep.branch_id, data["member_id"], "member_id")
    if DepartmentMember.query.filter_by(department_id=dep.id, member_id=m.id).first():
        raise ApiError(409, f"{m.full_name} is already in this department.", "member_id")
    db.session.add(DepartmentMember(department_id=dep.id, member_id=m.id, role=data["role"].strip()))
    audit(user, "Added to department", f"{m.full_name} → {dep.name}")
    db.session.commit()
    return jsonify({"ok": True}), 201


@api.delete("/departments/<int:did>/members/<int:dmid>")
@login_required("secretary", "dept_leader")
def remove_department_member(user, did, dmid):
    dep = _get(user, did)
    if not _can_manage(user, dep):
        raise ApiError(403, "You can't change this department.")
    row = DepartmentMember.query.filter_by(id=dmid, department_id=dep.id).first_or_404()
    if row.member_id in (dep.leader_member_id, dep.assistant_member_id):
        raise ApiError(422, "Change the department's leader or assistant first.")
    audit(user, "Removed from department", f"{row.member.full_name} ← {dep.name}")
    db.session.delete(row)
    db.session.commit()
    return "", 204


@api.get("/departments/<int:did>/reports")
@login_required(*READERS)
def department_reports(user, did):
    dep = _get(user, did)
    rows = DepartmentReport.query.filter_by(department_id=dep.id).order_by(DepartmentReport.date.desc(), DepartmentReport.id.desc()).limit(300)
    return jsonify([report_out(r) for r in rows])


@api.post("/departments/<int:did>/reports")
@login_required("secretary", "dept_leader")
def add_department_report(user, did):
    dep = _get(user, did)
    if not _can_manage(user, dep):
        raise ApiError(403, "You can't add reports for this department.")
    if not dep.active:
        raise ApiError(422, "This department is no longer active.")
    data = load(DepartmentReportIn)
    r = DepartmentReport(department_id=dep.id, branch_id=dep.branch_id, submitted_by_id=user.id, submitted_by_name=user.name, **data)
    db.session.add(r)
    audit(user, "Department report", f"{dep.name} · {data['title']}")
    db.session.commit()
    return jsonify(report_out(r)), 201


@api.post("/departments/<int:did>/login")
@login_required("secretary")
def department_login(user, did):
    dep = db.get_or_404(Department, did)
    require_write(user, dep.branch_id)
    if not dep.leader:
        raise ApiError(422, "Choose the department leader first.")
    email = load(LoginIn)["email"].strip().lower()
    existing = User.query.filter(db.func.lower(User.email) == email).first()
    if existing and not (existing.role == "dept_leader" and existing.department_id == dep.id):
        raise ApiError(409, "That email already has a different login.", "email")
    for u in User.query.filter(User.department_id == dep.id, User.role == "dept_leader", db.func.lower(User.email) != email):
        u.active = False
    password = secrets.token_urlsafe(9)
    u = existing or User(email=email, role="dept_leader", branch_id=dep.branch_id, department_id=dep.id)
    u.name = dep.leader.full_name
    u.active = True
    u.failed_logins = 0
    u.locked_until = None
    u.set_password(password)
    if not existing:
        db.session.add(u)
    audit(user, "Issued department login", f"{dep.name} · {email}")
    db.session.commit()
    return jsonify({"email": email, "password": password, "name": u.name})
