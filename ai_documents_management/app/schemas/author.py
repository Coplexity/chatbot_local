from pydantic import BaseModel, ConfigDict


class AuthorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    author_id: int
    full_name: str
    hoc_ham: str | None = None
