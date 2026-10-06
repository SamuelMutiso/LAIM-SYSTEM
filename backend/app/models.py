from datetime import date, datetime, timezone

from sqlalchemy import CheckConstraint, UniqueConstraint

from .constants import group_for
from .extensions import bcrypt, db


def utcnow():
    return datetime.now(timezone.utc)


class TimestampMixin:
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class Branch(db.Model):
    __tablename__ = "branches"
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(10), unique=True, nullable=False)
    name = db.Column(db.String(120), nullable=False)


class User(TimestampMixin, db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(160), unique=True, nullable=False, index=True)
    name = db.Column(db.String(160), nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    branch_id = db.Column(db.Integer, db.ForeignKey("branches.id"), nullable=False)
    cell_id = db.Column(db.Integer, db.ForeignKey("home_churches.id"))
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id", use_alter=True))
    active = db.Column(db.Boolean, default=True, nullable=False)
    last_login_at = db.Column(db.DateTime(timezone=True))
    failed_logins = db.Column(db.Integer, default=0, nullable=False, server_default="0")
    locked_until = db.Column(db.DateTime(timezone=True))

    __table_args__ = (CheckConstraint("role in ('bishop','pastor','secretary','cell_leader','dept_leader')", name="ck_user_role"),)

    def set_password(self, raw):
        self.password_hash = bcrypt.generate_password_hash(raw).decode()

    def check_password(self, raw):
        return bcrypt.check_password_hash(self.password_hash, raw)

    def to_dict(self):
        return {"id": self.id, "email": self.email, "name": self.name, "role": self.role, "branch_id": self.branch_id, "cell_id": self.cell_id, "department_id": self.department_id}


class TokenBlocklist(db.Model):
    __tablename__ = "token_blocklist"
    id = db.Column(db.Integer, primary_key=True)
    jti = db.Column(db.String(64), unique=True, nullable=False, index=True)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)


class HomeChurch(TimestampMixin, db.Model):
    __tablename__ = "home_churches"
    id = db.Column(db.Integer, primary_key=True)
    branch_id = db.Column(db.Integer, db.ForeignKey("branches.id"), nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    area = db.Column(db.String(120), nullable=False)
    venue = db.Column(db.String(160), default="")
    meeting_time = db.Column(db.String(20), default="6:00 PM")
    leader_member_id = db.Column(db.Integer, db.ForeignKey("members.id", use_alter=True))
    assistant_member_id = db.Column(db.Integer, db.ForeignKey("members.id", use_alter=True))
    active = db.Column(db.Boolean, default=True, nullable=False)

    __table_args__ = (UniqueConstraint("branch_id", "name", name="uq_cell_branch_name"),)


class Member(TimestampMixin, db.Model):
    __tablename__ = "members"
    id = db.Column(db.Integer, primary_key=True)
    branch_id = db.Column(db.Integer, db.ForeignKey("branches.id"), nullable=False, index=True)
    home_church_id = db.Column(db.Integer, db.ForeignKey("home_churches.id"), index=True)
    title = db.Column(db.String(30), default="")
    first_name = db.Column(db.String(80), nullable=False)
    last_name = db.Column(db.String(80), nullable=False)
    gender = db.Column(db.String(1), nullable=False)
    dob = db.Column(db.Date)
    phone = db.Column(db.String(20), default="", index=True)
    email = db.Column(db.String(160), default="")
    residence = db.Column(db.String(160), default="")
    occupation = db.Column(db.String(120), default="")
    marital_status = db.Column(db.String(20), default="Single", nullable=False)
    single_parent = db.Column(db.Boolean, default=False, nullable=False)
    membership_status = db.Column(db.String(20), default="Active", nullable=False, index=True)
    joined_on = db.Column(db.Date, default=date.today)
    salvation_date = db.Column(db.Date)
    water_baptism_date = db.Column(db.Date)
    holy_spirit_baptism = db.Column(db.Boolean, default=False, nullable=False)
    dedication_date = db.Column(db.Date)
    notes = db.Column(db.Text, default="")

    home_church = db.relationship("HomeChurch", foreign_keys=[home_church_id])

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def age(self):
        if not self.dob:
            return None
        t = date.today()
        return t.year - self.dob.year - ((t.month, t.day) < (self.dob.month, self.dob.day))

    @property
    def group(self):
        return group_for(self.age, self.gender, self.marital_status, self.single_parent)


class PaymentReference(db.Model):

    __tablename__ = "payment_references"
    reference = db.Column(db.String(40), primary_key=True)
    source = db.Column(db.String(30), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)


class PaymentMixin:
    date = db.Column(db.Date, nullable=False, index=True)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    method = db.Column(db.String(10), nullable=False)
    reference = db.Column(db.String(40), default="")


class Tithe(PaymentMixin, TimestampMixin, db.Model):
    __tablename__ = "tithes"
    id = db.Column(db.Integer, primary_key=True)
    member_id = db.Column(db.Integer, db.ForeignKey("members.id"), nullable=False, index=True)
    branch_id = db.Column(db.Integer, db.ForeignKey("branches.id"), nullable=False, index=True)
    recorded_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    member = db.relationship("Member")
    __table_args__ = (CheckConstraint("amount > 0", name="ck_tithe_amount"),)


class Offering(TimestampMixin, db.Model):
    __tablename__ = "offerings"
    id = db.Column(db.Integer, primary_key=True)
    branch_id = db.Column(db.Integer, db.ForeignKey("branches.id"), nullable=False, index=True)
    date = db.Column(db.Date, nullable=False, index=True)
    service = db.Column(db.String(40), default="Main Service", nullable=False)
    counts = db.Column(db.JSON, nullable=False, default=dict)
    cash_total = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    mpesa_total = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    bank_total = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    counted_by = db.Column(db.String(200), default="")
    notes = db.Column(db.Text, default="")
    recorded_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    __table_args__ = (UniqueConstraint("branch_id", "date", "service", name="uq_offering_branch_day"),)

    @property
    def total(self):
        return self.cash_total + self.mpesa_total + self.bank_total


class Pledge(TimestampMixin, db.Model):
    __tablename__ = "pledges"
    id = db.Column(db.Integer, primary_key=True)
    member_id = db.Column(db.Integer, db.ForeignKey("members.id"), nullable=False, index=True)
    branch_id = db.Column(db.Integer, db.ForeignKey("branches.id"), nullable=False, index=True)
    project = db.Column(db.String(120), default="Main Church Building", nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    pledged_on = db.Column(db.Date, nullable=False)
    due_date = db.Column(db.Date, nullable=False)
    notes = db.Column(db.Text, default="")
    member = db.relationship("Member")
    payments = db.relationship("PledgePayment", backref="pledge", order_by="PledgePayment.date", cascade="all, delete-orphan")
    __table_args__ = (CheckConstraint("amount > 0", name="ck_pledge_amount"),)

    @property
    def paid(self):
        return sum((p.amount for p in self.payments), start=0)

    @property
    def balance(self):
        return max(self.amount - self.paid, 0)

    @property
    def status(self):
        if self.balance == 0:
            return "Fully Paid"
        if self.due_date < date.today():
            return "Overdue"
        if self.paid == 0:
            return "Not Started"
        return "Partly Paid"


class PledgePayment(PaymentMixin, TimestampMixin, db.Model):
    __tablename__ = "pledge_payments"
    id = db.Column(db.Integer, primary_key=True)
    pledge_id = db.Column(db.Integer, db.ForeignKey("pledges.id"), nullable=False, index=True)
    recorded_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))


