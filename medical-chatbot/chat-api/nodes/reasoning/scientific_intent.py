from langchain_openai import ChatOpenAI

from core import config
from core.schemas import RouterState, ScientificIntentDecision


INTENT_PROMPT = """Classify the user input for a scientific-document search system.
Return exactly one intent:
- greeting: greeting, thanks, or small talk without a search request.
- off_topic: unrelated to finding, listing, comparing, or synthesizing scientific documents.
- text_to_sql: asks to find/list/filter catalogue metadata (topic, author, DOI, document type).
- aggregate: asks a substantive question that requires reading and synthesizing document content.

User input: {query}
"""


class ScientificIntentNode:
    def __init__(self):
        self.llm = ChatOpenAI(model=config.LLM_MODEL, api_key=config.OPENAI_API_KEY, temperature=0)

    def process(self, state: RouterState) -> dict:
        try:
            result = self.llm.with_structured_output(ScientificIntentDecision).invoke(
                INTENT_PROMPT.format(query=state["query"])
            )
            intent = result.intent if result.intent in {"greeting", "off_topic", "text_to_sql", "aggregate"} else "aggregate"
        except Exception as exc:
            print(f"[ScientificIntent] fallback to aggregate: {exc}")
            intent = "aggregate"
        return {"intent": intent}
