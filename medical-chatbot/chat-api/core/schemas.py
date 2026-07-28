from typing import Any, TypedDict

from pydantic import BaseModel, Field


class ScientificIntentDecision(BaseModel):
    intent: str = Field(description="One of greeting, off_topic, text_to_sql, aggregate.")


class CatalogueFilters(BaseModel):
    """Only these fields may be used when building a catalogue query."""
    guideline_id: int | None = None
    chu_de: str | None = None
    loai_van_ban: str | None = None
    author: str | None = None
    doi_van_ban: str | None = None


class TopicDetail(BaseModel):
    name: str


class TopicRouteDecision(BaseModel):
    selected_topics: list[TopicDetail] = Field(default_factory=list)
    hypothetical_document: str = ""


class DocumentTypeRouteDecision(BaseModel):
    loai_van_ban: list[str] = Field(default_factory=list)


class DocumentContext(TypedDict):
    version_id: int
    guideline_id: int
    chu_de: str
    loai_van_ban: str
    authors: list[str]
    doc_rank: int
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
    selected_document_types: dict[str, list[str]]
    active_version_ids: list[int]
    hypothetical_document: str
    document_contexts: list[DocumentContext]
    document_reports: list[DocumentReport]
    topic_reports: list[dict[str, Any]]
    author_report_items: list[dict[str, Any]]
    response: str


# Temporary import aliases keep the running service loadable while the legacy
# medical nodes are migrated in subsequent changes.
SpecialtyDetail = TopicDetail
RouteDecision = TopicRouteDecision
SpecialtyDiseaseDecision = DocumentTypeRouteDecision


class ValidationResult(BaseModel):
    category: str = "aggregate"
    is_medical_related: bool = False
