import asyncio

from langchain_openai import ChatOpenAI

from core import config
from core.schemas import RouterState


class DomainExpertsNode:
    """Create one evidence-bound report for each retrieved guideline version."""

    def __init__(self):
        self.llm = ChatOpenAI(model=config.LLM_MODEL, api_key=config.OPENAI_API_KEY, temperature=0.1)

    async def process(self, state: RouterState) -> dict:
        async def report(document: dict) -> dict:
            prompt = f"""Analyze this scientific document only from the supplied context.
Topic: {document['chu_de']}; document type: {document['loai_van_ban']}; version: {document['version_id']}.
State scope, methods/results/limitations when available. Preserve chunk citations such as [123]; do not invent facts.
Question: {state.get('query', '')}
Context:
{document['context']}"""
            response = await self.llm.ainvoke(prompt)
            return {**document, "report": response.content}
        reports = await asyncio.gather(*(report(doc) for doc in state.get("document_contexts", [])))
        return {"document_reports": reports}
