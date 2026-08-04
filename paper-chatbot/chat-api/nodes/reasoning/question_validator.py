from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field
from core import config
from core.schemas import RouterState, ValidationResult
from core.prompts import QUESTION_VALIDATION_PROMPT


class QuestionValidatorNode:
    """Node xác nhận & phân loại câu hỏi thành greeting/medical/off_topic"""

    def __init__(self):
        print("⏳ [Validator] Initializing Question Validator...")
        self.llm = ChatOpenAI(model=config.LLM_MODEL, api_key=config.OPENAI_API_KEY, temperature=0)

    def process(self, state: RouterState):
        query = state["query"]
        structured_llm = self.llm.with_structured_output(ValidationResult)

        prompt = QUESTION_VALIDATION_PROMPT.format(query=query)

        try:
            result = structured_llm.invoke(prompt)
            intent = result.intent if result.intent in {"greeting", "off_topic", "text_to_sql", "aggregate"} else "aggregate"
        except Exception as exc:
            print(f"[ScientificIntent] fallback to off_topic: {exc}")
            intent = "off_topic"
        return {"intent": intent}