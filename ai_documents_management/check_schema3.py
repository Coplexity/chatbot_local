import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def check():
    engine = create_async_engine('postgresql+asyncpg://postgres.mavjsgkxfrjytlozbnia:itsruiningmylife123%40@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres')
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT column_name, column_default FROM information_schema.columns WHERE table_name='author' and column_name='role'"))
        columns = [f"{r[0]}: {r[1]}" for r in res.fetchall()]
        for c in columns:
            print(c)

asyncio.run(check())
