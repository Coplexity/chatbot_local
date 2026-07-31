from pydantic import BaseModel, Field, validator


class ChatStreamRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Cau hoi y khoa cua nguoi dung")
    user_ids: int | str | list[int | str] | None = Field(
        default=None,
        description=(
            "Danh sach ID nguoi dung de loc guidelines theo guidelines.owner_user_id. "
            "Neu backend khong truyen gia tri, truyen chuoi rong hoac mang rong thi chat-api se lay admin user_ids tu DB. "
            "Co the la so (vd: 1), chuoi phan tach dau phay (vd: '1,2,3') hoac mang ID."
        ),
    )

    @validator("user_ids", pre=True, always=True)
    def normalize_empty_user_ids(cls, value: int | str | list[int | str] | None) -> int | str | None:
        if value is None:
            return None
        if isinstance(value, str) and not value.strip():
            return None
        if isinstance(value, list):
            user_ids = [str(user_id).strip() for user_id in value if str(user_id).strip()]
            return ",".join(user_ids) if user_ids else None
        return value

    role: str = Field(
        default="",
        description="Vai tro nguoi dung tu frontend. role='bac_si_tramyte' se bat shortcut luong tram_y_te.",
    )
    mode: str = Field(
        default="basic",
        description="Che do tra loi: 'basic' hoac 'deep'. Mac dinh la 'basic'.",
    )


class HealthResponse(BaseModel):
    status: str
