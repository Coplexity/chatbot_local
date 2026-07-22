from typing import TypedDict, List, Dict
from pydantic import BaseModel, Field


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
    specialty_reports: Dict[str, str]
    response: str
    response_raw: str


class SpecialtyDetail(BaseModel):
    name: str = Field(description="TÃªn chuyÃªn khoa náº±m trong danh sÃ¡ch chu_de láº¥y Ä‘á»™ng tá»« database (guidelines.chu_de).")


class RouteDecision(BaseModel):
    detected_intent: str = Field(description="Loáº¡i input Ä‘Æ°á»£c phÃ¡t hiá»‡n: SYMPTOM_BASED, DISEASE_BASED, TREATMENT_BASED, GENERAL_INFO_BASED, DIAGNOSTIC_BASED, hoáº·c PROGNOSIS_BASED.")
    routing_reasoning: str = Field(description="Giáº£i thÃ­ch táº¡i sao cÃ¡c chuyÃªn khoa nÃ y Ä‘Æ°á»£c chá»n dá»±a trÃªn intent Ä‘Ã£ phÃ¡t hiá»‡n.")
    analyzed_specialties: List[SpecialtyDetail] = Field(description="Danh sÃ¡ch cÃ¡c khoa liÃªn quan.")
    hypothetical_document: str = Field(description="Äoáº¡n vÄƒn HyDE tÃ³m táº¯t triá»‡u chá»©ng, cÃ¢u há»i cá»§a bá»‡nh nhÃ¢n.")


class SpecialtyDiseaseDecision(BaseModel):
    loai_van_ban: List[str] = Field(
        default_factory=list,
        description="Danh sÃ¡ch bá»‡nh phÃ¹ há»£p trong má»™t chuyÃªn khoa cá»¥ thá»ƒ."
    )


class ValidationResult(BaseModel):
    category: str = Field(
        description="PhÃ¢n loáº¡i cÃ¢u há»i: 'greeting' (chÃ o há»i), 'medical' (liÃªn quan y táº¿), hoáº·c 'off_topic' (khÃ´ng liÃªn quan)"
    )
    is_medical_related: bool = Field(
        description="True náº¿u category lÃ  'medical', False náº¿u khÃ´ng. DÃ¹ng cho backward compatibility."
    )

