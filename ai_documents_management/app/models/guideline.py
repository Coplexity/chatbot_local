from sqlalchemy import ARRAY, BigInteger, ForeignKey, Identity, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.guideline_author import GuidelineAuthor

class Guideline(Base):
    __tablename__ = "guidelines"

    guideline_id: Mapped[int] = mapped_column(
        BigInteger, Identity(), primary_key=True
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    loai_van_ban: Mapped[str | None] = mapped_column(Text, nullable=True)
    don_vi_ban_hanh: Mapped[str | None] = mapped_column(Text, nullable=True)
    chu_de: Mapped[str | None] = mapped_column(Text, nullable=True)
    abstract: Mapped[str | None] = mapped_column(Text, nullable=True)
    doi_van_ban: Mapped[str | None] = mapped_column(Text, nullable=True)
    owner_user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.user_id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    created_by_user_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    owner: Mapped["User"] = relationship(
        "User", foreign_keys=[owner_user_id], lazy="selectin"
    )
    created_by: Mapped["User | None"] = relationship(
        "User", foreign_keys=[created_by_user_id], lazy="selectin"
    )
    versions: Mapped[list["GuidelineVersion"]] = relationship(
        "GuidelineVersion", back_populates="guideline", lazy="select"
    )
    guideline_authors: Mapped[list["GuidelineAuthor"]] = relationship(
        "GuidelineAuthor", back_populates="guideline", cascade="all, delete-orphan", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Guideline id={self.guideline_id} title={self.title!r}>"
