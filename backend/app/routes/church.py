from datetime import date, timedelta
from decimal import Decimal

from flask import jsonify, request

from ..extensions import db
from ..models import AuditLog, Branch, CellReport, FundContribution, HomeChurch, InventoryItem, Member, Offering, Pledge, StockTake, Tithe
from ..schemas import InventoryIn, StockTakeIn, d, inventory_out, money
from ..security import ApiError, apply_scope, audit, login_required, require_write, scope_branch
from . import api
from .giving import fund_target
from .people import OFFICE, load


@api.get("/inventory")
@login_required(*OFFICE)
def list_inventory(user):
    q = apply_scope(InventoryItem.query, InventoryItem, user)
    if request.args.get("category"):
        q = q.filter(InventoryItem.category == request.args["category"])
    return jsonify([inventory_out(i) for i in q.order_by(InventoryItem.branch_id, InventoryItem.category, InventoryItem.name)])


def _custodian_ok(user, member_id):
    if member_id:
        m = db.session.get(Member, member_id)
        if not m or m.branch_id != user.branch_id:
            raise ApiError(422, "Choose someone from your branch.", "custodian_member_id")


@api.post("/inventory")
@login_required("secretary")
def create_item(user):
    require_write(user)
    data = load(InventoryIn)
    _custodian_ok(user, data.get("custodian_member_id"))
    it = InventoryItem(branch_id=user.branch_id, last_checked=date.today(), **data)
    db.session.add(it)
    audit(user, "Added inventory item", f"{it.name} × {it.quantity}")
    db.session.commit()
    return jsonify(inventory_out(it)), 201


@api.put("/inventory/<int:iid>")
@login_required("secretary")
def update_item(user, iid):
    it = db.get_or_404(InventoryItem, iid)
    require_write(user, it.branch_id)
    data = load(InventoryIn)
    _custodian_ok(user, data.get("custodian_member_id"))
    changes = []
    if data["quantity"] != it.quantity:
        changes.append(f"qty {it.quantity}→{data['quantity']}")
    for k, v in data.items():
        setattr(it, k, v)
    audit(user, "Updated inventory item", f"{it.name} {' '.join(changes)}".strip())
    db.session.commit()
    return jsonify(inventory_out(it))


@api.get("/inventory/<int:iid>/history")
@login_required(*OFFICE)
def item_history(user, iid):
    it = db.get_or_404(InventoryItem, iid)
    if user.role != "bishop" and it.branch_id != user.branch_id:
        raise ApiError(403, "Another branch's item.")
    rows = StockTake.query.filter_by(item_id=iid).order_by(StockTake.date.desc(), StockTake.id.desc())
    return jsonify([{"id": s.id, "date": d(s.date), "counted": s.counted, "expected": s.expected, "condition": s.condition, "checked_by": s.checked_by, "note": s.note} for s in rows])


@api.post("/inventory/<int:iid>/stock-take")
@login_required("secretary")
def stock_take(user, iid):
    it = db.get_or_404(InventoryItem, iid)
    require_write(user, it.branch_id)
    data = load(StockTakeIn)
    condition = "Missing" if data["counted"] == 0 else data["condition"]
    db.session.add(StockTake(item_id=it.id, date=date.today(), counted=data["counted"], expected=it.quantity, condition=condition, checked_by=user.name, note=data["note"]))
    it.last_checked = date.today()
    it.condition = condition
    audit(user, "Stock-take", f"{it.name}: counted {data['counted']} of {it.quantity}")
    db.session.commit()
    return jsonify(inventory_out(it))


@api.get("/audit")
@login_required("bishop")
def audit_log(user):
    rows = AuditLog.query.order_by(AuditLog.at.desc()).limit(500)
    return jsonify([{"id": a.id, "at": a.at.isoformat(), "user": a.user_name, "action": a.action, "target": a.target} for a in rows])


def _month_bounds(day):
    start = day.replace(day=1)
    nxt = (start + timedelta(days=32)).replace(day=1)
    return start, nxt - timedelta(days=1)


