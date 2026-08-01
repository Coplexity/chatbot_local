import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def insert():
    engine = create_async_engine('postgresql+asyncpg://postgres.mavjsgkxfrjytlozbnia:itsruiningmylife123%40@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres')
    async with engine.begin() as conn:
        await conn.execute(text("INSERT INTO guideline_authors (guideline_id, author_id, author_order) VALUES (1, 1, 0)"))
        await conn.execute(text("INSERT INTO guideline_authors (guideline_id, author_id, author_order) VALUES (1, 2, 1)"))
        
asyncio.run(insert())
