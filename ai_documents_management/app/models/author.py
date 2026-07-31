from sqlalchemy import Boolean, CheckConstraint, Identity, String, Text, text
from sqlalchemy.dialects.postgresql import BIGINT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.guideline_author import guideline_authors


class Author(Base):
    """Tác giả paper; hoàn toàn độc lập với bảng tài khoản ``users``."""

    __tablename__ = "author"
    __table_args__ = (
        CheckConstraint(
            "hoc_ham IS NULL OR hoc_ham IN ('TS', 'ThS', 'PGS TS')",
            name="ck_author_hoc_ham",
        ),
    )

    author_id: Mapped[int] = mapped_column(BIGINT, Identity(), primary_key=True)
    full_name: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    hoc_ham: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
        index=True,
    )
    linh_vuc_nghien_cuu: Mapped[str | None] = mapped_column(Text, nullable=True)
    tom_tat_nghien_cuu: Mapped[str | None] = mapped_column(Text, nullable=True)

    guidelines: Mapped[list["Guideline"]] = relationship(
        "Guideline",
        secondary=guideline_authors,
        back_populates="author_entities",
        lazy="selectin",
        order_by=guideline_authors.c.author_order,
    )

    def __repr__(self) -> str:
        return f"<Author id={self.author_id} full_name={self.full_name!r}>"
