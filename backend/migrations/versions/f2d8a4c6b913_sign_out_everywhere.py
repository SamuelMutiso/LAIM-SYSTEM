from alembic import op
import sqlalchemy as sa


revision = 'f2d8a4c6b913'
down_revision = 'c4a7e2b91d05'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('tokens_valid_from', sa.DateTime(timezone=True), nullable=True))


def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('tokens_valid_from')
