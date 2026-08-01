from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, CheckConstraint, Identity, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.guideline_author import GuidelineAuthor


class Author(Base):
    """Tac gia paper; doc lap voi bang tai khoan ``users``."""

    __tablename__ = "author"
    __table_args__ = (
        CheckConstraint(
            "hoc_ham IS NULL OR hoc_ham IN ('GS', 'TS', 'ThS', 'PGS TS')",
            name="ck_author_hoc_ham",
        ),
    )

    author_id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
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

    guideline_authors: Mapped[list["GuidelineAuthor"]] = relationship(
        "GuidelineAuthor",
        back_populates="author",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<Author id={self.author_id} full_name={self.full_name!r} "
            f"hoc_ham={self.hoc_ham!r}>"
        )
