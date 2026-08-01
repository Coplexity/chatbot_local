from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, ForeignKey, SmallInteger, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.author import Author
    from app.models.guideline import Guideline


class GuidelineAuthor(Base):
    __tablename__ = "guideline_authors"

    guideline_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("guidelines.guideline_id", ondelete="CASCADE"),
        primary_key=True,
    )
    author_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("author.author_id", ondelete="RESTRICT"),
        primary_key=True,
        index=True,
    )
    author_order: Mapped[int] = mapped_column(
        SmallInteger,
        nullable=False,
        default=0,
        server_default=text("0"),
    )

    guideline: Mapped["Guideline"] = relationship(
        "Guideline",
        back_populates="guideline_authors",
    )
    author: Mapped["Author"] = relationship(
        "Author",
        back_populates="guideline_authors",
    )

    def __repr__(self) -> str:
        return (
            f"<GuidelineAuthor guideline_id={self.guideline_id} "
            f"author_id={self.author_id} order={self.author_order}>"
        )


guideline_authors = GuidelineAuthor.__table__
