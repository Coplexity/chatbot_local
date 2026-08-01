import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def check():
    engine = create_async_engine('postgresql+asyncpg://postgres.mavjsgkxfrjytlozbnia:itsruiningmylife123%40@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres')
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT * FROM guidelines LIMIT 5"))
        print("Guidelines:", res.fetchall())
        res = await conn.execute(text("SELECT * FROM author LIMIT 5"))
        print("Authors:", res.fetchall())
        res = await conn.execute(text("SELECT * FROM guideline_authors LIMIT 5"))
        print("Guideline Authors:", res.fetchall())

asyncio.run(check())
