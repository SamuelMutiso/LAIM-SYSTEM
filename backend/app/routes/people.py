from datetime import date

from flask import jsonify, request
from sqlalchemy import or_

from ..constants import HQ_BRANCH_ID
from ..extensions import db
from ..models import CellReport, HomeChurch, Leader, Member, Pledge, Tithe, WorshipTeamMember
from ..schemas import CellReportIn, LeaderIn, MemberIn, cell_report_out, leader_out, member_out, pledge_out, tithe_out
from ..security import ApiError, apply_scope, audit, ensure_can_read, login_required, require_write, scope_branch
from . import api

OFFICE = ("bishop", "pastor", "secretary")


def load(schema, data=None):
    from marshmallow import ValidationError

    try:
        return schema().load(data if data is not None else (request.get_json(silent=True) or {}))
    except ValidationError as e:
        field, msgs = next(iter(e.messages.items()))
        msg = msgs[0] if isinstance(msgs, list) else str(msgs)
        if field == "_schema":
            field = None
        raise ApiError(422, msg if isinstance(msg, str) else "Please check the form.", field)


@api.get("/members")
@login_required(*OFFICE)
def list_members(user):
    q = apply_scope(Member.query, Member, user)
    a = request.args
    if a.get("gender"):
        q = q.filter(Member.gender == a["gender"])
    if a.get("status"):
        q = q.filter(Member.membership_status == a["status"])
    if a.get("home_church_id"):
        q = q.filter(Member.home_church_id == int(a["home_church_id"]))
    if a.get("q"):
        s = f"%{a['q'].strip()}%"
        q = q.filter(or_(Member.first_name.ilike(s), Member.last_name.ilike(s), Member.phone.ilike(s), Member.email.ilike(s)))
    rows = [member_out(m) for m in q.order_by(Member.first_name, Member.last_name).all()]
    if a.get("group"):
        rows = [r for r in rows if r["group"] == a["group"]]
    return jsonify(rows)


@api.get("/members/<int:mid>")
@login_required(*OFFICE)
def get_member(user, mid):
    m = db.get_or_404(Member, mid)
    ensure_can_read(user, m.branch_id)
    tithes = Tithe.query.filter_by(member_id=m.id).order_by(Tithe.date.desc()).all()
    pledges = Pledge.query.filter_by(member_id=m.id).all()
    return jsonify({**member_out(m), "tithes": [tithe_out(t) for t in tithes], "tithe_total": float(sum((t.amount for t in tithes), start=0)), "pledges": [pledge_out(p) for p in pledges]})


def _check_cell(user, cell_id):
    if cell_id:
        c = db.session.get(HomeChurch, cell_id)
        if not c or c.branch_id != user.branch_id:
            raise ApiError(422, "Choose a home church in your branch.", "home_church_id")


@api.post("/members")
@login_required("secretary")
def create_member(user):
    require_write(user)
    data = load(MemberIn)
    _check_cell(user, data.get("home_church_id"))
    data["joined_on"] = data.get("joined_on") or date.today()
    data["email"] = data.get("email") or ""
    m = Member(branch_id=user.branch_id, **data)
    db.session.add(m)
    audit(user, "Added member", m.full_name)
    db.session.commit()
    return jsonify(member_out(m)), 201


@api.put("/members/<int:mid>")
@login_required("secretary")
def update_member(user, mid):
    m = db.get_or_404(Member, mid)
    require_write(user, m.branch_id)
    data = load(MemberIn)
    _check_cell(user, data.get("home_church_id"))
    data["email"] = data.get("email") or ""
    for k, v in data.items():
        setattr(m, k, v)
    audit(user, "Updated member", m.full_name)
    db.session.commit()
    return jsonify(member_out(m))


def _cells_for(user):
    q = HomeChurch.query.filter_by(active=True)
    if user.role == "cell_leader":
        return q.filter(HomeChurch.id == user.cell_id)
    b = scope_branch(user)
    return q if b is None else q.filter(HomeChurch.branch_id == b)


