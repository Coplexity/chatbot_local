import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.security import get_password_hash
from sqlalchemy import text

async def reset_password():
    engine = create_async_engine('postgresql+asyncpg://postgres.mavjsgkxfrjytlozbnia:itsruiningmylife123%40@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres')
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    
    async with async_session() as session:
        pass_hash = get_password_hash('ChangeMe123!')
        await session.execute(text("UPDATE users SET password_hash = :hash WHERE email = 'admin@example.com'"), {'hash': pass_hash})
        await session.commit()
        print("Password reset successfully.")

asyncio.run(reset_password())
