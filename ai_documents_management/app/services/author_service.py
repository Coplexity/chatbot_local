import json
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException
from app.models.author import Author
from app.models.guideline_author import GuidelineAuthor


class AuthorService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def sync_authors_to_guideline(
        self,
        guideline_id: int,
        authors_data: list[dict[str, Any]] | None,
    ) -> None:
        """
        Sync a list of author data (full_name, hoc_ham) to a guideline.
        """
        if authors_data is None:
            return

        # 1. Parse and validate authors
        parsed_authors = []
        for a in authors_data:
            full_name = str(a.get("full_name", "")).strip()
            if not full_name:
                continue
            hoc_ham = a.get("hoc_ham")
            if hoc_ham:
                hoc_ham = str(hoc_ham).strip()
            parsed_authors.append({"full_name": full_name, "hoc_ham": hoc_ham or None})

        # Remove duplicates while preserving order
        unique_authors = []
        seen = set()
        for a in parsed_authors:
            key = (a["full_name"], a["hoc_ham"])
            if key not in seen:
                seen.add(key)
                unique_authors.append(a)

        # 2. Delete existing guideline_authors for this guideline
        await self.db.execute(
            delete(GuidelineAuthor).where(GuidelineAuthor.guideline_id == guideline_id)
        )

        if not unique_authors:
            return

        # 3. Find or create Author records, then link them
        for index, author_dict in enumerate(unique_authors):
            full_name = author_dict["full_name"]
            hoc_ham = author_dict["hoc_ham"]

            # Try to find existing author
            stmt = select(Author).where(Author.full_name == full_name)
            if hoc_ham:
                stmt = stmt.where(Author.hoc_ham == hoc_ham)
            else:
                stmt = stmt.where(Author.hoc_ham.is_(None))
                
            author = (await self.db.execute(stmt)).scalar_one_or_none()
            if not author:
                author = Author(full_name=full_name, hoc_ham=hoc_ham)
                self.db.add(author)
                await self.db.flush() # get author_id

            # Create link
            guideline_author = GuidelineAuthor(
                guideline_id=guideline_id,
                author_id=author.author_id,
                author_order=index,
            )
            self.db.add(guideline_author)

    def parse_authors_json(self, authors_json: str | None) -> list[dict[str, Any]] | None:
        if not authors_json or not authors_json.strip():
            return None
        try:
            parsed = json.loads(authors_json)
            if not isinstance(parsed, list):
                raise BadRequestException("Authors must be a JSON array.")
            return parsed
        except json.JSONDecodeError:
            raise BadRequestException("Invalid JSON format for authors.")
