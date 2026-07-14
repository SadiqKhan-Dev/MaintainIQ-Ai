"""add sla and hierarchy columns

Revision ID: 0001_sla_hierarchy
Revises:
Create Date: 2026-07-14
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001_sla_hierarchy"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "issues",
        sa.Column("sla_due_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "issues",
        sa.Column("work_order_type", sa.String(length=20), nullable=False, server_default="reactive"),
    )
    op.add_column(
        "issues",
        sa.Column("generated_by", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "assets",
        sa.Column(
            "parent_asset_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )
    op.create_foreign_key(
        "fk_assets_parent", "assets", "assets",
        ["parent_asset_id"], ["id"],
    )
    op.execute("ALTER TABLE issues ALTER COLUMN work_order_type DROP DEFAULT")


def downgrade() -> None:
    op.drop_constraint("fk_assets_parent", "assets", type_="foreignkey")
    op.drop_column("assets", "parent_asset_id")
    op.drop_column("issues", "generated_by")
    op.drop_column("issues", "work_order_type")
    op.drop_column("issues", "sla_due_at")
