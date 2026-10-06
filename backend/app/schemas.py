import re
from decimal import Decimal

from marshmallow import EXCLUDE, Schema, ValidationError, fields, pre_load, validate, validates_schema

from .constants import CONDITIONS, GENDERS, INVENTORY_CATEGORIES, MARITAL, MEMBER_STATUS, PAYMENT_METHODS, SERVICES

PHONE_RE = re.compile(r"^(\+?254|0)(7|1)\d{8}$")
MPESA_RE = re.compile(r"^[A-Z0-9]{10}$")


def _blank_to_none(data, keys):
    for k in keys:
        if k in data and data[k] in ("", None):
            data[k] = None
    return data


class Base(Schema):
    class Meta:
        unknown = EXCLUDE


class MemberIn(Base):
    first_name = fields.Str(required=True, validate=validate.Length(min=1, max=80))
    last_name = fields.Str(required=True, validate=validate.Length(min=1, max=80))
    title = fields.Str(load_default="")
    gender = fields.Str(required=True, validate=validate.OneOf(GENDERS))
    dob = fields.Date(required=True, error_messages={"required": "Date of birth is required — it decides the member group."})
    phone = fields.Str(load_default="")
    email = fields.Email(load_default="", allow_none=True)
    residence = fields.Str(load_default="")
    occupation = fields.Str(load_default="")
    marital_status = fields.Str(load_default="Single", validate=validate.OneOf(MARITAL))
    single_parent = fields.Bool(load_default=False)
    home_church_id = fields.Int(load_default=None, allow_none=True)
    membership_status = fields.Str(load_default="Active", validate=validate.OneOf(MEMBER_STATUS))
    joined_on = fields.Date(load_default=None, allow_none=True)
    salvation_date = fields.Date(load_default=None, allow_none=True)
    water_baptism_date = fields.Date(load_default=None, allow_none=True)
    holy_spirit_baptism = fields.Bool(load_default=False)
    dedication_date = fields.Date(load_default=None, allow_none=True)
    notes = fields.Str(load_default="")

    @pre_load
    def clean(self, data, **_):
        data = dict(data)
        for k in ("first_name", "last_name", "phone", "email"):
            if isinstance(data.get(k), str):
                data[k] = data[k].strip().replace(" ", "") if k == "phone" else data[k].strip()
        if data.get("email") == "":
            data["email"] = None
        return _blank_to_none(data, ["home_church_id", "joined_on", "salvation_date", "water_baptism_date", "dedication_date"])

    @validates_schema
    def check_phone(self, data, **_):
        if data.get("phone") and not PHONE_RE.match(data["phone"]):
            raise ValidationError("Phone should look like 0712 345 678.", "phone")


class PaymentIn(Base):
    date = fields.Date(required=True)
    amount = fields.Decimal(required=True, places=2, validate=validate.Range(min=Decimal("0.01"), error="Amount must be greater than zero."))
    method = fields.Str(required=True, validate=validate.OneOf(PAYMENT_METHODS))
    reference = fields.Str(load_default="")

    @pre_load
    def clean(self, data, **_):
        data = dict(data)
        data["reference"] = (data.get("reference") or "").strip().upper()
        return data

    @validates_schema
    def check_reference(self, data, **_):
        m, ref = data.get("method"), data.get("reference", "")
        if m == "mpesa" and not MPESA_RE.match(ref):
            raise ValidationError("An M-Pesa code is 10 letters/numbers, e.g. UJK4H7X2PQ.", "reference")
        if m == "bank" and not ref:
            raise ValidationError("Enter the bank reference.", "reference")


class TitheIn(PaymentIn):
    member_id = fields.Int(required=True, error_messages={"required": "Pick the member from the list."})


class OfferingIn(Base):
    date = fields.Date(required=True)
    service = fields.Str(load_default="Main Service", validate=validate.OneOf(SERVICES, error="Choose the service."))
    service_other = fields.Str(load_default="", validate=validate.Length(max=40))
    cash_only_total = fields.Decimal(load_default=Decimal(0), places=2, validate=validate.Range(min=0))
    counts = fields.Dict(keys=fields.Str(), values=fields.Int(validate=validate.Range(min=0)), load_default=dict)
    mpesa_total = fields.Decimal(load_default=Decimal(0), places=2, validate=validate.Range(min=0))
    bank_total = fields.Decimal(load_default=Decimal(0), places=2, validate=validate.Range(min=0))
    counted_by = fields.Str(load_default="")
    notes = fields.Str(load_default="")

    @pre_load
    def clean(self, data, **_):
        data = dict(data)
        for k in ("mpesa_total", "bank_total", "cash_only_total"):
            if data.get(k) in ("", None):
                data[k] = 0
        data["counts"] = {str(k): int(v or 0) for k, v in (data.get("counts") or {}).items()}
        return data


