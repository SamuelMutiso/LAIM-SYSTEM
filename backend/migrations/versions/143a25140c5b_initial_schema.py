from alembic import op
import sqlalchemy as sa


revision = '143a25140c5b'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('branches',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('code', sa.String(length=10), nullable=False),
    sa.Column('name', sa.String(length=120), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('code')
    )
    op.create_table('payment_references',
    sa.Column('reference', sa.String(length=40), nullable=False),
    sa.Column('source', sa.String(length=30), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('reference')
    )
    op.create_table('settings',
    sa.Column('key', sa.String(length=60), nullable=False),
    sa.Column('value', sa.String(length=400), nullable=False),
    sa.PrimaryKeyConstraint('key')
    )
    op.create_table('token_blocklist',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('jti', sa.String(length=64), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('token_blocklist', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_token_blocklist_jti'), ['jti'], unique=True)

    op.create_table('home_churches',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('branch_id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=120), nullable=False),
    sa.Column('area', sa.String(length=120), nullable=False),
    sa.Column('venue', sa.String(length=160), nullable=True),
    sa.Column('meeting_time', sa.String(length=20), nullable=True),
    sa.Column('leader_member_id', sa.Integer(), nullable=True),
    sa.Column('assistant_member_id', sa.Integer(), nullable=True),
    sa.Column('active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('branch_id', 'name', name='uq_cell_branch_name')
    )
    with op.batch_alter_table('home_churches', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_home_churches_branch_id'), ['branch_id'], unique=False)

    op.create_table('members',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('branch_id', sa.Integer(), nullable=False),
    sa.Column('home_church_id', sa.Integer(), nullable=True),
    sa.Column('title', sa.String(length=30), nullable=True),
    sa.Column('first_name', sa.String(length=80), nullable=False),
    sa.Column('last_name', sa.String(length=80), nullable=False),
    sa.Column('gender', sa.String(length=1), nullable=False),
    sa.Column('dob', sa.Date(), nullable=False),
    sa.Column('phone', sa.String(length=20), nullable=True),
    sa.Column('email', sa.String(length=160), nullable=True),
    sa.Column('residence', sa.String(length=160), nullable=True),
    sa.Column('occupation', sa.String(length=120), nullable=True),
    sa.Column('marital_status', sa.String(length=20), nullable=False),
    sa.Column('single_parent', sa.Boolean(), nullable=False),
    sa.Column('membership_status', sa.String(length=20), nullable=False),
    sa.Column('joined_on', sa.Date(), nullable=True),
    sa.Column('salvation_date', sa.Date(), nullable=True),
    sa.Column('water_baptism_date', sa.Date(), nullable=True),
    sa.Column('holy_spirit_baptism', sa.Boolean(), nullable=False),
    sa.Column('dedication_date', sa.Date(), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
    sa.ForeignKeyConstraint(['home_church_id'], ['home_churches.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('home_churches', schema=None) as batch_op:
        batch_op.create_foreign_key('fk_cell_leader_member', 'members', ['leader_member_id'], ['id'])
        batch_op.create_foreign_key('fk_cell_assistant_member', 'members', ['assistant_member_id'], ['id'])

    with op.batch_alter_table('members', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_members_branch_id'), ['branch_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_members_home_church_id'), ['home_church_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_members_membership_status'), ['membership_status'], unique=False)
        batch_op.create_index(batch_op.f('ix_members_phone'), ['phone'], unique=False)

    op.create_table('users',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('email', sa.String(length=160), nullable=False),
    sa.Column('name', sa.String(length=160), nullable=False),
    sa.Column('password_hash', sa.String(length=128), nullable=False),
    sa.Column('role', sa.String(length=20), nullable=False),
    sa.Column('branch_id', sa.Integer(), nullable=False),
    sa.Column('cell_id', sa.Integer(), nullable=True),
    sa.Column('active', sa.Boolean(), nullable=False),
    sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.CheckConstraint("role in ('bishop','pastor','secretary','cell_leader')", name='ck_user_role'),
    sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
    sa.ForeignKeyConstraint(['cell_id'], ['home_churches.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_users_email'), ['email'], unique=True)

    op.create_table('audit_log',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=True),
    sa.Column('user_name', sa.String(length=160), nullable=False),
    sa.Column('branch_id', sa.Integer(), nullable=True),
    sa.Column('action', sa.String(length=120), nullable=False),
    sa.Column('target', sa.String(length=300), nullable=True),
    sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('audit_log', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_audit_log_at'), ['at'], unique=False)

    op.create_table('cell_reports',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('cell_id', sa.Integer(), nullable=False),
    sa.Column('branch_id', sa.Integer(), nullable=False),
    sa.Column('date', sa.Date(), nullable=False),
    sa.Column('area', sa.String(length=120), nullable=True),
    sa.Column('venue', sa.String(length=160), nullable=True),
    sa.Column('time', sa.String(length=20), nullable=True),
    sa.Column('leader', sa.String(length=160), nullable=True),
    sa.Column('assistant', sa.String(length=160), nullable=True),
    sa.Column('preaching_from', sa.String(length=160), nullable=True),
    sa.Column('preacher', sa.String(length=160), nullable=True),
    sa.Column('worship_leader', sa.String(length=160), nullable=True),
    sa.Column('adults', sa.JSON(), nullable=False),
    sa.Column('children', sa.JSON(), nullable=False),
    sa.Column('visitors', sa.Integer(), nullable=False),
    sa.Column('offering', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('signed_by', sa.String(length=160), nullable=False),
    sa.Column('submitted_by_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
    sa.ForeignKeyConstraint(['cell_id'], ['home_churches.id'], ),
    sa.ForeignKeyConstraint(['submitted_by_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('cell_id', 'date', name='uq_cell_report_day')
    )
    with op.batch_alter_table('cell_reports', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_cell_reports_branch_id'), ['branch_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_cell_reports_cell_id'), ['cell_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_cell_reports_date'), ['date'], unique=False)

    op.create_table('fund_contributions',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('project', sa.String(length=120), nullable=False),
    sa.Column('member_id', sa.Integer(), nullable=True),
    sa.Column('contributor', sa.String(length=160), nullable=False),
    sa.Column('branch_id', sa.Integer(), nullable=False),
    sa.Column('recorded_by_id', sa.Integer(), nullable=True),
    sa.Column('date', sa.Date(), nullable=False),
    sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('method', sa.String(length=10), nullable=False),
    sa.Column('reference', sa.String(length=40), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
    sa.ForeignKeyConstraint(['member_id'], ['members.id'], ),
    sa.ForeignKeyConstraint(['recorded_by_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('fund_contributions', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_fund_contributions_branch_id'), ['branch_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_fund_contributions_date'), ['date'], unique=False)

    op.create_table('inventory_items',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('branch_id', sa.Integer(), nullable=False),
    sa.Column('category', sa.String(length=60), nullable=False),
    sa.Column('name', sa.String(length=160), nullable=False),
    sa.Column('brand', sa.String(length=80), nullable=True),
    sa.Column('model', sa.String(length=80), nullable=True),
    sa.Column('serial_no', sa.String(length=80), nullable=True),
    sa.Column('quantity', sa.Integer(), nullable=False),
    sa.Column('condition', sa.String(length=20), nullable=False),
    sa.Column('location', sa.String(length=120), nullable=True),
    sa.Column('custodian_member_id', sa.Integer(), nullable=True),
    sa.Column('acquired_on', sa.Date(), nullable=True),
    sa.Column('last_checked', sa.Date(), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.CheckConstraint('quantity >= 0', name='ck_inventory_qty'),
    sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
    sa.ForeignKeyConstraint(['custodian_member_id'], ['members.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('inventory_items', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_inventory_items_branch_id'), ['branch_id'], unique=False)

    op.create_table('leaders',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('role', sa.String(length=120), nullable=False),
    sa.Column('member_id', sa.Integer(), nullable=False),
    sa.Column('branch_id', sa.Integer(), nullable=False),
    sa.Column('scope', sa.String(length=10), nullable=False),
    sa.Column('group', sa.String(length=40), nullable=True),
    sa.Column('since', sa.Date(), nullable=True),
    sa.Column('until', sa.Date(), nullable=True),
    sa.Column('active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
    sa.ForeignKeyConstraint(['member_id'], ['members.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('offerings',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('branch_id', sa.Integer(), nullable=False),
    sa.Column('date', sa.Date(), nullable=False),
    sa.Column('service', sa.String(length=40), nullable=False),
    sa.Column('counts', sa.JSON(), nullable=False),
    sa.Column('cash_total', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('mpesa_total', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('bank_total', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('counted_by', sa.String(length=200), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('recorded_by_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
    sa.ForeignKeyConstraint(['recorded_by_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('branch_id', 'date', 'service', name='uq_offering_branch_day')
    )
    with op.batch_alter_table('offerings', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_offerings_branch_id'), ['branch_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_offerings_date'), ['date'], unique=False)

    op.create_table('pledges',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('member_id', sa.Integer(), nullable=False),
    sa.Column('branch_id', sa.Integer(), nullable=False),
    sa.Column('project', sa.String(length=120), nullable=False),
    sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('pledged_on', sa.Date(), nullable=False),
    sa.Column('due_date', sa.Date(), nullable=False),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.CheckConstraint('amount > 0', name='ck_pledge_amount'),
    sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
    sa.ForeignKeyConstraint(['member_id'], ['members.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('pledges', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_pledges_branch_id'), ['branch_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_pledges_member_id'), ['member_id'], unique=False)

    op.create_table('tithes',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('member_id', sa.Integer(), nullable=False),
    sa.Column('branch_id', sa.Integer(), nullable=False),
    sa.Column('recorded_by_id', sa.Integer(), nullable=True),
    sa.Column('date', sa.Date(), nullable=False),
    sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('method', sa.String(length=10), nullable=False),
    sa.Column('reference', sa.String(length=40), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.CheckConstraint('amount > 0', name='ck_tithe_amount'),
    sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
    sa.ForeignKeyConstraint(['member_id'], ['members.id'], ),
    sa.ForeignKeyConstraint(['recorded_by_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('tithes', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_tithes_branch_id'), ['branch_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_tithes_date'), ['date'], unique=False)
        batch_op.create_index(batch_op.f('ix_tithes_member_id'), ['member_id'], unique=False)

    op.create_table('worship_team',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('member_id', sa.Integer(), nullable=False),
    sa.Column('branch_id', sa.Integer(), nullable=False),
    sa.Column('role', sa.String(length=80), nullable=False),
    sa.Column('part', sa.String(length=80), nullable=True),
    sa.Column('active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
    sa.ForeignKeyConstraint(['member_id'], ['members.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('pledge_payments',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('pledge_id', sa.Integer(), nullable=False),
    sa.Column('recorded_by_id', sa.Integer(), nullable=True),
    sa.Column('date', sa.Date(), nullable=False),
    sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('method', sa.String(length=10), nullable=False),
    sa.Column('reference', sa.String(length=40), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['pledge_id'], ['pledges.id'], ),
    sa.ForeignKeyConstraint(['recorded_by_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('pledge_payments', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_pledge_payments_date'), ['date'], unique=False)
        batch_op.create_index(batch_op.f('ix_pledge_payments_pledge_id'), ['pledge_id'], unique=False)

    op.create_table('stock_takes',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('item_id', sa.Integer(), nullable=False),
    sa.Column('date', sa.Date(), nullable=False),
    sa.Column('counted', sa.Integer(), nullable=False),
    sa.Column('expected', sa.Integer(), nullable=False),
    sa.Column('condition', sa.String(length=20), nullable=False),
    sa.Column('checked_by', sa.String(length=160), nullable=True),
    sa.Column('note', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['item_id'], ['inventory_items.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('stock_takes', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_stock_takes_item_id'), ['item_id'], unique=False)


def downgrade():
    with op.batch_alter_table('home_churches', schema=None) as batch_op:
        batch_op.drop_constraint('fk_cell_leader_member', type_='foreignkey')
        batch_op.drop_constraint('fk_cell_assistant_member', type_='foreignkey')

    with op.batch_alter_table('stock_takes', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_stock_takes_item_id'))

    op.drop_table('stock_takes')
    with op.batch_alter_table('pledge_payments', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_pledge_payments_pledge_id'))
        batch_op.drop_index(batch_op.f('ix_pledge_payments_date'))

    op.drop_table('pledge_payments')
    op.drop_table('worship_team')
    with op.batch_alter_table('tithes', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_tithes_member_id'))
        batch_op.drop_index(batch_op.f('ix_tithes_date'))
        batch_op.drop_index(batch_op.f('ix_tithes_branch_id'))

    op.drop_table('tithes')
    with op.batch_alter_table('pledges', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_pledges_member_id'))
        batch_op.drop_index(batch_op.f('ix_pledges_branch_id'))

    op.drop_table('pledges')
    with op.batch_alter_table('offerings', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_offerings_date'))
        batch_op.drop_index(batch_op.f('ix_offerings_branch_id'))

    op.drop_table('offerings')
    op.drop_table('leaders')
    with op.batch_alter_table('inventory_items', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_inventory_items_branch_id'))

    op.drop_table('inventory_items')
    with op.batch_alter_table('fund_contributions', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_fund_contributions_date'))
        batch_op.drop_index(batch_op.f('ix_fund_contributions_branch_id'))

    op.drop_table('fund_contributions')
    with op.batch_alter_table('cell_reports', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_cell_reports_date'))
        batch_op.drop_index(batch_op.f('ix_cell_reports_cell_id'))
        batch_op.drop_index(batch_op.f('ix_cell_reports_branch_id'))

    op.drop_table('cell_reports')
    with op.batch_alter_table('audit_log', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_audit_log_at'))

    op.drop_table('audit_log')
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_users_email'))

    op.drop_table('users')
    with op.batch_alter_table('members', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_members_phone'))
        batch_op.drop_index(batch_op.f('ix_members_membership_status'))
        batch_op.drop_index(batch_op.f('ix_members_home_church_id'))
        batch_op.drop_index(batch_op.f('ix_members_branch_id'))

    op.drop_table('members')
    with op.batch_alter_table('home_churches', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_home_churches_branch_id'))

    op.drop_table('home_churches')
    with op.batch_alter_table('token_blocklist', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_token_blocklist_jti'))

    op.drop_table('token_blocklist')
    op.drop_table('settings')
    op.drop_table('payment_references')
    op.drop_table('branches')
