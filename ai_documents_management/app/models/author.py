from sqlalchemy import BigInteger, Boolean, CheckConstraint, Identity, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List, TYPE_CHECKING

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.guideline_author import GuidelineAuthor

class Author(Base):
    __tablename__ = "author"

    author_id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    full_name: Mapped[str] = mapped_column(Text, nullable=False)
    hoc_ham: Mapped[str | None] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    linh_vuc_nghien_cuu: Mapped[str | None] = mapped_column(Text, nullable=True)
    tom_tat_nghien_cuu: Mapped[str | None] = mapped_column(Text, nullable=True)

    guideline_authors: Mapped[List["GuidelineAuthor"]] = relationship(
        "GuidelineAuthor",
        back_populates="author",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Author id={self.author_id} full_name={self.full_name!r} hoc_ham={self.hoc_ham!r}>"
