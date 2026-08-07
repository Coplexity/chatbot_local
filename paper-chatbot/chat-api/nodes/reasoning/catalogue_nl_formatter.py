from langchain_openai import ChatOpenAI

from core import config
from core.prompts import CATALOGUE_NL_PROMPT, CONFIDENT_INSTRUCTION, HEDGED_INSTRUCTION_TEMPLATE

_ID_LIKE_COLUMNS = {"guideline_id", "author_id", "version_id", "owner_user_id", "created_by_user_id"}
_MAX_LISTED_VALUES = 50
_MAX_VALUE_LENGTH = 200  # tránh abstract/tom_tat_nghien_cuu dài làm phình prompt


class CatalogueResultFormatterNode:
    """Nhận rows/columns thô + cờ confident từ SafeCatalogueSearchNode, dùng
    LLM diễn giải lại thành câu trả lời tự nhiên. confident=True -> trả lời
    dứt khoát; confident=False -> mở đầu bằng rào đón, nêu rõ giá trị đã
    suy đoán (confirmed_values). Không tự ý bịa thêm dữ liệu ngoài rows/columns.

    Số lượng VÀ danh sách giá trị (đếm + liệt kê distinct theo từng cột có tên,
    ví dụ title/full_name) được tính SẴN bằng Python, không giao cho LLM tự
    đếm/tự gom từ bảng thô — tránh đếm sai hoặc bỏ sót khi có dòng lặp."""

    def __init__(self):
        print("⏳ [Catalogue NL Formatter] Initializing...")
        self.llm = ChatOpenAI(model=config.LLM_MODEL, api_key=config.OPENAI_API_KEY, temperature=0)

    @staticmethod
    def _truncate(value) -> str:
        text = str(value)
        if len(text) > _MAX_VALUE_LENGTH:
            return text[:_MAX_VALUE_LENGTH] + "..."
        return text

    @staticmethod
    def _rows_to_text(rows, columns) -> str:
        if not rows:
            return "(không có dòng nào)"
        lines = []
        for r in rows:
            parts = [
                f"{col}={CatalogueResultFormatterNode._truncate(val)}"
                for col, val in zip(columns, r)
            ]
            lines.append("- " + ", ".join(parts))
        return "\n".join(lines)

    @staticmethod
    def _distinct_summary(rows, columns) -> str:
        if not rows:
            return "(không có dữ liệu)"
        lines = []
        for idx, col in enumerate(columns):
            distinct_vals = [v for v in {r[idx] for r in rows} if v is not None]
            count = len(distinct_vals)
            lines.append(f"- Cột '{col}': {count} giá trị duy nhất")
            if col.lower() not in _ID_LIKE_COLUMNS and distinct_vals:
                shown = sorted(
                    CatalogueResultFormatterNode._truncate(v) for v in distinct_vals
                )[:_MAX_LISTED_VALUES]
                lines.append(f"  Danh sách: {'; '.join(shown)}")
                if count > _MAX_LISTED_VALUES:
                    lines.append(f"  (còn {count - _MAX_LISTED_VALUES} giá trị khác không liệt kê hết)")
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
            distinct_summary=self._distinct_summary(rows, columns),
            rows_text=self._rows_to_text(rows, columns),
        )

    def process(self, query: str, rows, columns, confident: bool = True, confirmed_values: str = "") -> str:
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