from langchain_openai import ChatOpenAI

from core import config
from core.prompts import CATALOGUE_NL_PROMPT, CONFIDENT_INSTRUCTION, HEDGED_INSTRUCTION_TEMPLATE


class CatalogueResultFormatterNode:
    """Nhận rows/columns thô + cờ confident từ SafeCatalogueSearchNode, dùng
    LLM diễn giải lại thành câu trả lời tự nhiên. confident=True -> trả lời
    dứt khoát; confident=False -> mở đầu bằng rào đón, nêu rõ giá trị đã
    suy đoán (confirmed_values). Không tự ý bịa thêm dữ liệu ngoài rows/columns."""

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

    def _build_prompt(self, query: str, rows, columns, confident: bool, confirmed_values: str) -> str:
        confidence_instruction = (
            CONFIDENT_INSTRUCTION
            if confident
            else HEDGED_INSTRUCTION_TEMPLATE.format(confirmed_values=confirmed_values)
        )
        return CATALOGUE_NL_PROMPT.format(
            confidence_instruction=confidence_instruction,
            query=query,
            columns=", ".join(columns),
            rows_text=self._rows_to_text(rows, columns),
        )

    def process(self, query: str, rows, columns, confident: bool = True, confirmed_values: str = "") -> str:
        """Bản không-stream, dùng cho CLI / batch."""
        if not rows:
            return "Không tìm thấy kết quả phù hợp với yêu cầu tra cứu của bạn."
        prompt = self._build_prompt(query, rows, columns, confident, confirmed_values)
        try:
            result = self.llm.invoke(prompt).content
        except Exception as exc:
            print(f"❌ [Catalogue NL Formatter] LLM error: {exc}")
            return self._rows_to_text(rows, columns)
        return result.strip()

    async def stream_process(self, query: str, rows, columns, confident: bool = True, confirmed_values: str = ""):
        """Bản stream, dùng cho SSE (khớp với ChatbotApp)."""
        if not rows:
            yield "Không tìm thấy kết quả phù hợp với yêu cầu tra cứu của bạn."
            return
        prompt = self._build_prompt(query, rows, columns, confident, confirmed_values)
        try:
            async for chunk in self.llm.astream(prompt):
                if chunk.content:
                    yield chunk.content
        except Exception as exc:
            print(f"❌ [Catalogue NL Formatter] LLM stream error: {exc}")
            yield self._rows_to_text(rows, columns)