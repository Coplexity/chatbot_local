import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from app.models import Base

async def init_db():
    engine = create_async_engine('postgresql+asyncpg://postgres:postgres@db:5432/guideline_management')
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

asyncio.run(init_db())
