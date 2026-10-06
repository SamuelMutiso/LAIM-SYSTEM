import secrets

import click

from .constants import BRANCHES, HQ_BRANCH_ID, ROLES
from .extensions import db
from .models import Branch, HomeChurch, Leader, Member, User

BRANCH_HELP = ", ".join(f"{bid} {name}" for bid, _, name in BRANCHES)


def ensure_branches():
    for bid, code, name in BRANCHES:
        b = db.session.get(Branch, bid)
        if not b:
            db.session.add(Branch(id=bid, code=code, name=name))
        elif b.name != name or b.code != code:
            b.name, b.code = name, code
    db.session.commit()


def new_password():
    return secrets.token_urlsafe(9)


def find_user(email):
    return User.query.filter(db.func.lower(User.email) == email.strip().lower()).first()


def register_cli(app):
    @app.cli.command("setup")
    def setup():
        ensure_branches()
        click.echo("Branches ready: " + ", ".join(n for _, _, n in BRANCHES))

    @app.cli.command("bootstrap")
    @click.option("--domain", default="laim.church", show_default=True, help="Ending used for the login emails")
    @click.option("--bishop-phone", prompt="Bishop's phone (leave blank to add later)", default="", show_default=False)
    @click.option("--cells", default=5, show_default=True, help="How many HQ home churches to create")
    def bootstrap(domain, bishop_phone, cells):
        ensure_branches()
        created = []

        def add_user(email, name, role, branch_id, cell_id=None):
            if find_user(email):
                click.echo(f"Skipped {email} (already exists)")
                return
            password = new_password()
            u = User(email=email, name=name, role=role, branch_id=branch_id, cell_id=cell_id)
            u.set_password(password)
            db.session.add(u)
            created.append((name, email, password))

        bishop = Member.query.filter_by(first_name="Donald", last_name="Mutiso", branch_id=HQ_BRANCH_ID).first()
        if not bishop:
            bishop = Member(branch_id=HQ_BRANCH_ID, title="Bishop Dr.", first_name="Donald", last_name="Mutiso", gender="M", phone=bishop_phone.replace(" ", ""))
            db.session.add(bishop)
            db.session.flush()
        if not Leader.query.filter_by(role="Bishop", active=True).first():
            db.session.add(Leader(role="Bishop", member_id=bishop.id, branch_id=HQ_BRANCH_ID, scope="church", group="Leadership"))

        add_user(f"bishop@{domain}", "Bishop Dr. Donald Mutiso", "bishop", HQ_BRANCH_ID)
        add_user(f"secretary.hq@{domain}", "Secretary — HQ", "secretary", HQ_BRANCH_ID)

        for n in range(1, cells + 1):
            name = f"Home Church {n}"
            cell = HomeChurch.query.filter_by(branch_id=HQ_BRANCH_ID, name=name).first()
            if not cell:
                cell = HomeChurch(branch_id=HQ_BRANCH_ID, name=name, area="")
                db.session.add(cell)
                db.session.flush()
            add_user(f"hq.homechurch{n}@{domain}", f"{name} Leader", "cell_leader", HQ_BRANCH_ID, cell.id)

        db.session.commit()
        if not created:
            click.echo("Nothing new to create.")
            return
        click.echo("")
        click.echo("New logins. Save these now: the passwords are not stored anywhere and will not be shown again.")
        click.echo("")
        width = max(len(e) for _, e, _ in created)
        for name, email, password in created:
            click.echo(f"  {email.ljust(width)}  {password}   {name}")
        click.echo("")
        click.echo("Each person should change their password after signing in (key button next to Sign out).")

    @app.cli.command("create-user")
    @click.option("--email", prompt=True)
    @click.option("--name", prompt=True)
    @click.option("--role", prompt=True, type=click.Choice(ROLES))
    @click.option("--branch", "branch_id", prompt=f"Branch id ({BRANCH_HELP})", type=int)
    @click.option("--cell", "cell_id", default=None, type=int, help="Home church id (cell leaders only)")
    @click.option("--department", "department_id", default=None, type=int, help="Department id (department leaders only)")
    @click.password_option()
    def create_user(email, name, role, branch_id, cell_id, department_id, password):
        if role == "cell_leader" and not cell_id:
            raise click.UsageError("Cell leaders need --cell (the home church id).")
        if role == "dept_leader" and not department_id:
            raise click.UsageError("Department leaders need --department (the department id).")
        if len(password) < 10:
            raise click.UsageError("Use a password of at least 10 characters.")
        if find_user(email):
            raise click.ClickException(f"{email} already has a login.")
        u = User(email=email.strip().lower(), name=name, role=role, branch_id=branch_id, cell_id=cell_id, department_id=department_id)
        u.set_password(password)
        db.session.add(u)
        db.session.commit()
        click.echo(f"Created {role} {email}")

    @app.cli.command("reset-password")
    @click.argument("email")
    @click.password_option()
    def reset_password(email, password):
        u = find_user(email)
        if not u:
            raise click.ClickException(f"No login with email {email}")
        if len(password) < 10:
            raise click.UsageError("Use a password of at least 10 characters.")
        u.set_password(password)
        u.failed_logins = 0
        u.locked_until = None
        db.session.commit()
        click.echo(f"Password reset and account unlocked for {u.email}")

    @app.cli.command("unlock")
    @click.argument("email")
    def unlock(email):
        u = find_user(email)
        if not u:
            raise click.ClickException(f"No login with email {email}")
        u.failed_logins = 0
        u.locked_until = None
        db.session.commit()
        click.echo(f"Unlocked {u.email}")

    @app.cli.command("list-users")
    def list_users():
        for u in User.query.order_by(User.branch_id, User.role, User.email):
            branch = db.session.get(Branch, u.branch_id)
            click.echo(f"{u.email:<36} {u.role:<12} {branch.name if branch else u.branch_id}{'' if u.active else '  (disabled)'}")

    @app.cli.command("add-cell")
    @click.argument("name")
    @click.argument("area")
    @click.option("-b", "--branch", "branch_id", type=int, required=True, help=BRANCH_HELP)
    def add_cell(name, area, branch_id):
        c = HomeChurch(name=name, area=area, branch_id=branch_id)
        db.session.add(c)
        db.session.commit()
        click.echo(f"Home church '{name}' created with id {c.id}")
