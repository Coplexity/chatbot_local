from pydantic import BaseModel, Field


class ChatStreamRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Cau hoi y khoa cua nguoi dung")
    user_id: int | None = Field(
        default=None,
        description="ID nguoi dung de loc guidelines theo guidelines.owner_user_id.",
    )
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
