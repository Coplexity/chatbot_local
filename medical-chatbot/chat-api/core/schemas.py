from typing import TypedDict, List, Dict
from pydantic import BaseModel, Field


class DocumentContext(TypedDict):
    document_id: str
    disease_name: str
    specialty: str
    doc_rank: int
    context: str


class DocumentReport(TypedDict):
    document_id: str
    disease_name: str
    specialty: str
    doc_rank: int
    report: str


class DiseaseReport(TypedDict):
    disease_name: str
    specialty: str
    report: str
    source_document_ids: List[str]


class SpecialtyReport(TypedDict):
    specialty: str
    report: str
    disease_names: List[str]


class RouterState(TypedDict):
    query: str
    user_ids: int | str | None
    role: str
    is_medical_related: bool
    validation_category: str  # "greeting", "medical", "off_topic"
    filtered_guideline_ids: list
    filtered_specialties: list
    analyzed_specialties: list
    routed_diseases: Dict[str, List[str]]
    active_version_ids: list
    hypothetical_document: str
    specialty_contexts: Dict[str, str]
    document_contexts: List[DocumentContext]
    specialty_reports: Dict[str, str]
    document_reports: List[DocumentReport]
    disease_reports: List[DiseaseReport]
    specialty_report_items: List[SpecialtyReport]
    response: str
    response_raw: str

class SpecialtyDetail(BaseModel):
    name: str = Field(description="Tên chuyên khoa nằm trong danh sách chuyen_khoa lấy động từ database (guidelines.chuyen_khoa).")

class RouteDecision(BaseModel):
    detected_intent: str = Field(description="Loại input được phát hiện: SYMPTOM_BASED, DISEASE_BASED, TREATMENT_BASED, GENERAL_INFO_BASED, DIAGNOSTIC_BASED, hoặc PROGNOSIS_BASED.")
    routing_reasoning: str = Field(description="Giải thích tại sao các chuyên khoa này được chọn dựa trên intent đã phát hiện.")
    analyzed_specialties: List[SpecialtyDetail] = Field(description="Danh sách các khoa liên quan.")
    hypothetical_document: str = Field(description="Đoạn văn HyDE tóm tắt triệu chứng, câu hỏi của bệnh nhân.")

class SpecialtyDiseaseDecision(BaseModel):
    ten_benh: List[str] = Field(
        default_factory=list,
        description="Danh sách bệnh phù hợp trong một chuyên khoa cụ thể."
    )

class ValidationResult(BaseModel):
    category: str = Field(
        description="Phân loại câu hỏi: 'greeting' (chào hỏi), 'medical' (liên quan y tế), hoặc 'off_topic' (không liên quan)"
    )
    is_medical_related: bool = Field(
        description="True nếu category là 'medical', False nếu không. Dùng cho backward compatibility."
    )