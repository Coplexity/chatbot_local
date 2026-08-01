from sqlalchemy import Text, cast, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundException
from app.core.text_normalization import (
    VIETNAMESE_TRANSLATION_SOURCE,
    VIETNAMESE_TRANSLATION_TARGET,
    normalize_search_text,
)
from app.models.guideline import Guideline
from app.models.guideline_version import GuidelineVersion
from app.models.user import User
from app.models.author import Author
from app.models.guideline_author import GuidelineAuthor


class GuidelineQueryService:
    ACTIVE_STATUSES: tuple[str, ...] = ("active", "dang_hieu_luc", "đang hiệu lực")

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_guidelines(
        self,
        current_user: User,
        page: int,
        page_size: int,
        search: str | None = None,
        title: str | None = None,
        loai_van_ban: str | None = None,
        don_vi_ban_hanh: str | None = None,
        chu_de: str | None = None,
        authors: list[str] | None = None,
        owner_user_id: int | None = None,
    ) -> tuple[list[Guideline], dict[int, dict[str, object]], int]:
        filters = await self._build_guideline_filters(
            current_user=current_user,
            search=search,
            title=title,
            loai_van_ban=loai_van_ban,
            don_vi_ban_hanh=don_vi_ban_hanh,
            chu_de=chu_de,
            authors=authors,
            owner_user_id=owner_user_id,
        )
        offset = (page - 1) * page_size

        total_stmt = select(func.count(Guideline.guideline_id.distinct())).select_from(Guideline)
        if self._needs_author_join(search, authors):
            total_stmt = total_stmt.join(GuidelineAuthor, Guideline.guideline_id == GuidelineAuthor.guideline_id, isouter=True)
            total_stmt = total_stmt.join(Author, GuidelineAuthor.author_id == Author.author_id, isouter=True)
        total_stmt = total_stmt.where(*filters)
        total = int((await self.db.execute(total_stmt)).scalar_one())

        guidelines_stmt = (
            select(Guideline)
            .options(selectinload(Guideline.owner), selectinload(Guideline.guideline_authors).selectinload(GuidelineAuthor.author))
        )
        if self._needs_author_join(search, authors):
            guidelines_stmt = guidelines_stmt.join(GuidelineAuthor, Guideline.guideline_id == GuidelineAuthor.guideline_id, isouter=True)
            guidelines_stmt = guidelines_stmt.join(Author, GuidelineAuthor.author_id == Author.author_id, isouter=True)

        guidelines_stmt = guidelines_stmt.where(*filters).order_by(Guideline.guideline_id.desc()).offset(offset).limit(page_size)
        
        # Need to use distinct if joining
        if self._needs_author_join(search, authors):
            guidelines = list((await self.db.execute(guidelines_stmt)).unique().scalars().all())
        else:
            guidelines = list((await self.db.execute(guidelines_stmt)).scalars().all())

        guideline_ids = [guideline.guideline_id for guideline in guidelines]
        active_versions = await self._get_active_versions(guideline_ids)
        return guidelines, active_versions, total

    async def list_guideline_versions(
        self,
        current_user: User,
        guideline_id: int,
        page: int,
        page_size: int,
        status: str | None = None,
    ) -> tuple[list[GuidelineVersion], int]:
        guideline_exists = (
            await self.db.execute(
                select(Guideline.guideline_id).where(
                    Guideline.guideline_id == guideline_id,
                    *(await self._build_tenant_filters(current_user=current_user)),
                )
            )
        ).scalar_one_or_none()
        if guideline_exists is None:
            raise NotFoundException("Guideline", guideline_id)

        filters = [GuidelineVersion.guideline_id == guideline_id]
        if status and status.strip():
            normalized_status = status.strip().lower()
            filters.append(
                func.lower(func.coalesce(GuidelineVersion.status, ""))
                == normalized_status
            )

        offset = (page - 1) * page_size

        total_stmt = select(func.count()).select_from(GuidelineVersion).where(*filters)
        total = int((await self.db.execute(total_stmt)).scalar_one())

        versions_stmt = (
            select(GuidelineVersion)
            .where(*filters)
            .order_by(
                GuidelineVersion.release_date.desc().nullslast(),
                GuidelineVersion.version_id.desc(),
            )
            .offset(offset)
            .limit(page_size)
        )
        versions = list((await self.db.execute(versions_stmt)).scalars().all())
        return versions, total
        
    def _needs_author_join(self, search: str | None, authors: list[str] | None) -> bool:
        return bool(normalize_search_text(search)) or bool(authors)

    async def _build_guideline_filters(
        self,
        current_user: User,
        search: str | None,
        title: str | None,
        loai_van_ban: str | None,
        don_vi_ban_hanh: str | None,
        chu_de: str | None,
        authors: list[str] | None,
        owner_user_id: int | None,
    ) -> list[object]:
        filters: list[object] = await self._build_tenant_filters(
            current_user=current_user,
            owner_user_id=owner_user_id,
        )

        normalized_search = normalize_search_text(search)
        if normalized_search:
            keyword = f"%{normalized_search}%"
            filters.append(
                or_(
                    self._normalized_text_expr(Guideline.title).like(keyword),
                    self._normalized_text_expr(Guideline.loai_van_ban).like(keyword),
                    self._normalized_text_expr(Guideline.don_vi_ban_hanh).like(keyword),
                    self._normalized_text_expr(Guideline.chu_de).like(keyword),
                    self._normalized_text_expr(Guideline.abstract).like(keyword),
                    self._normalized_text_expr(Author.full_name).like(keyword),
                )
            )
        self._append_normalized_contains_filter(filters=filters, column=Guideline.title, value=title)
        self._append_normalized_contains_filter(filters=filters, column=Guideline.loai_van_ban, value=loai_van_ban)
        self._append_normalized_contains_filter(filters=filters, column=Guideline.don_vi_ban_hanh, value=don_vi_ban_hanh)
        self._append_normalized_contains_filter(filters=filters, column=Guideline.chu_de, value=chu_de)
        if authors:
            author_search = ", ".join(authors)
            self._append_normalized_contains_filter(
                filters=filters,
                column=Author.full_name,
                value=author_search,
            )

        return filters

    async def _build_tenant_filters(
        self,
        *,
        current_user: User,
        owner_user_id: int | None = None,
    ) -> list[object]:
        if owner_user_id is not None:
            return [Guideline.owner_user_id == owner_user_id]
        return []

    def _append_normalized_contains_filter(
        self,
        *,
        filters: list[object],
        column,
        value: str | None,
    ) -> None:
        normalized_value = normalize_search_text(value)
        if not normalized_value:
            return
        filters.append(self._normalized_text_expr(column).like(f"%{normalized_value}%"))

    def _normalized_text_expr(self, column):
        lowered = func.lower(func.coalesce(column, ""))
        translated = func.translate(
            lowered,
            VIETNAMESE_TRANSLATION_SOURCE,
            VIETNAMESE_TRANSLATION_TARGET,
        )
        return func.regexp_replace(translated, r"[^a-z0-9]+", "", "g")

    async def get_filter_options(
        self,
        current_user: User,
        owner_user_id: int | None = None,
    ) -> dict[str, list[str]]:
        tenant_filters = await self._build_tenant_filters(
            current_user=current_user,
            owner_user_id=owner_user_id,
        )
        async def distinct_values(column) -> list[str]:
            stmt = (
                select(column)
                .where(*tenant_filters)
                .where(column.isnot(None))
                .where(column != "")
                .distinct()
                .order_by(column)
            )
            return list((await self.db.execute(stmt)).scalars().all())

        return {
            "loai_van_bans": await distinct_values(Guideline.loai_van_ban),
            "don_vi_ban_hanhs": await distinct_values(Guideline.don_vi_ban_hanh),
            "chu_des": await distinct_values(Guideline.chu_de),
            "authors": list(
                (
                    await self.db.execute(
                        select(Author.full_name)
                        .join(GuidelineAuthor, GuidelineAuthor.author_id == Author.author_id)
                        .join(Guideline, Guideline.guideline_id == GuidelineAuthor.guideline_id)
                        .where(*tenant_filters)
                        .where(Author.full_name.isnot(None))
                        .distinct()
                        .order_by(Author.full_name)
                    )
                ).scalars().all()
            ),
        }

    async def _get_active_versions(
        self,
        guideline_ids: list[int],
    ) -> dict[int, dict[str, object]]:
        if not guideline_ids:
            return {}

        ranked_active_versions = (
            select(
                GuidelineVersion.guideline_id.label("guideline_id"),
                GuidelineVersion.version_id.label("version_id"),
                GuidelineVersion.version_label.label("version_label"),
                GuidelineVersion.status.label("status"),
                GuidelineVersion.release_date.label("release_date"),
                GuidelineVersion.effective_from.label("effective_from"),
                GuidelineVersion.effective_to.label("effective_to"),
                func.row_number()
                .over(
                    partition_by=GuidelineVersion.guideline_id,
                    order_by=(
                        GuidelineVersion.release_date.desc().nullslast(),
                        GuidelineVersion.version_id.desc(),
                    ),
                )
                .label("rn"),
            )
            .where(GuidelineVersion.guideline_id.in_(guideline_ids))
            .where(
                func.lower(func.coalesce(GuidelineVersion.status, "")).in_(
                    self.ACTIVE_STATUSES
                )
            )
            .subquery()
        )

        rows = (
            await self.db.execute(
                select(ranked_active_versions).where(ranked_active_versions.c.rn == 1)
            )
        ).mappings().all()
        return {
            int(row["guideline_id"]): {
                "version_id": row["version_id"],
                "version_label": row["version_label"],
                "status": row["status"],
                "release_date": row["release_date"],
                "effective_from": row["effective_from"],
                "effective_to": row["effective_to"],
            }
            for row in rows
        }