class PledgeIn(Base):
    member_id = fields.Int(required=True)
    project = fields.Str(load_default="Main Church Building")
    amount = fields.Decimal(required=True, places=2, validate=validate.Range(min=Decimal("0.01")))
    pledged_on = fields.Date(load_default=None, allow_none=True)
    due_date = fields.Date(required=True, error_messages={"required": "Set the date it should be paid by."})
    notes = fields.Str(load_default="")


class FundGiftIn(PaymentIn):
    member_id = fields.Int(load_default=None, allow_none=True)
    contributor = fields.Str(load_default="")

    @pre_load
    def clean_member(self, data, **_):
        data = dict(data)
        if data.get("member_id") in ("", None):
            data["member_id"] = None
        return data


class DepartmentIn(Base):
    name = fields.Str(required=True, validate=validate.Length(min=2, max=120), error_messages={"required": "Give the department a name."})
    description = fields.Str(load_default="")
    leader_member_id = fields.Int(load_default=None, allow_none=True)
    assistant_member_id = fields.Int(load_default=None, allow_none=True)
    active = fields.Bool(load_default=True)

    @pre_load
    def clean(self, data, **_):
        return _blank_to_none(dict(data), ["leader_member_id", "assistant_member_id"])


class DepartmentMemberIn(Base):
    member_id = fields.Int(required=True, error_messages={"required": "Choose a member."})
    role = fields.Str(load_default="", validate=validate.Length(max=80))


class DepartmentReportIn(Base):
    date = fields.Date(required=True)
    title = fields.Str(required=True, validate=validate.Length(min=2, max=160), error_messages={"required": "Give the report a title."})
    details = fields.Str(load_default="")
    people_involved = fields.Int(load_default=None, allow_none=True, validate=validate.Range(min=0))

    @pre_load
    def clean(self, data, **_):
        return _blank_to_none(dict(data), ["people_involved"])


class LoginIn(Base):
    email = fields.Email(required=True, error_messages={"required": "Enter an email for the login.", "invalid": "Enter a valid email address."})


class CellReportIn(Base):
    cell_id = fields.Int(load_default=None, allow_none=True)
    date = fields.Date(required=True)
    area = fields.Str(load_default="")
    venue = fields.Str(load_default="")
    time = fields.Str(load_default="")
    leader = fields.Str(load_default="")
    assistant = fields.Str(load_default="")
    preaching_from = fields.Str(load_default="")
    preacher = fields.Str(load_default="")
    worship_leader = fields.Str(load_default="")
    adults = fields.List(fields.Str(), load_default=list)
    children = fields.List(fields.Str(), load_default=list)
    visitors = fields.Int(load_default=0, validate=validate.Range(min=0))
    offering = fields.Decimal(load_default=Decimal(0), places=2, validate=validate.Range(min=0))
    signed_by = fields.Str(required=True, validate=validate.Length(min=2), error_messages={"required": "Type the leader's name to sign the report."})

    @pre_load
    def clean(self, data, **_):
        data = dict(data)
        for k in ("visitors", "offering"):
            if data.get(k) in ("", None):
                data[k] = 0
        return data


class LeaderIn(Base):
    role = fields.Str(required=True, validate=validate.Length(min=2, max=120))
    member_id = fields.Int(required=True)
    since = fields.Date(load_default=None, allow_none=True)
    group = fields.Str(load_default="Leadership")


class InventoryIn(Base):
    category = fields.Str(required=True, validate=validate.OneOf(INVENTORY_CATEGORIES))
    name = fields.Str(required=True, validate=validate.Length(min=1, max=160))
    brand = fields.Str(load_default="")
    model = fields.Str(load_default="")
    serial_no = fields.Str(load_default="")
    quantity = fields.Int(required=True, validate=validate.Range(min=0))
    condition = fields.Str(load_default="Good", validate=validate.OneOf(CONDITIONS))
    location = fields.Str(load_default="")
    custodian_member_id = fields.Int(load_default=None, allow_none=True)
    acquired_on = fields.Date(load_default=None, allow_none=True)
    notes = fields.Str(load_default="")

    @pre_load
    def clean(self, data, **_):
        return _blank_to_none(dict(data), ["custodian_member_id", "acquired_on"])


