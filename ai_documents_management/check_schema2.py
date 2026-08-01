import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def check():
    engine = create_async_engine('postgresql+asyncpg://postgres.mavjsgkxfrjytlozbnia:itsruiningmylife123%40@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres')
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='author'"))
        columns = [f"{r[0]}: {r[1]} (nullable: {r[2]})" for r in res.fetchall()]
        print("author columns:")
        for c in columns:
            print(c)

asyncio.run(check())
