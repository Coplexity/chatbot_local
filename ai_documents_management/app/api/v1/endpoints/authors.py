from fastapi import APIRouter, Depends, Query
from sqlalchemy import select

from app.api.deps import DBSession
from app.models.author import Author
from app.schemas.author import AuthorOut

router = APIRouter()


@router.get("", response_model=list[AuthorOut])
async def search_authors(
    db: DBSession,
    q: str = Query("", description="Từ khóa tìm kiếm tên tác giả"),
):
    """Tìm kiếm tác giả bằng từ khóa (Tự động gợi ý)."""
    stmt = select(Author)
    if q.strip():
        # Tìm kiếm không phân biệt hoa thường với ilike
        stmt = stmt.where(Author.full_name.ilike(f"%{q.strip()}%"))
    
    # Chỉ lấy tối đa 10 kết quả
    stmt = stmt.limit(10)
    
    result = await db.execute(stmt)
    return result.scalars().all()