class StockTakeIn(Base):
    counted = fields.Int(required=True, validate=validate.Range(min=0))
    condition = fields.Str(load_default="Good", validate=validate.OneOf(CONDITIONS))
    note = fields.Str(load_default="")


def d(v):
    return v.isoformat() if v else None


def money(v):
    return float(v or 0)


def member_out(m):
    return {
        "id": m.id,
        "branch_id": m.branch_id,
        "title": m.title,
        "first_name": m.first_name,
        "last_name": m.last_name,
        "full_name": m.full_name,
        "gender": m.gender,
        "dob": d(m.dob),
        "phone": m.phone,
        "email": m.email or "",
        "residence": m.residence,
        "occupation": m.occupation,
        "marital_status": m.marital_status,
        "single_parent": m.single_parent,
        "home_church_id": m.home_church_id,
        "home_church": m.home_church.name if m.home_church else "—",
        "membership_status": m.membership_status,
        "joined_on": d(m.joined_on),
        "salvation_date": d(m.salvation_date),
        "water_baptism_date": d(m.water_baptism_date),
        "holy_spirit_baptism": m.holy_spirit_baptism,
        "dedication_date": d(m.dedication_date),
        "notes": m.notes,
        "group": m.group,
    }


def payment_out(p):
    return {"id": p.id, "date": d(p.date), "amount": money(p.amount), "method": p.method, "reference": p.reference or ""}


def tithe_out(t):
    return {**payment_out(t), "member_id": t.member_id, "member_name": t.member.full_name, "branch_id": t.branch_id}


def offering_out(o):
    return {
        "id": o.id,
        "branch_id": o.branch_id,
        "date": d(o.date),
        "service": o.service,
        "counts": {k: int(v) for k, v in (o.counts or {}).items()},
        "cash_total": money(o.cash_total),
        "mpesa_total": money(o.mpesa_total),
        "bank_total": money(o.bank_total),
        "total": money(o.total),
        "counted_by": o.counted_by,
        "notes": o.notes,
    }


def pledge_out(p):
    return {
        "id": p.id,
        "member_id": p.member_id,
        "member_name": p.member.full_name,
        "branch_id": p.branch_id,
        "project": p.project,
        "amount": money(p.amount),
        "pledged_on": d(p.pledged_on),
        "due_date": d(p.due_date),
        "notes": p.notes,
        "paid": money(p.paid),
        "balance": money(p.balance),
        "status": p.status,
        "payments": [payment_out(x) for x in p.payments],
    }


def cell_report_out(r):
    return {
        "id": r.id,
        "cell_id": r.cell_id,
        "cell_name": r.cell.name,
        "branch_id": r.branch_id,
        "date": d(r.date),
        "area": r.area,
        "venue": r.venue,
        "time": r.time,
        "leader": r.leader,
        "assistant": r.assistant,
        "preaching_from": r.preaching_from,
        "preacher": r.preacher,
        "worship_leader": r.worship_leader,
        "adults": r.adults or [],
        "children": r.children or [],
        "visitors": r.visitors,
        "offering": money(r.offering),
        "signed_by": r.signed_by,
        "submitted_at": r.created_at.isoformat() if r.created_at else None,
    }


def leader_out(l):
    m = l.member
    return {
        "id": l.id,
        "role": l.role,
        "member_id": l.member_id,
        "name": (f"{m.title} {m.full_name}".strip() if m.title else m.full_name),
        "phone": m.phone,
        "email": m.email or "",
        "branch_id": l.branch_id,
        "scope": l.scope,
        "group": l.group,
        "since": d(l.since),
        "until": d(l.until),
        "active": l.active,
    }


def inventory_out(i):
    return {
        "id": i.id,
        "branch_id": i.branch_id,
        "category": i.category,
        "name": i.name,
        "brand": i.brand,
        "model": i.model,
        "serial_no": i.serial_no,
        "quantity": i.quantity,
        "condition": i.condition,
        "location": i.location,
        "custodian_member_id": i.custodian_member_id,
        "custodian": i.custodian.full_name if i.custodian else "",
        "acquired_on": d(i.acquired_on),
        "last_checked": d(i.last_checked),
        "notes": i.notes,
    }
