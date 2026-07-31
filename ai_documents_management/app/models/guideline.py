from sqlalchemy import ARRAY, BigInteger, CheckConstraint, ForeignKey, Identity, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.guideline_author import guideline_authors


class Guideline(Base):
    __tablename__ = "guidelines"
    __table_args__ = (
        CheckConstraint(
            "loai_van_ban IN ('Cấp cơ sở', 'Cấp trung ương')",
            name="ck_guidelines_loai_van_ban",
        ),
    )

    guideline_id: Mapped[int] = mapped_column(
        BigInteger, Identity(), primary_key=True
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    loai_van_ban: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="Cấp cơ sở",
        server_default="Cấp cơ sở",
    )
    don_vi_ban_hanh: Mapped[str | None] = mapped_column(Text, nullable=True)
    chu_de: Mapped[str | None] = mapped_column(Text, nullable=True)
    abstract: Mapped[str | None] = mapped_column(Text, nullable=True)
    authors: Mapped[list[str] | None] = mapped_column(ARRAY(Text), nullable=True)
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
    author_entities: Mapped[list["Author"]] = relationship(
        "Author",
        secondary=guideline_authors,
        back_populates="guidelines",
        lazy="selectin",
        order_by=guideline_authors.c.author_order,
    )

    def __repr__(self) -> str:
        return f"<Guideline id={self.guideline_id} title={self.title!r}>"