class FundContribution(PaymentMixin, TimestampMixin, db.Model):
    __tablename__ = "fund_contributions"
    id = db.Column(db.Integer, primary_key=True)
    project = db.Column(db.String(120), default="Main Church Building", nullable=False)
    member_id = db.Column(db.Integer, db.ForeignKey("members.id"))
    contributor = db.Column(db.String(160), nullable=False)
    branch_id = db.Column(db.Integer, db.ForeignKey("branches.id"), nullable=False, index=True)
    recorded_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))


class Setting(db.Model):
    __tablename__ = "settings"
    key = db.Column(db.String(60), primary_key=True)
    value = db.Column(db.String(400), nullable=False)


class CellReport(TimestampMixin, db.Model):
    __tablename__ = "cell_reports"
    id = db.Column(db.Integer, primary_key=True)
    cell_id = db.Column(db.Integer, db.ForeignKey("home_churches.id"), nullable=False, index=True)
    branch_id = db.Column(db.Integer, db.ForeignKey("branches.id"), nullable=False, index=True)
    date = db.Column(db.Date, nullable=False, index=True)
    area = db.Column(db.String(120), default="")
    venue = db.Column(db.String(160), default="")
    time = db.Column(db.String(20), default="")
    leader = db.Column(db.String(160), default="")
    assistant = db.Column(db.String(160), default="")
    preaching_from = db.Column(db.String(160), default="")
    preacher = db.Column(db.String(160), default="")
    worship_leader = db.Column(db.String(160), default="")
    adults = db.Column(db.JSON, nullable=False, default=list)
    children = db.Column(db.JSON, nullable=False, default=list)
    visitors = db.Column(db.Integer, default=0, nullable=False)
    offering = db.Column(db.Numeric(12, 2), default=0, nullable=False)
    signed_by = db.Column(db.String(160), nullable=False)
    submitted_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    cell = db.relationship("HomeChurch")
    __table_args__ = (UniqueConstraint("cell_id", "date", name="uq_cell_report_day"),)


