import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.guideline import Guideline
from app.models.guideline_author import GuidelineAuthor

async def check():
    engine = create_async_engine('postgresql+asyncpg://postgres.mavjsgkxfrjytlozbnia:itsruiningmylife123%40@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres')
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    
    async with async_session() as session:
        stmt = select(Guideline).options(selectinload(Guideline.guideline_authors).selectinload(GuidelineAuthor.author)).limit(1)
        result = await session.execute(stmt)
        guideline = result.scalars().first()
        
        if guideline:
            print("Guideline Authors Property:", guideline.authors)
        else:
            print("No guideline found")

asyncio.run(check())
