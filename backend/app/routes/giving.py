from collections import defaultdict
from datetime import date
from decimal import Decimal

from flask import current_app, jsonify, request

from ..constants import DENOMINATIONS
from ..extensions import db
from ..models import FundContribution, Member, Offering, Pledge, PledgePayment, Setting, Tithe
from ..schemas import FundGiftIn, OfferingIn, PaymentIn, PledgeIn, TitheIn, d, money, offering_out, payment_out, pledge_out, tithe_out
from ..security import ApiError, apply_scope, audit, claim_reference, login_required, release_reference, require_write, scope_branch
from . import api
from .people import OFFICE, load


def _range(q, model):
    a = request.args
    if a.get("from"):
        q = q.filter(model.date >= a["from"])
    if a.get("to"):
        q = q.filter(model.date <= a["to"])
    return q


def _member_in_branch(user, member_id):
    m = db.session.get(Member, member_id) if member_id else None
    if not m:
        raise ApiError(422, "Pick the member from the list.", "member_id")
    if m.branch_id != user.branch_id:
        raise ApiError(403, "That member belongs to another branch.")
    return m


@api.get("/tithes")
@login_required(*OFFICE)
def list_tithes(user):
    q = _range(apply_scope(Tithe.query, Tithe, user), Tithe)
    if request.args.get("member_id"):
        q = q.filter(Tithe.member_id == int(request.args["member_id"]))
    return jsonify([tithe_out(t) for t in q.order_by(Tithe.date.desc(), Tithe.id.desc()).limit(5000)])


@api.post("/tithes")
@login_required("secretary")
def create_tithe(user):
    require_write(user)
    data = load(TitheIn)
    m = _member_in_branch(user, data["member_id"])
    claim_reference(data["method"], data["reference"], "tithe")
    t = Tithe(member_id=m.id, branch_id=m.branch_id, date=data["date"], amount=data["amount"], method=data["method"], reference=data["reference"] if data["method"] != "cash" else "", recorded_by_id=user.id)
    db.session.add(t)
    audit(user, "Recorded tithe", f"{m.full_name} · KSh {data['amount']:,.0f}")
    db.session.commit()
    return jsonify(tithe_out(t)), 201


@api.delete("/tithes/<int:tid>")
@login_required("secretary")
def delete_tithe(user, tid):
    t = db.get_or_404(Tithe, tid)
    require_write(user, t.branch_id)
    release_reference(t.reference)
    audit(user, "Deleted tithe entry", f"{t.member.full_name} · {t.date.isoformat()} · KSh {t.amount:,.0f}")
    db.session.delete(t)
    db.session.commit()
    return jsonify(ok=True)


def tithe_report_data(user):
    rows = _range(apply_scope(Tithe.query, Tithe, user), Tithe).all()
    b = scope_branch(user)
    by_month, by_branch, by_method = defaultdict(Decimal), defaultdict(Decimal), defaultdict(Decimal)
    members = {}
    for r in rows:
        by_month[r.date.strftime("%Y-%m")] += r.amount
        by_branch[r.branch_id] += r.amount
        by_method[r.method] += r.amount
        x = members.setdefault(r.member_id, {"member_id": r.member_id, "name": r.member.full_name, "branch_id": r.branch_id, "total": Decimal(0), "count": 0, "last_date": r.date})
        x["total"] += r.amount
        x["count"] += 1
        x["last_date"] = max(x["last_date"], r.date)
    from ..models import Branch

    branches = [br.id for br in Branch.query.order_by(Branch.id)] if b is None else [b]
    return {
        "total": money(sum(by_month.values())),
        "count": len(rows),
        "tithers": len(members),
        "by_month": [{"month": k, "total": money(v)} for k, v in sorted(by_month.items())],
        "by_branch": [{"branch_id": i, "total": money(by_branch[i])} for i in branches],
        "by_method": [{"method": m, "total": money(by_method[m])} for m in ("mpesa", "bank", "cash")],
        "by_member": sorted(({**v, "total": money(v["total"]), "last_date": d(v["last_date"])} for v in members.values()), key=lambda v: -v["total"]),
    }


@api.get("/reports/tithe")
@login_required(*OFFICE)
def tithe_report(user):
    return jsonify(tithe_report_data(user))


@api.get("/offerings")
@login_required(*OFFICE)
def list_offerings(user):
    q = _range(apply_scope(Offering.query, Offering, user), Offering)
    return jsonify([offering_out(o) for o in q.order_by(Offering.date.desc(), Offering.branch_id)])


@api.post("/offerings")
@login_required("secretary")
def create_offering(user):
    require_write(user)
    data = load(OfferingIn)
    if data["date"].weekday() != 6:
        raise ApiError(422, "Offering is recorded for the Sunday Main Service — pick a Sunday.", "date")
    if Offering.query.filter_by(branch_id=user.branch_id, date=data["date"], service="Main Service").first():
        raise ApiError(409, "Offering for that Sunday has already been recorded for this branch.", "date")
    counts = {str(v): max(0, int(data["counts"].get(str(v), 0))) for v in DENOMINATIONS}
    cash = sum(Decimal(k) * n for k, n in counts.items())
    o = Offering(branch_id=user.branch_id, date=data["date"], counts=counts, cash_total=cash, mpesa_total=data["mpesa_total"], bank_total=data["bank_total"], counted_by=data["counted_by"], notes=data["notes"], recorded_by_id=user.id)
    db.session.add(o)
    audit(user, "Recorded Sunday offering", f"{data['date'].isoformat()} · KSh {o.total:,.0f}")
    db.session.commit()
    return jsonify(offering_out(o)), 201


