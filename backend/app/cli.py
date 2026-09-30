import random
from datetime import date, timedelta

import click

from .constants import BRANCHES, ROLES
from .extensions import db
from .models import Branch, CellReport, HomeChurch, InventoryItem, Leader, Member, Offering, Pledge, PledgePayment, Tithe, User


def register_cli(app):
    @app.cli.command("setup")
    def setup():
        for bid, code, name in BRANCHES:
            if not db.session.get(Branch, bid):
                db.session.add(Branch(id=bid, code=code, name=name))
        db.session.commit()
        click.echo("Branches ready: " + ", ".join(n for _, _, n in BRANCHES))

    @app.cli.command("create-user")
    @click.option("--email", prompt=True)
    @click.option("--name", prompt=True)
    @click.option("--role", prompt=True, type=click.Choice(ROLES))
    @click.option("--branch", "branch_id", prompt="Branch id (1 HQ, 2 Korrompoi, 3 Milimani, 4 Matuu)", type=int)
    @click.option("--cell", "cell_id", default=None, type=int, help="Home church id (cell leaders only)")
    @click.password_option()
    def create_user(email, name, role, branch_id, cell_id, password):
        if role == "cell_leader" and not cell_id:
            raise click.UsageError("Cell leaders need --cell (the home church id).")
        if len(password) < 10:
            raise click.UsageError("Use a password of at least 10 characters.")
        u = User(email=email.strip().lower(), name=name, role=role, branch_id=branch_id, cell_id=cell_id)
        u.set_password(password)
        db.session.add(u)
        db.session.commit()
        click.echo(f"Created {role} {email}")

    @app.cli.command("add-cell")
    @click.argument("name")
    @click.argument("area")
    @click.option("-b", "--branch", "branch_id", type=int, required=True)
    def add_cell(name, area, branch_id):
        c = HomeChurch(name=name, area=area, branch_id=branch_id)
        db.session.add(c)
        db.session.commit()
        click.echo(f"Home church '{name}' created with id {c.id}")

    @app.cli.command("seed-demo")
    def seed_demo():
        if Member.query.first():
            raise click.ClickException("Database already has members — not seeding.")
        rnd = random.Random(613)
        setup.callback()
        today = date.today()
        firsts_m = ["John", "Peter", "Samuel", "David", "Joseph", "Daniel", "Stephen", "Paul", "Brian", "Kevin", "Moses", "Isaac"]
        firsts_f = ["Mary", "Grace", "Faith", "Esther", "Ruth", "Mercy", "Joyce", "Lucy", "Janet", "Purity", "Naomi", "Lydia"]
        lasts = ["Mutiso", "Mwangi", "Kilonzo", "Musyoka", "Mutua", "Nzioka", "Wambua", "Kioko", "Sankale", "Koikai", "Kimani", "Mbithi"]
        cells = {}
        for bid, names in {1: ["Acacia", "Baraka", "Neema"], 2: ["Tumaini"], 3: ["Shalom"], 4: ["Rehoboth"]}.items():
            for n in names:
                c = HomeChurch(branch_id=bid, name=n, area=n)
                db.session.add(c)
                cells.setdefault(bid, []).append(c)
        db.session.flush()
        bishop = Member(branch_id=1, title="Bishop Dr.", first_name="Donald", last_name="Mutiso", gender="M", dob=date(1964, 3, 2), marital_status="Married", home_church_id=cells[1][0].id)
        db.session.add(bishop)
        members = [bishop]
        for bid, size in {1: 60, 2: 20, 3: 18, 4: 22}.items():
            for _ in range(size):
                g = rnd.choice("MF")
                age = rnd.choice([rnd.randint(2, 12), rnd.randint(13, 19), rnd.randint(20, 24), rnd.randint(25, 70), rnd.randint(28, 65)])
                m = Member(
                    branch_id=bid,
                    home_church_id=rnd.choice(cells[bid]).id,
                    first_name=rnd.choice(firsts_f if g == "F" else firsts_m),
                    last_name=rnd.choice(lasts),
                    gender=g,
                    dob=date(today.year - age, rnd.randint(1, 12), rnd.randint(1, 28)),
                    phone=f"07{rnd.randint(10000000, 99999999)}" if age >= 16 else "",
                    marital_status="Married" if age > 27 and rnd.random() < 0.6 else "Single",
                    residence=rnd.choice(["Kitengela", "Isinya", "Kajiado", "Matuu"]),
                    salvation_date=today - timedelta(days=rnd.randint(10, 3000)) if age > 10 else None,
                )
                db.session.add(m)
                members.append(m)
        db.session.flush()
        db.session.add(Leader(role="Bishop", member_id=bishop.id, branch_id=1, scope="church", since=date(2008, 3, 2)))
        for m in [x for x in members if x.age and x.age >= 20]:
            if rnd.random() < 0.6:
                for mo in range(1, today.month + 1):
                    d0 = date(today.year, mo, 1)
                    sunday = d0 + timedelta(days=(6 - d0.weekday()) % 7)
                    if sunday <= today:
                        db.session.add(Tithe(member_id=m.id, branch_id=m.branch_id, date=sunday, amount=rnd.choice([200, 500, 1000, 2000]), method="cash"))
        d0 = today - timedelta(days=(today.weekday() + 1) % 7)
        for w in range(8):
            for bid in (1, 2, 3, 4):
                counts = {str(v): rnd.randint(0, 20) for v in (1000, 500, 200, 100, 50, 20, 10, 5, 1)}
                db.session.add(Offering(branch_id=bid, date=d0 - timedelta(weeks=w), counts=counts, cash_total=sum(int(k) * n for k, n in counts.items()), mpesa_total=rnd.randint(1000, 8000)))
        for m in rnd.sample([x for x in members if x.age and x.age >= 25], 10):
            p = Pledge(member_id=m.id, branch_id=m.branch_id, amount=rnd.choice([5000, 10000, 20000]), pledged_on=today - timedelta(days=90), due_date=today + timedelta(days=rnd.choice([-10, 60, 180])))
            p.payments.append(PledgePayment(date=today - timedelta(days=30), amount=1000, method="cash"))
            db.session.add(p)
        for bid in (1, 2, 3, 4):
            db.session.add(InventoryItem(branch_id=bid, category="Microphones", name="Wired Vocal Mic", brand="Shure", quantity=4, last_checked=today))
        thu = today - timedelta(days=(today.weekday() - 3) % 7)
        for bid, cs in cells.items():
            for c in cs:
                db.session.add(CellReport(cell_id=c.id, branch_id=bid, date=thu, adults=["Sample Adult"], children=[], visitors=1, offering=300, signed_by="Leader"))
        for email, name, role, bid, cell in [
            ("bishop@laim.church", "Bishop Dr. Donald Mutiso", "bishop", 1, None),
            ("secretary.hq@laim.church", "Secretary — HQ", "secretary", 1, None),
            ("pastor.korrompoi@laim.church", "Pastor — Korrompoi", "pastor", 2, None),
            ("acacia@laim.church", "Acacia Leader", "cell_leader", 1, cells[1][0].id),
        ]:
            u = User(email=email, name=name, role=role, branch_id=bid, cell_id=cell)
            u.set_password("demo-password-123")
            db.session.add(u)
        db.session.commit()
        click.echo("Sample data loaded. Demo logins use password: demo-password-123 (change or delete before going live).")
