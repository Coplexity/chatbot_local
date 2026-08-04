from langchain_openai import ChatOpenAI

from core import config
from core.prompts import CATALOGUE_NL_PROMPT


class CatalogueResultFormatterNode:
    """Nhận rows/columns thô (từ SafeCatalogueSearchNode.execute) và dùng LLM
    diễn giải lại thành câu trả lời tự nhiên. Không tự ý bịa thêm dữ liệu
    ngoài rows/columns được truyền vào — chỉ diễn đạt lại."""

    def __init__(self):
        print("⏳ [Catalogue NL Formatter] Initializing...")
        self.llm = ChatOpenAI(model=config.LLM_MODEL, api_key=config.OPENAI_API_KEY, temperature=0)

    @staticmethod
    def _rows_to_text(rows, columns) -> str:
        if not rows:
            return "(không có dòng nào)"
        lines = []
        for r in rows:
            parts = [f"{col}={val}" for col, val in zip(columns, r)]
            lines.append("- " + ", ".join(parts))
        return "\n".join(lines)

    def _build_prompt(self, query: str, rows, columns) -> str:
        return CATALOGUE_NL_PROMPT.format(
            query=query,
            columns=", ".join(columns),
            rows_text=self._rows_to_text(rows, columns),
        )

    def process(self, query: str, rows, columns) -> str:
        """Bản không-stream, dùng cho CLI / batch."""
        if not rows:
            return "Không tìm thấy kết quả phù hợp với yêu cầu tra cứu của bạn."
        prompt = self._build_prompt(query, rows, columns)
        try:
            result = self.llm.invoke(prompt).content
        except Exception as exc:
            print(f"❌ [Catalogue NL Formatter] LLM error: {exc}")
            return self._rows_to_text(rows, columns)  # fallback về format thô
        return result.strip()

    async def stream_process(self, query: str, rows, columns):
        """Bản stream, dùng cho API stream (giống các node khác trong workflow)."""
        if not rows:
            yield "Không tìm thấy kết quả phù hợp với yêu cầu tra cứu của bạn."
            return
        prompt = self._build_prompt(query, rows, columns)
        try:
            async for chunk in self.llm.astream(prompt):
                if chunk.content:
                    yield chunk.content
        except Exception as exc:
            print(f"❌ [Catalogue NL Formatter] LLM stream error: {exc}")
            yield self._rows_to_text(rows, columns)  # fallback về format thô