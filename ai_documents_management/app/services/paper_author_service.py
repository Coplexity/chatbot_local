from sqlalchemy import delete, func, insert, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.author import Author
from app.models.guideline_author import guideline_authors


class PaperAuthorService:
    """Keep the normalized paper-author relation in sync with guidelines.authors."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def sync_guideline_authors(
        self,
        *,
        guideline_id: int,
        author_names: list[str] | None,
    ) -> None:
        await self.db.execute(
            delete(guideline_authors).where(
                guideline_authors.c.guideline_id == guideline_id
            )
        )

        for author_order, full_name in enumerate(author_names or []):
            author = (
                await self.db.execute(
                    select(Author)
                    .where(
                        func.lower(func.btrim(Author.full_name))
                        == full_name.casefold()
                    )
                    .order_by(Author.author_id)
                    .limit(1)
                )
            ).scalar_one_or_none()
            if author is None:
                author = Author(full_name=full_name, is_active=True)
                self.db.add(author)
                await self.db.flush()

            await self.db.execute(
                insert(guideline_authors).values(
                    guideline_id=guideline_id,
                    author_id=author.author_id,
                    author_order=author_order,
                )
            )