@api.get("/reports/offering")
@login_required(*OFFICE)
def offering_report(user):
    rows = _range(apply_scope(Offering.query, Offering, user), Offering).all()
    b = scope_branch(user)
    by_month, by_branch = defaultdict(Decimal), defaultdict(Decimal)
    for r in rows:
        by_month[r.date.strftime("%Y-%m")] += r.total
        by_branch[r.branch_id] += r.total
    from ..models import Branch

    branches = [br.id for br in Branch.query.order_by(Branch.id)] if b is None else [b]
    return jsonify(
        {
            "total": money(sum((r.total for r in rows), start=Decimal(0))),
            "cash": money(sum((r.cash_total for r in rows), start=Decimal(0))),
            "mpesa": money(sum((r.mpesa_total for r in rows), start=Decimal(0))),
            "bank": money(sum((r.bank_total for r in rows), start=Decimal(0))),
            "sundays": len({r.date for r in rows}),
            "by_month": [{"month": k, "total": money(v)} for k, v in sorted(by_month.items())],
            "by_branch": [{"branch_id": i, "total": money(by_branch[i])} for i in branches],
        }
    )


@api.get("/pledges")
@login_required(*OFFICE)
def list_pledges(user):
    rows = [pledge_out(p) for p in apply_scope(Pledge.query, Pledge, user).all()]
    if request.args.get("status"):
        rows = [p for p in rows if p["status"] == request.args["status"]]
    return jsonify(sorted(rows, key=lambda p: p["member_name"]))


@api.post("/pledges")
@login_required("secretary")
def create_pledge(user):
    require_write(user)
    data = load(PledgeIn)
    m = _member_in_branch(user, data["member_id"])
    p = Pledge(member_id=m.id, branch_id=m.branch_id, project=data["project"] or "Main Church Building", amount=data["amount"], pledged_on=data.get("pledged_on") or date.today(), due_date=data["due_date"], notes=data["notes"])
    db.session.add(p)
    audit(user, "Recorded pledge", f"{m.full_name} · KSh {data['amount']:,.0f}")
    db.session.commit()
    return jsonify(pledge_out(p)), 201


@api.post("/pledges/<int:pid>/payments")
@login_required("secretary")
def pay_pledge(user, pid):
    p = db.get_or_404(Pledge, pid)
    require_write(user, p.branch_id)
    body = request.get_json(silent=True) or {}
    body.setdefault("date", date.today().isoformat())
    data = load(PaymentIn, body)
    if data["amount"] > p.balance:
        raise ApiError(422, f"That is more than the balance of KSh {p.balance:,.0f}.", "amount")
    claim_reference(data["method"], data["reference"], "pledge")
    p.payments.append(PledgePayment(date=data["date"], amount=data["amount"], method=data["method"], reference=data["reference"] if data["method"] != "cash" else "", recorded_by_id=user.id))
    audit(user, "Recorded pledge payment", f"{p.member.full_name} · KSh {data['amount']:,.0f}")
    db.session.commit()
    return jsonify(pledge_out(p)), 201


def fund_target():
    s = db.session.get(Setting, "building_fund_target")
    return int(s.value) if s else current_app.config["BUILDING_FUND_TARGET"]


@api.get("/building-fund")
@login_required(*OFFICE)
def building_fund(user):
    gifts = apply_scope(FundContribution.query, FundContribution, user).order_by(FundContribution.date.desc()).all()
    pledges = apply_scope(Pledge.query, Pledge, user).all()
    direct = sum((g.amount for g in gifts), start=Decimal(0))
    paid = sum((p.paid for p in pledges), start=Decimal(0))
    return jsonify(
        {
            "project": "Main Church Building",
            "target": fund_target(),
            "target_is_sample": False,
            "raised_total": money(direct + paid),
            "direct_total": money(direct),
            "pledge_paid_total": money(paid),
            "pledged_total": money(sum((p.amount for p in pledges), start=Decimal(0))),
            "outstanding_total": money(sum((p.balance for p in pledges), start=Decimal(0))),
            "contributions": [{**payment_out(g), "member_id": g.member_id, "contributor": g.contributor, "branch_id": g.branch_id} for g in gifts],
        }
    )


@api.post("/building-fund")
@login_required("secretary")
def add_fund_gift(user):
    require_write(user)
    data = load(FundGiftIn)
    m = db.session.get(Member, data["member_id"]) if data.get("member_id") else None
    contributor = m.full_name if m else (data.get("contributor") or "Anonymous").strip()
    claim_reference(data["method"], data["reference"], "building_fund")
    g = FundContribution(date=data["date"], amount=data["amount"], method=data["method"], reference=data["reference"] if data["method"] != "cash" else "", member_id=m.id if m else None, contributor=contributor, branch_id=user.branch_id, recorded_by_id=user.id)
    db.session.add(g)
    audit(user, "Recorded building fund gift", f"{contributor} · KSh {data['amount']:,.0f}")
    db.session.commit()
    return jsonify({**payment_out(g), "contributor": g.contributor, "branch_id": g.branch_id}), 201


@api.put("/building-fund/target")
@login_required("bishop")
def set_fund_target(user):
    target = int((request.get_json(silent=True) or {}).get("target") or 0)
    if target <= 0:
        raise ApiError(422, "Enter a target greater than zero.", "target")
    s = db.session.get(Setting, "building_fund_target") or Setting(key="building_fund_target", value="0")
    s.value = str(target)
    db.session.add(s)
    audit(user, "Set building fund target", f"KSh {target:,}")
    db.session.commit()
    return jsonify(target=target)