@api.get("/cells")
@login_required()
def list_cells(user):
    out = []
    for c in _cells_for(user).order_by(HomeChurch.branch_id, HomeChurch.name):
        reps = CellReport.query.filter_by(cell_id=c.id).order_by(CellReport.date.desc()).limit(4).all()
        leader = db.session.get(Member, c.leader_member_id) if c.leader_member_id else None
        asst = db.session.get(Member, c.assistant_member_id) if c.assistant_member_id else None
        out.append(
            {
                "id": c.id,
                "branch_id": c.branch_id,
                "name": c.name,
                "area": c.area,
                "venue": c.venue,
                "meeting_time": c.meeting_time,
                "leader_member_id": c.leader_member_id,
                "assistant_member_id": c.assistant_member_id,
                "leader": leader.full_name if leader else "—",
                "assistant": asst.full_name if asst else "—",
                "members_count": Member.query.filter_by(home_church_id=c.id).count(),
                "last_report_date": reps[0].date.isoformat() if reps else None,
                "avg_attendance": round(sum(len(r.adults or []) + len(r.children or []) for r in reps) / len(reps)) if reps else 0,
            }
        )
    return jsonify(out)


@api.post("/cells")
@login_required("secretary")
def create_cell(user):
    body = request.get_json(silent=True) or {}
    name, area = (body.get("name") or "").strip(), (body.get("area") or "").strip()
    if not name:
        raise ApiError(422, "Give the home church a name.", "name")
    if not area:
        raise ApiError(422, "Enter the area where it meets.", "area")
    if HomeChurch.query.filter(HomeChurch.branch_id == user.branch_id, db.func.lower(HomeChurch.name) == name.lower()).first():
        raise ApiError(409, "Your branch already has a home church with that name.", "name")
    people = {}
    for key in ("leader_member_id", "assistant_member_id"):
        mid = body.get(key) or None
        if mid:
            m = db.session.get(Member, int(mid))
            if not m or m.branch_id != user.branch_id:
                raise ApiError(422, "Choose someone from your branch.", key)
        people[key] = int(mid) if mid else None
    c = HomeChurch(branch_id=user.branch_id, name=name, area=area, venue=(body.get("venue") or "").strip(), meeting_time=(body.get("meeting_time") or "6:00 PM").strip(), **people)
    db.session.add(c)
    audit(user, "Added home church", name)
    db.session.commit()
    return jsonify({"id": c.id, "name": c.name}), 201


@api.put("/cells/<int:cid>")
@login_required("secretary")
def update_cell(user, cid):
    c = db.get_or_404(HomeChurch, cid)
    require_write(user, c.branch_id)
    body = request.get_json(silent=True) or {}
    name, area = (body.get("name") or "").strip(), (body.get("area") or "").strip()
    if not name:
        raise ApiError(422, "Give the home church a name.", "name")
    if not area:
        raise ApiError(422, "Enter the area where it meets.", "area")
    clash = HomeChurch.query.filter(HomeChurch.branch_id == c.branch_id, HomeChurch.id != c.id, db.func.lower(HomeChurch.name) == name.lower()).first()
    if clash:
        raise ApiError(409, "Your branch already has a home church with that name.", "name")
    for key in ("leader_member_id", "assistant_member_id"):
        mid = body.get(key) or None
        if mid:
            m = db.session.get(Member, int(mid))
            if not m or m.branch_id != c.branch_id:
                raise ApiError(422, "Choose someone from your branch.", key)
        setattr(c, key, int(mid) if mid else None)
    c.name, c.area = name, area
    c.venue = (body.get("venue") or "").strip()
    c.meeting_time = (body.get("meeting_time") or c.meeting_time or "6:00 PM").strip()
    audit(user, "Updated home church", name)
    db.session.commit()
    return jsonify({"id": c.id, "name": c.name})


