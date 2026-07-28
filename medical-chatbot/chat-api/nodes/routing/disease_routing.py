import asyncio

from langchain_openai import ChatOpenAI

from core import config
from core.database import DatabaseManager
from core.schemas import DocumentTypeRouteDecision, RouterState


class DocumentTypeRoutingNode:
    def __init__(self):
        self.llm = ChatOpenAI(model=config.LLM_MODEL, api_key=config.OPENAI_API_KEY, temperature=0)
        self.db_manager = DatabaseManager()

    def _candidates(self, topic: str, guideline_ids: list[int]) -> list[str]:
        conn = cursor = None
        try:
            conn = self.db_manager.get_connection(); cursor = conn.cursor()
            cursor.execute("SELECT DISTINCT loai_van_ban FROM guidelines WHERE guideline_id = ANY(%s) AND chu_de = %s AND COALESCE(btrim(loai_van_ban), '') <> '' ORDER BY loai_van_ban", (guideline_ids, topic))
            return [row[0] for row in cursor.fetchall()]
        finally:
            if cursor: cursor.close()
            if conn: conn.close()

    async def process(self, state: RouterState) -> dict:
        ids = state.get("filtered_guideline_ids", [])
        topics = [item["name"] for item in state.get("selected_topics", []) if item.get("name")]
        async def choose(topic: str):
            choices = await asyncio.to_thread(self._candidates, topic, ids)
            if not choices: return topic, []
            try:
                result = await self.llm.with_structured_output(DocumentTypeRouteDecision).ainvoke(f"Choose matching document types only from: {choices}\nQuestion: {state.get('query', '')}")
                selected = [value for value in result.loai_van_ban if value in choices]
                return topic, list(dict.fromkeys(selected)) or choices
            except Exception:
                return topic, choices
        pairs = await asyncio.gather(*(choose(topic) for topic in topics))
        selected = {topic: types for topic, types in pairs if types}
        return {"selected_document_types": selected, "routed_diseases": selected}


DiseaseRoutingNode = DocumentTypeRoutingNode
