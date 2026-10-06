from alembic import op
import sqlalchemy as sa


revision = 'c4a7e2b91d05'
down_revision = '8d3e6a1c4f20'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'departments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('branch_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('leader_member_id', sa.Integer(), nullable=True),
        sa.Column('assistant_member_id', sa.Integer(), nullable=True),
        sa.Column('active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id']),
        sa.ForeignKeyConstraint(['leader_member_id'], ['members.id']),
        sa.ForeignKeyConstraint(['assistant_member_id'], ['members.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('branch_id', 'name', name='uq_department_branch_name'),
    )
    op.create_index('ix_departments_branch_id', 'departments', ['branch_id'])
    op.create_table(
        'department_members',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('department_id', sa.Integer(), nullable=False),
        sa.Column('member_id', sa.Integer(), nullable=False),
        sa.Column('role', sa.String(length=80), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id']),
        sa.ForeignKeyConstraint(['member_id'], ['members.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('department_id', 'member_id', name='uq_department_member'),
    )
    op.create_index('ix_department_members_department_id', 'department_members', ['department_id'])
    op.create_table(
        'department_reports',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('department_id', sa.Integer(), nullable=False),
        sa.Column('branch_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('title', sa.String(length=160), nullable=False),
        sa.Column('details', sa.Text(), nullable=True),
        sa.Column('people_involved', sa.Integer(), nullable=True),
        sa.Column('submitted_by_id', sa.Integer(), nullable=True),
        sa.Column('submitted_by_name', sa.String(length=160), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id']),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id']),
        sa.ForeignKeyConstraint(['submitted_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_department_reports_department_id', 'department_reports', ['department_id'])
    op.create_index('ix_department_reports_branch_id', 'department_reports', ['branch_id'])
    op.create_index('ix_department_reports_date', 'department_reports', ['date'])
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('department_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_users_department_id', 'departments', ['department_id'], ['id'])
        batch_op.drop_constraint('ck_user_role', type_='check')
        batch_op.create_check_constraint('ck_user_role', "role in ('bishop','pastor','secretary','cell_leader','dept_leader')")


def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_constraint('ck_user_role', type_='check')
        batch_op.create_check_constraint('ck_user_role', "role in ('bishop','pastor','secretary','cell_leader')")
        batch_op.drop_constraint('fk_users_department_id', type_='foreignkey')
        batch_op.drop_column('department_id')
    op.drop_table('department_reports')
    op.drop_table('department_members')
    op.drop_table('departments')