class Leader(TimestampMixin, db.Model):
    __tablename__ = "leaders"
    id = db.Column(db.Integer, primary_key=True)
    role = db.Column(db.String(120), nullable=False)
    member_id = db.Column(db.Integer, db.ForeignKey("members.id"), nullable=False)
    branch_id = db.Column(db.Integer, db.ForeignKey("branches.id"), nullable=False)
    scope = db.Column(db.String(10), default="branch", nullable=False)
    group = db.Column(db.String(40), default="Leadership")
    since = db.Column(db.Date)
    until = db.Column(db.Date)
    active = db.Column(db.Boolean, default=True, nullable=False)
    member = db.relationship("Member")


class WorshipTeamMember(TimestampMixin, db.Model):
    __tablename__ = "worship_team"
    id = db.Column(db.Integer, primary_key=True)
    member_id = db.Column(db.Integer, db.ForeignKey("members.id"), nullable=False)
    branch_id = db.Column(db.Integer, db.ForeignKey("branches.id"), nullable=False)
    role = db.Column(db.String(80), nullable=False)
    part = db.Column(db.String(80), default="")
    active = db.Column(db.Boolean, default=True, nullable=False)
    member = db.relationship("Member")


class InventoryItem(TimestampMixin, db.Model):
    __tablename__ = "inventory_items"
    id = db.Column(db.Integer, primary_key=True)
    branch_id = db.Column(db.Integer, db.ForeignKey("branches.id"), nullable=False, index=True)
    category = db.Column(db.String(60), nullable=False)
    name = db.Column(db.String(160), nullable=False)
    brand = db.Column(db.String(80), default="")
    model = db.Column(db.String(80), default="")
    serial_no = db.Column(db.String(80), default="")
    quantity = db.Column(db.Integer, nullable=False, default=1)
    condition = db.Column(db.String(20), nullable=False, default="Good")
    location = db.Column(db.String(120), default="")
    custodian_member_id = db.Column(db.Integer, db.ForeignKey("members.id"))
    acquired_on = db.Column(db.Date)
    last_checked = db.Column(db.Date)
    notes = db.Column(db.Text, default="")
    custodian = db.relationship("Member")
    __table_args__ = (CheckConstraint("quantity >= 0", name="ck_inventory_qty"),)


class StockTake(TimestampMixin, db.Model):
    __tablename__ = "stock_takes"
    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey("inventory_items.id"), nullable=False, index=True)
    date = db.Column(db.Date, nullable=False)
    counted = db.Column(db.Integer, nullable=False)
    expected = db.Column(db.Integer, nullable=False)
    condition = db.Column(db.String(20), nullable=False)
    checked_by = db.Column(db.String(160), default="")
    note = db.Column(db.Text, default="")


class AuditLog(db.Model):
    __tablename__ = "audit_log"
    id = db.Column(db.Integer, primary_key=True)
    at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    user_name = db.Column(db.String(160), nullable=False)
    branch_id = db.Column(db.Integer, db.ForeignKey("branches.id"))
    action = db.Column(db.String(120), nullable=False)
    target = db.Column(db.String(300), default="")


class Department(TimestampMixin, db.Model):
    __tablename__ = "departments"
    id = db.Column(db.Integer, primary_key=True)
    branch_id = db.Column(db.Integer, db.ForeignKey("branches.id"), nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, default="")
    leader_member_id = db.Column(db.Integer, db.ForeignKey("members.id"))
    assistant_member_id = db.Column(db.Integer, db.ForeignKey("members.id"))
    active = db.Column(db.Boolean, default=True, nullable=False)
    leader = db.relationship("Member", foreign_keys=[leader_member_id])
    assistant = db.relationship("Member", foreign_keys=[assistant_member_id])
    __table_args__ = (UniqueConstraint("branch_id", "name", name="uq_department_branch_name"),)


class DepartmentMember(TimestampMixin, db.Model):
    __tablename__ = "department_members"
    id = db.Column(db.Integer, primary_key=True)
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"), nullable=False, index=True)
    member_id = db.Column(db.Integer, db.ForeignKey("members.id"), nullable=False)
    role = db.Column(db.String(80), default="")
    member = db.relationship("Member")
    __table_args__ = (UniqueConstraint("department_id", "member_id", name="uq_department_member"),)


class DepartmentReport(TimestampMixin, db.Model):
    __tablename__ = "department_reports"
    id = db.Column(db.Integer, primary_key=True)
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"), nullable=False, index=True)
    branch_id = db.Column(db.Integer, db.ForeignKey("branches.id"), nullable=False, index=True)
    date = db.Column(db.Date, nullable=False, index=True)
    title = db.Column(db.String(160), nullable=False)
    details = db.Column(db.Text, default="")
    people_involved = db.Column(db.Integer)
    submitted_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    submitted_by_name = db.Column(db.String(160), default="")
