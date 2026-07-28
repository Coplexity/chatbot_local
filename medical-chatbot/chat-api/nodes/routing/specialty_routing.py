from langchain_openai import ChatOpenAI

from core import config
from core.schemas import RouterState, TopicRouteDecision


class TopicRoutingNode:
    """Select allowed `guidelines.chu_de` values for an aggregate request."""

    def __init__(self):
        self.llm = ChatOpenAI(model=config.LLM_MODEL, api_key=config.OPENAI_API_KEY, temperature=0)

    def process(self, state: RouterState) -> dict:
        topics = state.get("filtered_topics", [])
        if not topics:
            return {"selected_topics": [], "analyzed_specialties": [], "hypothetical_document": ""}
        prompt = (
            "Choose at most five scientific topics only from this whitelist. Return a short retrieval query.\n"
            f"Topics: {topics}\nUser question: {state.get('query', '')}"
        )
        try:
            result = self.llm.with_structured_output(TopicRouteDecision).invoke(prompt)
            selected = [{"name": item.name} for item in result.selected_topics if item.name in topics]
            hyde = result.hypothetical_document or state.get("query", "")
        except Exception as exc:
            print(f"[TopicRouting] fallback: {exc}")
            selected, hyde = [{"name": topic} for topic in topics[:5]], state.get("query", "")
        # analyzed_specialties is a compatibility mirror until the SSE traces are renamed.
        return {"selected_topics": selected, "analyzed_specialties": selected, "hypothetical_document": hyde}


SpecialtyRoutingNode = TopicRoutingNode
