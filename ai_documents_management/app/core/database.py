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
    """Provide one transactional database session for each request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def validate_database_schema() -> None:
    """Check the existing schema without creating, altering, or deleting anything.

    Database migrations are deliberately not executed during application startup.
    The shared Supabase database is already initialized, so startup only verifies
    that every table and column required by the current SQLAlchemy models exists.
    """
    required_columns = {
        table.name: {column.name for column in table.columns}
        for table in Base.metadata.sorted_tables
    }

    async with engine.connect() as conn:
        rows = (
            await conn.execute(
                text(
                    """
                    SELECT table_name, column_name
                    FROM information_schema.columns
                    WHERE table_schema = current_schema()
                    """
                )
            )
        ).all()

    actual_columns: dict[str, set[str]] = {}
    for table_name, column_name in rows:
        actual_columns.setdefault(str(table_name), set()).add(str(column_name))

    missing_tables = sorted(set(required_columns) - set(actual_columns))
    missing_columns = {
        table_name: sorted(columns - actual_columns.get(table_name, set()))
        for table_name, columns in required_columns.items()
        if table_name in actual_columns
        and columns - actual_columns.get(table_name, set())
    }

    if missing_tables or missing_columns:
        details: list[str] = []
        if missing_tables:
            details.append("missing tables: " + ", ".join(missing_tables))
        if missing_columns:
            formatted_columns = "; ".join(
                f"{table}: {', '.join(columns)}"
                for table, columns in sorted(missing_columns.items())
            )
            details.append("missing columns: " + formatted_columns)
        raise RuntimeError(
            "Database schema is not compatible with this application ("
            + " | ".join(details)
            + "). Apply a reviewed SQL migration manually; application startup "
            "will not modify the database."
        )
