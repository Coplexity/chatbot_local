import asyncio

from langchain_openai import ChatOpenAI

from core import config
from core.prompts import DOCUMENT_EXPERT_PROMPT
from core.schemas import RouterState

class DocumentExpertsNode:
    """Generate one expert report per retrieved document context."""

    def __init__(self):
        print("⏳ [Experts] Initializing Expert Agents...")
        self.llm = ChatOpenAI(model=config.LLM_MODEL, api_key=config.OPENAI_API_KEY, temperature=0.1)

    async def stream_single_report(self, query: str, chu_de: str, context: str):
        """Stream one document report token-by-token for low-latency terminal/UI output."""
        prompt = DOCUMENT_EXPERT_PROMPT.format(
            topic_name=chu_de.upper(),
            context=context,
            query=query,
            FALLBACK_ANSWER="Trong guidelines không có đủ thông tin để mình có thể trả lời câu hỏi này.",
        )
        async for chunk in self.llm.astream(prompt):
            chunk_text = getattr(chunk, "content", "") or ""
            if chunk_text:
                yield chunk_text

    async def process(self, state: RouterState):
        query = state["query"]
        document_contexts = state.get("document_contexts", [])
        if not document_contexts:
            print("⚠️ [Experts] Không có document_contexts để xử lý.")
            return {"document_reports": []}

        async def generate_single_report(doc):
            chu_de = doc.get("chu_de", "")
            context = doc.get("context", "")
            prompt = DOCUMENT_EXPERT_PROMPT.format(
                topic_name=chu_de.upper(),
                context=context,
                query=query,
                FALLBACK_ANSWER="Trong guidelines không có đủ thông tin để mình có thể trả lời câu hỏi này.",
            )
            res = await self.llm.ainvoke(prompt)
            return {
                "version_id": doc.get("version_id"),
                "guideline_id": doc.get("guideline_id"),
                "chu_de": chu_de,
                "authors": doc.get("authors", []),
                "context": context,
                "report": res.content,
            }

        tasks = [generate_single_report(doc) for doc in document_contexts]
        results = await asyncio.gather(*tasks) if tasks else []

        print(f"🧬 [Experts] Đã tạo {len(results)} báo cáo từ {len(document_contexts)} văn bản.")

        return {"document_reports": results}