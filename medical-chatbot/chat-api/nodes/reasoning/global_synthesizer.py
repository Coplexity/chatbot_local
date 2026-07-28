import re
from langchain_openai import ChatOpenAI

from core import config
from core.schemas import RouterState
from nodes.reasoning.citation_transformer import CitationStreamTransformer


class GlobalSynthesizerNode:
    def __init__(self):
        self.llm = ChatOpenAI(model=config.LLM_MODEL, api_key=config.OPENAI_API_KEY, temperature=0.1)

    @staticmethod
    def _tokens(text):
        return re.findall(r"\S+\s*", text) or [text]

    async def stream_process(self, state: RouterState):
        items = state.get("author_report_items", [])
        transformer = CitationStreamTransformer()
        if not items:
            fallback = "Không tìm thấy ngữ cảnh phù hợp trong các tài liệu khoa học mà bạn được cấp quyền truy cập."
            for token in self._tokens(fallback):
                delta = transformer.feed(token)
                if delta: yield delta
            tail = transformer.flush()
            if tail: yield tail
            return
        reports = "\n".join(f"=== TÁC GIẢ: {item['author']} | versions={item['source_version_ids']} ===\n{item['report']}" for item in items)
        prompt = f"""Synthesize a Vietnamese answer to the scientific question using only these author-grouped reports.
Answer directly, distinguish evidence by author when relevant, preserve existing source citations, and state uncertainty. Do not invent sources.
Question: {state.get('query', '')}
Author reports:
{reports}"""
        async for chunk in self.llm.astream(prompt):
            delta = transformer.feed(getattr(chunk, "content", "") or "")
            if delta: yield delta
        tail = transformer.flush()
        if tail: yield tail

    def process(self, state: RouterState):
        raise RuntimeError("Use stream_process for SSE output.")
