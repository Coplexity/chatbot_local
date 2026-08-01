import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def drop_constraint():
    engine = create_async_engine('postgresql+asyncpg://postgres.mavjsgkxfrjytlozbnia:itsruiningmylife123%40@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres')
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE author DROP CONSTRAINT IF EXISTS ck_author_hoc_ham"))

asyncio.run(drop_constraint())
