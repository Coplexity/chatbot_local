import re

from langchain_openai import ChatOpenAI

from core import config
from core.prompts import SYNTHESIZER_PROMPT
from core.schemas import RouterState
from nodes.reasoning.citation_transformer import CitationStreamTransformer


class GlobalSynthesizerNode:
    """Class tổng hợp dữ liệu, tích hợp cơ chế Smart Bypass để tối ưu chi phí"""

    def __init__(self):
        print("⏳ [Synthesizer] Initializing Global Synthesizer...")
        self.llm = ChatOpenAI(model=config.LLM_MODEL, api_key=config.OPENAI_API_KEY, temperature=0.1)

    @staticmethod
    def _stream_tokens(text):
        tokens = re.findall(r"\S+\s*", text or "")
        return tokens if tokens else [text or ""]

    async def stream_process(self, state: RouterState):
        """Stream final response chunks, transforming source tags incrementally."""
        query = state["query"]
        document_reports = state.get("document_reports", [])
        topic_reports = state.get("topic_reports", [])
        transformer = CitationStreamTransformer()

        if not document_reports and not topic_reports:
            fallback = (
                "### Kết luận sơ bộ\n"
                "- Tôi chưa tìm thấy tài liệu phù hợp để trả lời câu hỏi này.\n"
                "\n"
                "### Bạn có thể bổ sung\n"
                "- Làm rõ chủ đề hoặc từ khóa nghiên cứu bạn quan tâm.\n"
                "- Tên tác giả, DOI, hoặc loại văn bản cụ thể (nếu có)."
            )
            for token in self._stream_tokens(fallback):
                delta = transformer.feed(token)
                if delta:
                    yield delta
            tail = transformer.flush()
            if tail:
                yield tail
            return

        stream_count = len(topic_reports) or len(document_reports)
        print(f"🧬 [Global Synthesizer] Merging {stream_count} data streams...")
        all_reports_text = ""

        if topic_reports:
            for item in topic_reports:
                topic = (item.get("chu_de") or "unknown").upper()
                content = item.get("report") or ""
                all_reports_text += f"\n=== TỔNG HỢP CHỦ ĐỀ {topic} ===\n{content}\n"

        if document_reports and not topic_reports:
            for item in document_reports:
                chu_de = (item.get("chu_de") or "unknown").upper()
                guideline_id = item.get("guideline_id") or "unknown"
                content = item.get("report") or ""
                all_reports_text += (
                    f"\n--- BÁO CÁO VĂN BẢN | chu_de={chu_de} | guideline_id={guideline_id} ---\n{content}\n"
                )

        prompt = SYNTHESIZER_PROMPT.format(
            all_reports_text=all_reports_text,
            query=query,
        )

        async for chunk in self.llm.astream(prompt):
            chunk_text = getattr(chunk, "content", "") or ""
            if not chunk_text:
                continue
            delta = transformer.feed(chunk_text)
            if delta:
                yield delta

        tail = transformer.flush()
        if tail:
            yield tail

    def process(self, state: RouterState):
        raise RuntimeError(
            "Non-stream mode has been disabled. Use stream_process(...) instead."
        )