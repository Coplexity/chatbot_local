from sqlalchemy import BigInteger, ForeignKey, SmallInteger
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.guideline import Guideline
    from app.models.author import Author

class GuidelineAuthor(Base):
    __tablename__ = "guideline_authors"

    guideline_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("guidelines.guideline_id", ondelete="CASCADE"), primary_key=True
    )
    author_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("author.author_id", ondelete="CASCADE"), primary_key=True
    )
    author_order: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=1)

    guideline: Mapped["Guideline"] = relationship("Guideline", back_populates="guideline_authors")
    author: Mapped["Author"] = relationship("Author", back_populates="guideline_authors")

    def __repr__(self) -> str:
        return f"<GuidelineAuthor guideline_id={self.guideline_id} author_id={self.author_id} order={self.author_order}>"
