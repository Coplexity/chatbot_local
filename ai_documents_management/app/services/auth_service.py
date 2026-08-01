from __future__ import annotations

from sqlalchemy import select
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
        ROLE_ADMIN: "Full access to all accounts and documents.",
        ROLE_STAFF: "Staff account with access to owned documents.",
    }
    ROLE_ORDER: tuple[str, ...] = (
        ROLE_ADMIN,
        ROLE_STAFF,
    )

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    @classmethod
    def get_available_roles(cls, current_user: User | None = None) -> list[dict[str, str]]:
        role_names = cls.ROLE_ORDER if current_user is None or current_user.role == cls.ROLE_ADMIN else ()
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
        legacy_role_map = {
            "user": cls.ROLE_STAFF,
            "editor": cls.ROLE_STAFF,
            "viewer": cls.ROLE_STAFF,
            "health_department": cls.ROLE_STAFF,
            "hospital": cls.ROLE_STAFF,
            "doctor": cls.ROLE_STAFF,
        }
        normalized = legacy_role_map.get(normalized, normalized)
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
            .order_by(User.role.asc(), User.parent_id.asc().nullsfirst(), User.user_id.asc())
        )
        users = list((await self.db.execute(stmt)).scalars().all())
        if current_user.role == self.ROLE_ADMIN:
            return users

        allowed_ids = self._collect_descendant_ids(users, int(current_user.user_id))
        allowed_ids.add(int(current_user.user_id))
        return [user for user in users if int(user.user_id) in allowed_ids]

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
        parent_id: int | None = None,
        parent_name: str | None = None,
        parent_parent_id: int | None = None,
        is_active: bool = True,
    ) -> User:
        normalized_email = self.normalize_email(email)
        if await self.get_user_by_email(normalized_email):
            raise ConflictException(
                f"User with email '{normalized_email}' already exists."
            )

        normalized_role = self.normalize_role(role)
        self._ensure_can_create_role(current_user=current_user, role=normalized_role)
        resolved_parent_id = await self._resolve_parent_id_for_role(
            current_user=current_user,
            role=normalized_role,
            parent_id=parent_id,
            parent_name=parent_name,
            parent_parent_id=parent_parent_id,
        )
        normalized_full_name = self._normalize_display_name(full_name, role=normalized_role)

        user = User(
            email=normalized_email,
            password_hash=get_password_hash(password),
            full_name=normalized_full_name,
            role=normalized_role,
            parent_id=resolved_parent_id,
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
        parent_id: int | None = None,
        parent_name: str | None = None,
        parent_parent_id: int | None = None,
        is_active: bool | None = None,
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
        user.parent_id = await self._resolve_parent_id_for_role(
            current_user=current_user,
            role=normalized_role,
            parent_id=parent_id,
            parent_name=parent_name,
            parent_parent_id=parent_parent_id,
        )
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
        raise BadRequestException("Current account cannot create or assign roles.")

    def _ensure_can_manage_user(self, *, current_user: User, target_user: User) -> None:
        if current_user.role == self.ROLE_ADMIN:
            return
        raise NotFoundException("User", target_user.user_id)

    async def _resolve_parent_id_for_role(
        self,
        *,
        current_user: User,
        role: str,
        parent_id: int | None,
        parent_name: str | None,
        parent_parent_id: int | None,
    ) -> int | None:
        return None

    def _normalize_display_name(self, full_name: str | None, *, role: str) -> str | None:
        value = full_name.strip() if full_name else ""
        if value:
            return value
        if role == self.ROLE_ADMIN:
            return None
        raise BadRequestException("Display name is required for non-admin accounts.")

    def _collect_descendant_ids(self, users: list[User], root_user_id: int) -> set[int]:
        children_by_parent: dict[int, list[int]] = {}
        for user in users:
            if user.parent_id is None:
                continue
            children_by_parent.setdefault(int(user.parent_id), []).append(int(user.user_id))

        descendants: set[int] = set()
        stack = list(children_by_parent.get(root_user_id, []))
        while stack:
            user_id = stack.pop()
            if user_id in descendants:
                continue
            descendants.add(user_id)
            stack.extend(children_by_parent.get(user_id, []))
        return descendants

