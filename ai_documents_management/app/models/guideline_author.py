from sqlalchemy import BigInteger, Column, ForeignKey, SmallInteger, Table, text

from app.models.base import Base


# Bảng nối nhiều-nhiều: một paper/guideline có nhiều tác giả và một tác giả có
# thể tham gia nhiều paper. author_order giữ đúng thứ tự tên trên bài báo.
guideline_authors = Table(
    "guideline_authors",
    Base.metadata,
    Column(
        "guideline_id",
        BigInteger,
        ForeignKey("guidelines.guideline_id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "author_id",
        BigInteger,
        ForeignKey("author.author_id", ondelete="RESTRICT"),
        primary_key=True,
        index=True,
    ),
    Column(
        "author_order",
        SmallInteger,
        nullable=False,
        server_default=text("0"),
    ),
)