@api.get("/cells/<int:cid>/roster")
@login_required()
def cell_roster(user, cid):
    c = db.get_or_404(HomeChurch, cid)
    if user.role == "cell_leader" and user.cell_id != c.id:
        raise ApiError(403, "Not your home church.")
    if user.role in ("pastor", "secretary"):
        ensure_can_read(user, c.branch_id)
    ms = Member.query.filter_by(home_church_id=c.id, membership_status="Active").order_by(Member.first_name).all()
    return jsonify([member_out(m) for m in ms])


@api.get("/cell-reports")
@login_required()
def list_cell_reports(user):
    q = CellReport.query
    if user.role == "cell_leader":
        q = q.filter(CellReport.cell_id == user.cell_id)
    else:
        q = apply_scope(q, CellReport, user)
    a = request.args
    if a.get("cell_id"):
        q = q.filter(CellReport.cell_id == int(a["cell_id"]))
    if a.get("from"):
        q = q.filter(CellReport.date >= a["from"])
    if a.get("to"):
        q = q.filter(CellReport.date <= a["to"])
    return jsonify([cell_report_out(r) for r in q.order_by(CellReport.date.desc(), CellReport.cell_id).limit(500)])


@api.post("/cell-reports")
@login_required("cell_leader", "secretary")
def submit_cell_report(user):
    data = load(CellReportIn)
    cell_id = user.cell_id if user.role == "cell_leader" else data.get("cell_id")
    c = db.session.get(HomeChurch, cell_id) if cell_id else None
    if not c:
        raise ApiError(422, "Choose the home church.", "cell_id")
    if user.role == "secretary" and c.branch_id != user.branch_id:
        raise ApiError(403, "That home church is in another branch.")
    if CellReport.query.filter_by(cell_id=c.id, date=data["date"]).first():
        raise ApiError(409, "A report for this home church and date already exists.", "date")
    data.pop("cell_id", None)
    data["adults"] = [n.strip() for n in data["adults"] if n.strip()]
    data["children"] = [n.strip() for n in data["children"] if n.strip()]
    r = CellReport(cell_id=c.id, branch_id=c.branch_id, submitted_by_id=user.id, **data)
    db.session.add(r)
    audit(user, "Submitted Home Church report", f"{c.name} · {data['date'].isoformat()}")
    db.session.commit()
    return jsonify(cell_report_out(r)), 201


@api.get("/leaders")
@login_required(*OFFICE)
def list_leaders(user):
    q = Leader.query
    if user.role != "bishop":
        q = q.filter(or_(Leader.branch_id == user.branch_id, Leader.role == "Bishop"))
    return jsonify([leader_out(l) for l in q.order_by(Leader.active.desc(), Leader.id)])


@api.post("/leaders")
@login_required("secretary")
def assign_leader(user):
    require_write(user)
    data = load(LeaderIn)
    m = db.session.get(Member, data["member_id"])
    if not m:
        raise ApiError(422, "Pick the member.", "member_id")
    for old in Leader.query.filter_by(role=data["role"], branch_id=user.branch_id, active=True):
        old.active = False
        old.until = date.today()
    l = Leader(
        role=data["role"],
        member_id=m.id,
        branch_id=user.branch_id,
        scope="church" if user.branch_id == HQ_BRANCH_ID else "branch",
        group=data.get("group") or "Leadership",
        since=data.get("since") or date.today(),
    )
    db.session.add(l)
    audit(user, "Updated leadership", f"{l.role}: {m.full_name}")
    db.session.commit()
    return jsonify(leader_out(l)), 201


@api.get("/worship-team")
@login_required(*OFFICE)
def worship_team(user):
    q = WorshipTeamMember.query.filter_by(active=True)
    if user.role != "bishop":
        q = q.filter(WorshipTeamMember.branch_id == user.branch_id)
    return jsonify([{"id": w.id, "member_id": w.member_id, "name": w.member.full_name, "phone": w.member.phone, "role": w.role, "part": w.part, "branch_id": w.branch_id} for w in q])