@api.get("/dashboard")
@login_required(*OFFICE)
def dashboard(user):
    today = date.today()
    b = scope_branch(user)
    members = apply_scope(Member.query, Member, user).all()
    active = [m for m in members if m.membership_status == "Active"]
    groups = {}
    for m in active:
        groups[m.group] = groups.get(m.group, 0) + 1

    ms, me = _month_bounds(today)
    ps, pe = _month_bounds(ms - timedelta(days=1))

    def tsum(a, z, branch=None):
        q = apply_scope(Tithe.query, Tithe, user).filter(Tithe.date.between(a, z))
        if branch:
            q = q.filter(Tithe.branch_id == branch)
        return money(sum((t.amount for t in q), start=Decimal(0)))

    def osum(a, z):
        q = apply_scope(Offering.query, Offering, user).filter(Offering.date.between(a, z))
        return money(sum((o.total for o in q), start=Decimal(0)))

    trend = []
    for i in range(today.month - 1, -1, -1):
        mstart = date(today.year, today.month - i, 1)
        a, z = _month_bounds(mstart)
        trend.append({"month": mstart.strftime("%Y-%m"), "tithe": tsum(a, z), "offering": osum(a, z)})

    pledges = apply_scope(Pledge.query, Pledge, user).all()
    gifts = apply_scope(FundContribution.query, FundContribution, user).all()
    reports = apply_scope(CellReport.query, CellReport, user)
    last_thu = reports.with_entities(db.func.max(CellReport.date)).scalar()
    week = reports.filter(CellReport.date == last_thu).all() if last_thu else []
    cells = HomeChurch.query.filter_by(active=True)
    if b:
        cells = cells.filter(HomeChurch.branch_id == b)
    cells = cells.all()

    def next_birthday(m):
        try:
            bd = m.dob.replace(year=today.year)
        except ValueError:
            bd = date(today.year, 3, 1)
        return bd

    birthdays = [
        {"id": m.id, "name": m.full_name, "dob": d(m.dob), "branch_id": m.branch_id, "group": m.group}
        for m in active
        if 0 <= (next_birthday(m) - today).days <= 7
    ]
    branches = Branch.query.order_by(Branch.id).all()
    return jsonify(
        {
            "scope": b or "all",
            "members_total": len(active),
            "members_inactive": len(members) - len(active),
            "by_group": groups,
            "by_gender": {"M": sum(1 for m in active if m.gender == "M"), "F": sum(1 for m in active if m.gender == "F")},
            "by_branch": [{"branch_id": br.id, "members": sum(1 for m in active if m.branch_id == br.id), "tithe_month": tsum(ms, me, br.id)} for br in branches if b is None or br.id == b],
            "tithe_month": tsum(ms, me),
            "tithe_prev_month": tsum(ps, pe),
            "offering_month": osum(ms, me),
            "offering_prev_month": osum(ps, pe),
            "trend": trend,
            "pledges": {
                "count": len(pledges),
                "pledged": money(sum((p.amount for p in pledges), start=Decimal(0))),
                "paid": money(sum((p.paid for p in pledges), start=Decimal(0))),
                "overdue": sum(1 for p in pledges if p.status == "Overdue"),
            },
            "building_fund_raised": money(sum((g.amount for g in gifts), start=Decimal(0)) + sum((p.paid for p in pledges), start=Decimal(0))),
            "building_fund_target": fund_target() or 1,
            "home_church": {
                "date": d(last_thu),
                "submitted": len(week),
                "expected": len(cells),
                "adults": sum(len(r.adults or []) for r in week),
                "children": sum(len(r.children or []) for r in week),
                "visitors": sum(r.visitors for r in week),
                "offering": money(sum((r.offering for r in week), start=Decimal(0))),
                "missing": [c.name for c in cells if not any(r.cell_id == c.id for r in week)],
            },
            "new_members_month": sum(1 for m in members if m.joined_on and m.joined_on >= ms),
            "new_believers_month": sum(1 for m in members if m.salvation_date and m.salvation_date >= ms),
            "awaiting_baptism": sum(1 for m in active if m.salvation_date and not m.water_baptism_date and m.group != "sunday_school"),
            "birthdays": birthdays,
            "inventory_alerts": [
                {"id": i.id, "name": i.name, "condition": i.condition, "branch_id": i.branch_id}
                for i in apply_scope(InventoryItem.query, InventoryItem, user).filter(InventoryItem.condition.in_(["Missing", "Needs repair"]))
            ],
        }
    )
