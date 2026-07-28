import asyncio
from collections import defaultdict
from langchain_openai import ChatOpenAI
from core import config
from core.schemas import RouterState


class AuthorAggregatorNode:
    def __init__(self): self.llm = ChatOpenAI(model=config.LLM_MODEL, api_key=config.OPENAI_API_KEY, temperature=0.1)
    async def process(self, state: RouterState) -> dict:
        groups = defaultdict(list)
        for topic_report in state.get("topic_reports", []):
            for document in topic_report.get("document_reports", []):
                for author in document.get("authors") or ["Không rõ tác giả"]:
                    groups[author].append((topic_report["chu_de"], document))
        async def merge(author, entries):
            source = "\n".join(f"--- topic={topic}, version={doc['version_id']} ---\n{doc['report']}" for topic, doc in entries)
            result = await self.llm.ainvoke(f"Synthesize scientific evidence associated with author '{author}'. Preserve citations.\nQuestion: {state.get('query', '')}\nReports:\n{source}")
            return {"author": author, "report": result.content, "source_version_ids": list(dict.fromkeys(doc["version_id"] for _, doc in entries))}
        return {"author_report_items": await asyncio.gather(*(merge(author, entries) for author, entries in groups.items()))}


SpecialtyAggregatorNode = AuthorAggregatorNode
