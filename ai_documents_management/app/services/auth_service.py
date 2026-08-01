from __future__ import annotations

import re
import unicodedata

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import (
    BadRequestException,
    ConflictException,
    NotFoundException,
    UnprocessableEntityException,
)
from app.core.security import get_password_hash, verify_password
from app.models.user import User


class AuthService:
    ROLE_ADMIN = "admin"
    ROLE_STAFF = "staff"

    ROLE_DESCRIPTIONS: dict[str, str] = {
        ROLE_ADMIN: "Full access to all accounts and documents. Can create staff accounts.",
        ROLE_STAFF: "Can read all documents. Can manage own uploaded documents.",
    }
    ROLE_ORDER: tuple[str, ...] = (
        ROLE_ADMIN,
        ROLE_STAFF,
    )

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    @classmethod
    def get_available_roles(cls, current_user: User | None = None) -> list[dict[str, str]]:
        if current_user is None or current_user.role == cls.ROLE_ADMIN:
            role_names = cls.ROLE_ORDER
        else:
            role_names = ()
        return [
            {"name": role_name, "description": cls.ROLE_DESCRIPTIONS[role_name]}
            for role_name in role_names
        ]

    @staticmethod
    def normalize_email(email: str) -> str:
        return email.strip().lower()

    @classmethod
    def normalize_role(cls, role: str) -> str:
        normalized = role.strip().lower()
        if normalized not in cls.ROLE_DESCRIPTIONS:
            raise BadRequestException(
                "Unknown role. Allowed values: admin, staff."
            )
        return normalized

    async def get_user_by_email(self, email: str) -> User | None:
        normalized_email = self.normalize_email(email)
        stmt = (
            select(User)
            .options(selectinload(User.parent))
            .where(User.email == normalized_email)
        )
        return (await self.db.execute(stmt)).scalar_one_or_none()

    async def get_user_by_id(self, user_id: int) -> User | None:
        stmt = (
            select(User)
            .options(selectinload(User.parent))
            .where(User.user_id == user_id)
        )
        return (await self.db.execute(stmt)).scalar_one_or_none()

    async def list_users(self, current_user: User) -> list[User]:
        stmt = (
            select(User)
            .options(selectinload(User.parent))
            .order_by(User.role.asc(), User.user_id.asc())
        )
        users = list((await self.db.execute(stmt)).scalars().all())
        if current_user.role == self.ROLE_ADMIN:
            return users
        
        # Staff can only see themselves in user list (or maybe we don't allow them to list users)
        return [user for user in users if int(user.user_id) == int(current_user.user_id)]

    async def authenticate_user(self, email: str, password: str) -> User | None:
        user = await self.get_user_by_email(email)
        if user is None:
            return None
        if not verify_password(password, user.password_hash):
            return None
        return user

    async def ensure_default_admin(
        self,
        email: str,
        password: str,
        full_name: str,
    ) -> User | None:
        normalized_email = self.normalize_email(email)
        if not normalized_email or not password:
            return None

        user = await self.get_user_by_email(normalized_email)
        if user is None:
            user = User(
                email=normalized_email,
                full_name=full_name.strip() if full_name else "System Admin",
                password_hash=get_password_hash(password),
                role=self.ROLE_ADMIN,
                parent_id=None,
                is_active=True,
            )
            self.db.add(user)
            await self.db.flush()
            return await self.get_user_by_id(user.user_id)

        if user.role != self.ROLE_ADMIN or user.parent_id is not None:
            user.role = self.ROLE_ADMIN
            user.parent_id = None
            await self.db.flush()
        return user

    async def create_user(
        self,
        *,
        current_user: User,
        email: str,
        password: str,
        role: str,
        full_name: str | None = None,
        is_active: bool = True,
        **kwargs,
    ) -> User:
        normalized_email = self.normalize_email(email)
        if await self.get_user_by_email(normalized_email):
            raise ConflictException(
                f"User with email '{normalized_email}' already exists."
            )

        normalized_role = self.normalize_role(role)
        self._ensure_can_create_role(current_user=current_user, role=normalized_role)
        
        normalized_full_name = full_name.strip() if full_name else ""
        if not normalized_full_name and normalized_role != self.ROLE_ADMIN:
            raise BadRequestException("Display name is required.")

        user = User(
            email=normalized_email,
            password_hash=get_password_hash(password),
            full_name=normalized_full_name,
            role=normalized_role,
            parent_id=int(current_user.user_id) if normalized_role != self.ROLE_ADMIN else None,
            created_by_user_id=int(current_user.user_id),
            is_active=is_active,
        )
        self.db.add(user)
        await self.db.flush()
        created_user = await self.get_user_by_id(user.user_id)
        if created_user is None:
            raise UnprocessableEntityException("Cannot load created user.")
        return created_user

    async def update_user_role(
        self,
        *,
        current_user: User,
        user_id: int,
        role: str,
        is_active: bool | None = None,
        **kwargs,
    ) -> User:
        user = await self.get_user_by_id(user_id)
        if user is None:
            raise NotFoundException("User", user_id)
        if int(user.user_id) == int(current_user.user_id):
            raise BadRequestException("Cannot change your own role from this screen.")

        normalized_role = self.normalize_role(role)
        self._ensure_can_manage_user(current_user=current_user, target_user=user)
        self._ensure_can_create_role(current_user=current_user, role=normalized_role)

        user.role = normalized_role
        if is_active is not None:
            user.is_active = bool(is_active)
        await self.db.flush()
        updated_user = await self.get_user_by_id(user_id)
        if updated_user is None:
            raise UnprocessableEntityException("Cannot load updated user.")
        return updated_user

    def _ensure_can_create_role(self, *, current_user: User, role: str) -> None:
        if current_user.role == self.ROLE_ADMIN:
            return
        raise BadRequestException("Current account cannot create or assign this role.")

    def _ensure_can_manage_user(self, *, current_user: User, target_user: User) -> None:
        if current_user.role == self.ROLE_ADMIN:
            return
        raise NotFoundException("User", target_user.user_id)
