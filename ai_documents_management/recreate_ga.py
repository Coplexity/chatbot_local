import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.models.base import Base
# Import all models to register them with Base
from app.models.user import User
from app.models.author import Author
from app.models.guideline import Guideline
from app.models.guideline_author import GuidelineAuthor
from app.models.document import Document
from app.models.chunk import Chunk

async def check():
    engine = create_async_engine('postgresql+asyncpg://postgres.mavjsgkxfrjytlozbnia:itsruiningmylife123%40@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres')
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        print("Created all tables!")

asyncio.run(check())
