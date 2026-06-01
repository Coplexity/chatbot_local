from pydantic import BaseModel, Field, validator


class ChatStreamRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Cau hoi y khoa cua nguoi dung")
    user_ids: int | str | None = Field(
        default=1,
        description=(
            "Danh sach ID nguoi dung de loc guidelines theo guidelines.owner_user_id. "
            "Neu backend khong truyen gia tri hoac truyen chuoi rong thi mac dinh user_ids=1. "
            "Co the la so (vd: 1) hoac chuoi phan tach dau phay (vd: '1,2,3')."
        ),
    )

    @validator("user_ids", pre=True, always=True)
    def default_empty_user_ids(cls, value: int | str | None) -> int | str:
        if value is None:
            return 1
        if isinstance(value, str) and not value.strip():
            return 1
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
