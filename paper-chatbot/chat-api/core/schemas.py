from typing import Any, TypedDict

from pydantic import BaseModel, Field
    
class CatalogueFilters(BaseModel):
    """Only these fields may be used when building a catalogue query."""
    guideline_id: int | None = None
    chu_de: str | None = None
    loai_van_ban: str | None = None
    author: str | None = None


class TopicDetail(BaseModel):
    name: str


class TopicRouteDecision(BaseModel):
    analyzed_topics: list[TopicDetail] = Field(default_factory=list)
    hypothetical_document: str = Field(
        default="",
        description="2-3 câu HyDE học thuật phục vụ truy xuất, dựa trên kiến thức chung, không bịa dữ kiện.",
    )


class DocumentContext(TypedDict):
    version_id: int
    guideline_id: int
    chu_de: str
    authors: list[str]
    context: str


class DocumentReport(DocumentContext):
    report: str


class RouterState(TypedDict, total=False):
    query: str
    user_ids: int | str | list[int | str] | None
    role: str
    intent: str
    filtered_guideline_ids: list[int]
    filtered_topics: list[str]
    selected_topics: list[dict[str, str]]
    active_version_ids: list[int]
    document_contexts: list[DocumentContext]
    document_reports: list[DocumentReport]
    topic_reports: list[dict[str, Any]]
    response: str


class ValidationResult(BaseModel):
    intent: str = Field(description="One of greeting, off_topic, text_to_sql, aggregate.")

class ExtractedFilter(BaseModel):
    authors: list[str] = Field(default_factory=list)
    chu_de: list[str] = Field(default_factory=list)
    guideline_titles: list[str] = Field(default_factory=list)


class TextToSqlDecision(BaseModel):
    sql: str
    filter: ExtractedFilter
    intent: str = Field(default="", description="Loại thao tác: tìm kiếm/đếm/liệt kê...")
