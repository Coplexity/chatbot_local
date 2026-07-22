from collections.abc import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings
from app.models import Base

engine = create_async_engine(
    settings.database_url,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    echo=settings.DEBUG,
    future=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that provides an async database session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def migrate_users_table_to_author_schema() -> None:
    """Rename the authentication table from users to author without losing data."""
    async with engine.begin() as conn:
        await conn.execute(
            text(
                """
                DO $$
                BEGIN
                    IF to_regclass('public.users') IS NOT NULL
                       AND to_regclass('public.author') IS NULL THEN
                        ALTER TABLE users RENAME TO author;
                    END IF;
                END $$;
                """
            )
        )


async def init_db_schema() -> None:
    """Create database tables if they do not exist."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def migrate_auth_schema_to_single_role() -> None:
    """
    Normalize auth schema to single-table RBAC on `author.role`.

    This keeps startup idempotent when code previously used roles/user_roles.
    """
    async with engine.begin() as conn:
        await conn.execute(
            text(
                """
                ALTER TABLE author
                ADD COLUMN IF NOT EXISTS role VARCHAR(20)
                NOT NULL DEFAULT 'viewer'
                """
            )
        )
        await conn.execute(
            text(
                """
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.tables
                        WHERE table_schema = 'public'
                          AND table_name = 'user_roles'
                    )
                    AND EXISTS (
                        SELECT 1
                        FROM information_schema.tables
                        WHERE table_schema = 'public'
                          AND table_name = 'roles'
                    ) THEN
                        UPDATE author AS u
                        SET role = r.name
                        FROM user_roles AS ur
                        JOIN roles AS r ON r.role_id = ur.role_id
                        WHERE u.user_id = ur.user_id
                          AND r.name IN ('admin', 'editor', 'viewer');
                    END IF;
                END $$;
                """
            )
        )
        await conn.execute(text("DROP TABLE IF EXISTS user_roles"))
        await conn.execute(text("DROP TABLE IF EXISTS roles"))


async def migrate_user_hierarchy_schema() -> None:
    """Move tenant scope from organizations to a user hierarchy."""
    async with engine.begin() as conn:
        await conn.execute(
            text(
                """
                ALTER TABLE author
                ADD COLUMN IF NOT EXISTS parent_id BIGINT
                """
            )
        )
        await conn.execute(
            text(
                """
                ALTER TABLE author
                ADD COLUMN IF NOT EXISTS created_by_user_id BIGINT
                """
            )
        )
        await conn.execute(
            text(
                """
                ALTER TABLE guidelines
                ADD COLUMN IF NOT EXISTS owner_user_id BIGINT
                """
            )
        )
        await conn.execute(
            text(
                """
                ALTER TABLE guidelines
                ADD COLUMN IF NOT EXISTS created_by_user_id BIGINT
                """
            )
        )
        await conn.execute(
            text(
                """
                ALTER TABLE documents
                ADD COLUMN IF NOT EXISTS owner_user_id BIGINT
                """
            )
        )
        await conn.execute(
            text(
                """
                ALTER TABLE documents
                ADD COLUMN IF NOT EXISTS created_by_user_id BIGINT
                """
            )
        )
        await conn.execute(
            text(
                """
                ALTER TABLE chunks
                ADD COLUMN IF NOT EXISTS owner_user_id BIGINT
                """
            )
        )
        await conn.execute(
            text(
                """
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM pg_constraint
                        WHERE conname = 'ck_users_role'
                          AND conrelid = 'author'::regclass
                    ) THEN
                        ALTER TABLE author DROP CONSTRAINT ck_users_role;
                    END IF;
                END $$;
                """
            )
        )
        await conn.execute(
            text(
                """
                UPDATE author
                SET role = CASE
                    WHEN lower(coalesce(role, '')) = 'admin' THEN 'admin'
                    WHEN lower(coalesce(role, '')) = 'hospital' THEN 'hospital'
                    WHEN lower(coalesce(role, '')) = 'doctor' THEN 'doctor'
                    WHEN lower(coalesce(role, '')) = 'author' THEN 'author'
                    WHEN lower(coalesce(role, '')) = 'health_department' THEN 'health_department'
                    ELSE 'health_department'
                END
                """
            )
        )
        await conn.execute(text("ALTER TABLE author ALTER COLUMN role SET DEFAULT 'health_department'"))
        await conn.execute(text("ALTER TABLE author ALTER COLUMN role SET NOT NULL"))
        await conn.execute(
            text(
                """
                ALTER TABLE author
                DROP CONSTRAINT IF EXISTS ck_author_role
                """
            )
        )
        await conn.execute(
            text(
                """
                ALTER TABLE author
                ADD CONSTRAINT ck_author_role
                CHECK (role IN ('admin', 'health_department', 'hospital', 'doctor', 'author'))
                """
            )
        )
        await conn.execute(
            text(
                """
                DO $$
                BEGIN
                    IF to_regclass('public.organizations') IS NOT NULL
                       AND EXISTS (
                            SELECT 1
                            FROM information_schema.columns
                            WHERE table_schema = 'public'
                              AND table_name = 'author'
                              AND column_name = 'organization_id'
                       ) THEN
                        EXECUTE $sql$
                            INSERT INTO author (email, full_name, password_hash, role, is_active)
                            SELECT
                                'unit-' || o.slug || '@local.invalid',
                                o.name,
                                'disabled',
                                'health_department',
                                false
                            FROM organizations AS o
                            WHERE NOT EXISTS (
                                SELECT 1
                                FROM author AS u
                                WHERE u.organization_id = o.organization_id
                                  AND u.role <> 'admin'
                            )
                            ON CONFLICT (email) DO NOTHING
                        $sql$;
                    END IF;
                END $$;
                """
            )
        )
        await conn.execute(
            text(
                """
                INSERT INTO author (email, full_name, password_hash, role, is_active)
                SELECT
                    'default-health-department@local.invalid',
                    'Default Health Department',
                    'disabled',
                    'health_department',
                    false
                WHERE EXISTS (SELECT 1 FROM guidelines WHERE owner_user_id IS NULL)
                  AND NOT EXISTS (SELECT 1 FROM author WHERE role = 'health_department')
                ON CONFLICT (email) DO NOTHING
                """
            )
        )
        await conn.execute(
            text(
                """
                DO $$
                BEGIN
                    IF to_regclass('public.organizations') IS NOT NULL
                       AND EXISTS (
                            SELECT 1
                            FROM information_schema.columns
                            WHERE table_schema = 'public'
                              AND table_name = 'author'
                              AND column_name = 'organization_id'
                       )
                       AND EXISTS (
                            SELECT 1
                            FROM information_schema.columns
                            WHERE table_schema = 'public'
                              AND table_name = 'guidelines'
                              AND column_name = 'organization_id'
                       ) THEN
                        EXECUTE $sql$
                            WITH org_owner AS (
                                SELECT DISTINCT ON (u.organization_id)
                                    u.organization_id,
                                    u.user_id
                                FROM author AS u
                                WHERE u.organization_id IS NOT NULL
                                  AND u.role <> 'admin'
                                ORDER BY u.organization_id, u.is_active DESC, u.user_id ASC
                            )
                            UPDATE guidelines AS g
                            SET owner_user_id = org_owner.user_id
                            FROM org_owner
                            WHERE g.organization_id = org_owner.organization_id
                              AND g.owner_user_id IS NULL
                        $sql$;
                    END IF;
                END $$;
                """
            )
        )
        await conn.execute(
            text(
                """
                WITH fallback_owner AS (
                    SELECT user_id
                    FROM author
                    WHERE role = 'health_department'
                    ORDER BY is_active DESC, user_id ASC
                    LIMIT 1
                )
                UPDATE guidelines
                SET owner_user_id = (SELECT user_id FROM fallback_owner)
                WHERE owner_user_id IS NULL
                """
            )
        )
        await conn.execute(
            text(
                """
                UPDATE guidelines
                SET created_by_user_id = owner_user_id
                WHERE created_by_user_id IS NULL
                """
            )
        )
        await conn.execute(
            text(
                """
                UPDATE documents AS d
                SET owner_user_id = g.owner_user_id,
                    created_by_user_id = COALESCE(d.created_by_user_id, g.created_by_user_id, g.owner_user_id)
                FROM guideline_versions AS v
                JOIN guidelines AS g ON g.guideline_id = v.guideline_id
                WHERE d.version_id = v.version_id
                  AND d.owner_user_id IS NULL
                """
            )
        )
        await conn.execute(
            text(
                """
                UPDATE chunks AS c
                SET owner_user_id = g.owner_user_id
                FROM guideline_versions AS v
                JOIN guidelines AS g ON g.guideline_id = v.guideline_id
                WHERE c.version_id = v.version_id
                  AND c.owner_user_id IS NULL
                """
            )
        )
        for table_name, column_name in (
            ("author", "parent_id"),
            ("author", "created_by_user_id"),
            ("guidelines", "owner_user_id"),
            ("guidelines", "created_by_user_id"),
            ("documents", "owner_user_id"),
            ("documents", "created_by_user_id"),
            ("chunks", "owner_user_id"),
        ):
            await conn.execute(
                text(
                    f"""
                    CREATE INDEX IF NOT EXISTS ix_{table_name}_{column_name}
                    ON {table_name} ({column_name})
                    """
                )
            )
        legacy_fk_specs = (
            ("author", "users_parent_id_fkey"),
            ("author", "users_created_by_user_id_fkey"),
            ("author", "author_parent_id_fkey"),
            ("author", "author_created_by_user_id_fkey"),
            ("guidelines", "guidelines_owner_user_id_fkey"),
            ("guidelines", "guidelines_created_by_user_id_fkey"),
            ("documents", "documents_owner_user_id_fkey"),
            ("documents", "documents_created_by_user_id_fkey"),
            ("chunks", "chunks_owner_user_id_fkey"),
        )
        for table_name, constraint_name in legacy_fk_specs:
            await conn.execute(
                text(
                    f"ALTER TABLE {table_name} "
                    f"DROP CONSTRAINT IF EXISTS {constraint_name}"
                )
            )

        fk_specs = (
            ("author", "parent_id", "fk_users_parent_id", "author", "user_id", "RESTRICT"),
            ("author", "created_by_user_id", "fk_users_created_by_user_id", "author", "user_id", "SET NULL"),
            ("guidelines", "owner_user_id", "fk_guidelines_owner_user_id", "author", "user_id", "RESTRICT"),
            ("guidelines", "created_by_user_id", "fk_guidelines_created_by_user_id", "author", "user_id", "SET NULL"),
            ("documents", "owner_user_id", "fk_documents_owner_user_id", "author", "user_id", "RESTRICT"),
            ("documents", "created_by_user_id", "fk_documents_created_by_user_id", "author", "user_id", "SET NULL"),
            ("chunks", "owner_user_id", "fk_chunks_owner_user_id", "author", "user_id", "RESTRICT"),
        )
        for table_name, column_name, constraint_name, ref_table, ref_column, on_delete in fk_specs:
            await conn.execute(
                text(
                    f"""
                    DO $$
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1
                            FROM pg_constraint
                            WHERE conname = '{constraint_name}'
                              AND conrelid = '{table_name}'::regclass
                        ) THEN
                            ALTER TABLE {table_name}
                            ADD CONSTRAINT {constraint_name}
                            FOREIGN KEY ({column_name})
                            REFERENCES {ref_table}({ref_column})
                            ON DELETE {on_delete};
                        END IF;
                    END $$;
                    """
                )
            )
        await conn.execute(text("ALTER TABLE guidelines ALTER COLUMN owner_user_id SET NOT NULL"))
        await conn.execute(text("ALTER TABLE documents ALTER COLUMN owner_user_id SET NOT NULL"))
        await conn.execute(text("ALTER TABLE chunks ALTER COLUMN owner_user_id SET NOT NULL"))
        for table_name in ("author", "guidelines", "documents", "chunks"):
            await conn.execute(text(f"ALTER TABLE {table_name} DROP CONSTRAINT IF EXISTS fk_{table_name}_organization_id"))
            await conn.execute(text(f"DROP INDEX IF EXISTS ix_{table_name}_organization_id"))
            await conn.execute(text(f"ALTER TABLE {table_name} DROP COLUMN IF EXISTS organization_id"))
        await conn.execute(text("DROP TABLE IF EXISTS organizations"))


async def migrate_sections_quality_schema() -> None:
    """Add minimal quality/page columns for section-level FE highlighting."""
    async with engine.begin() as conn:
        await conn.execute(
            text(
                """
                ALTER TABLE sections
                ADD COLUMN IF NOT EXISTS page_start INTEGER
                """
            )
        )
        await conn.execute(
            text(
                """
                ALTER TABLE sections
                ADD COLUMN IF NOT EXISTS page_end INTEGER
                """
            )
        )
        await conn.execute(
            text(
                """
                ALTER TABLE sections
                ADD COLUMN IF NOT EXISTS start_y DOUBLE PRECISION
                """
            )
        )
        await conn.execute(
            text(
                """
                ALTER TABLE sections
                ADD COLUMN IF NOT EXISTS end_y DOUBLE PRECISION
                """
            )
        )
        await conn.execute(
            text(
                """
                ALTER TABLE sections
                ADD COLUMN IF NOT EXISTS match_score DOUBLE PRECISION
                """
            )
        )
        await conn.execute(
            text(
                """
                ALTER TABLE sections
                ADD COLUMN IF NOT EXISTS is_suspect BOOLEAN
                NOT NULL DEFAULT FALSE
                """
            )
        )


async def migrate_sections_enriched_schema() -> None:
    """Add richer OCR/TOC metadata columns for section-level grounding."""
    async with engine.begin() as conn:
        await conn.execute(
            text(
                """
                ALTER TABLE sections
                ADD COLUMN IF NOT EXISTS node_id TEXT
                """
            )
        )
        await conn.execute(
            text(
                """
                ALTER TABLE sections
                ADD COLUMN IF NOT EXISTS intro_content TEXT
                """
            )
        )
        await conn.execute(
            text(
                """
                ALTER TABLE sections
                ADD COLUMN IF NOT EXISTS heading_bbox JSONB
                """
            )
        )
        await conn.execute(
            text(
                """
                ALTER TABLE sections
                ADD COLUMN IF NOT EXISTS content_bboxes JSONB
                """
            )
        )
        await conn.execute(
            text(
                """
                ALTER TABLE sections
                ADD COLUMN IF NOT EXISTS landing_chunks JSONB
                """
            )
        )


async def migrate_research_paper_schema() -> None:
    """Rename legacy guideline metadata and normalize multi-author paper data."""
    async with engine.begin() as conn:
        await conn.execute(
            text(
                """
                ALTER TABLE author
                    ADD COLUMN IF NOT EXISTS linh_vuc_nghien_cuu TEXT,
                    ADD COLUMN IF NOT EXISTS tom_tat_nghien_cuu TEXT
                """
            )
        )
        await conn.execute(
            text(
                """
                ALTER TABLE guidelines
                    ADD COLUMN IF NOT EXISTS loai_van_ban TEXT,
                    ADD COLUMN IF NOT EXISTS don_vi_ban_hanh TEXT,
                    ADD COLUMN IF NOT EXISTS chu_de TEXT,
                    ADD COLUMN IF NOT EXISTS abstract TEXT,
                    ADD COLUMN IF NOT EXISTS authors TEXT
                """
            )
        )
        await conn.execute(
            text(
                """
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema='public' AND table_name='guidelines' AND column_name='publisher'
                    ) THEN
                        EXECUTE $sql$
                            UPDATE guidelines
                            SET don_vi_ban_hanh = COALESCE(don_vi_ban_hanh, publisher)
                            WHERE publisher IS NOT NULL
                        $sql$;
                    END IF;
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema='public' AND table_name='guidelines' AND column_name='chuyen_khoa'
                    ) THEN
                        EXECUTE $sql$
                            UPDATE guidelines
                            SET chu_de = COALESCE(chu_de, chuyen_khoa)
                            WHERE chuyen_khoa IS NOT NULL
                        $sql$;
                    END IF;
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema='public' AND table_name='guidelines' AND column_name='ten_benh'
                    ) THEN
                        EXECUTE $sql$
                            UPDATE guidelines
                            SET chu_de = COALESCE(chu_de, ten_benh),
                                loai_van_ban = COALESCE(
                                    loai_van_ban,
                                    CASE
                                        WHEN lower(coalesce(don_vi_ban_hanh, '')) LIKE '%bộ%'
                                          OR lower(coalesce(don_vi_ban_hanh, '')) LIKE '%bo %'
                                        THEN 'Cấp trung ương'
                                        ELSE 'Cấp cơ sở'
                                    END
                                )
                            WHERE ten_benh IS NOT NULL
                        $sql$;
                    END IF;
                    IF to_regclass('public.authors') IS NOT NULL
                       AND to_regclass('public.guideline_authors') IS NOT NULL THEN
                        EXECUTE $sql$
                            UPDATE guidelines AS g
                            SET authors = regexp_split_to_array(source.author_names, '\\s*,\\s*')
                            FROM (
                                SELECT ga.guideline_id,
                                       string_agg(a.full_name, ', ' ORDER BY ga.author_order NULLS LAST, a.author_id) AS author_names
                                FROM guideline_authors AS ga
                                JOIN authors AS a ON a.author_id = ga.author_id
                                GROUP BY ga.guideline_id
                            ) AS source
                            WHERE g.guideline_id = source.guideline_id
                              AND g.authors IS NULL
                        $sql$;
                    END IF;
                END $$;
                """
            )
        )
        await conn.execute(
            text(
                """
                UPDATE guidelines
                SET loai_van_ban = CASE
                    WHEN lower(btrim(loai_van_ban)) IN ('cấp cơ sở', 'cap co so') THEN 'Cấp cơ sở'
                    WHEN lower(btrim(loai_van_ban)) IN ('cấp trung ương', 'cap trung uong') THEN 'Cấp trung ương'
                    WHEN loai_van_ban IS NULL OR btrim(loai_van_ban) = '' THEN 'Cấp cơ sở'
                    ELSE NULL
                END
                """
            )
        )
        await conn.execute(
            text(
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema='public'
                          AND table_name='guidelines'
                          AND column_name='authors'
                          AND data_type='ARRAY'
                    ) THEN
                        ALTER TABLE guidelines
                        ALTER COLUMN authors TYPE TEXT[]
                        USING CASE
                            WHEN authors IS NULL THEN NULL
                            ELSE regexp_split_to_array(authors::text, '\\s*,\\s*')
                        END;
                    END IF;
                END $$;
                """
            )
        )
        await conn.execute(text("ALTER TABLE guidelines DROP CONSTRAINT IF EXISTS ck_guidelines_loai_van_ban"))
        await conn.execute(
            text(
                """
                ALTER TABLE guidelines
                ADD CONSTRAINT ck_guidelines_loai_van_ban
                CHECK (loai_van_ban IN ('Cấp cơ sở', 'Cấp trung ương'))
                """
            )
        )
        await conn.execute(text("DROP TABLE IF EXISTS guideline_authors"))
        await conn.execute(text("DROP TABLE IF EXISTS authors"))
        await conn.execute(text("ALTER TABLE guidelines DROP COLUMN IF EXISTS ten_benh"))
        await conn.execute(text("ALTER TABLE guidelines DROP COLUMN IF EXISTS publisher"))
        await conn.execute(text("ALTER TABLE guidelines DROP COLUMN IF EXISTS chuyen_khoa"))


async def migrate_chunks_text_abstract_schema() -> None:
    """Add LLM summary column for chunk retrieval payloads."""
    async with engine.begin() as conn:
        await conn.execute(
            text(
                """
                ALTER TABLE chunks
                ADD COLUMN IF NOT EXISTS text_abstract TEXT
                """
            )
        )


async def migrate_documents_pipeline_mode_schema() -> None:
    """Add pipeline-mode metadata for uploaded documents."""
    async with engine.begin() as conn:
        await conn.execute(
            text(
                """
                ALTER TABLE documents
                ADD COLUMN IF NOT EXISTS pipeline_mode_used VARCHAR(30)
                """
            )
        )


async def migrate_documents_original_filename_schema() -> None:
    """Preserve the user-uploaded PDF filename so the OCR pipeline can pass it verbatim to the partner core (matches local CLI behaviour)."""
    async with engine.begin() as conn:
        await conn.execute(
            text(
                """
                ALTER TABLE documents
                ADD COLUMN IF NOT EXISTS original_filename TEXT
                """
            )
        )
