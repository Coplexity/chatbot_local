import asyncio
from collections import defaultdict
from langchain_openai import ChatOpenAI
from core import config
from core.schemas import RouterState


class TopicAggregatorNode:
    def __init__(self): self.llm = ChatOpenAI(model=config.LLM_MODEL, api_key=config.OPENAI_API_KEY, temperature=0.1)
    async def process(self, state: RouterState) -> dict:
        groups = defaultdict(list)
        for report in state.get("document_reports", []): groups[report.get("chu_de") or "Không rõ chủ đề"].append(report)
        async def merge(topic, reports):
            source = "\n".join(f"--- version={r['version_id']} type={r['loai_van_ban']} ---\n{r['report']}" for r in reports)
            result = await self.llm.ainvoke(f"Synthesize scientific reports by topic '{topic}'. Preserve citations and state uncertainty.\nQuestion: {state.get('query', '')}\nReports:\n{source}")
            return {"chu_de": topic, "report": result.content, "source_version_ids": [r["version_id"] for r in reports], "document_reports": reports}
        return {"topic_reports": await asyncio.gather(*(merge(topic, reports) for topic, reports in groups.items()))}


DiseaseAggregatorNode = TopicAggregatorNode
