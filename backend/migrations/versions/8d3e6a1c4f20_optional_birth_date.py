from alembic import op
import sqlalchemy as sa


revision = '8d3e6a1c4f20'
down_revision = '5b1f0c2d7a9e'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('members', schema=None) as batch_op:
        batch_op.alter_column('dob', existing_type=sa.Date(), nullable=True)


def downgrade():
    with op.batch_alter_table('members', schema=None) as batch_op:
        batch_op.alter_column('dob', existing_type=sa.Date(), nullable=False)
