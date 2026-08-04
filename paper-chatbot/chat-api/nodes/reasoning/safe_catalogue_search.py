import re

from langchain_openai import ChatOpenAI

from core import config
from core.database import DatabaseManager
from core.prompts import TEXT_TO_SQL_PROMPT
from core.schemas import RouterState

# Rào chắn tạm thời bằng regex — chưa phải giải pháp validate SQL đầy đủ
# (dễ bị né qua comment/encode). Nên nâng cấp lên sqlglot khi cần chắc chắn hơn.
FORBIDDEN_KEYWORDS = [
    "DELETE",
    "UPDATE",
    "INSERT",
    "ALTER",
    "CREATE",
    "DROP",
    "TRUNCATE",
    "GRANT",
    "REVOKE",
    "COPY",
    "CALL",
    "EXECUTE",
    "DO",
    "MERGE",
    "VACUUM",
    "ANALYZE",
    "REFRESH",
    "LOCK",
    "COMMENT",
]
FORBIDDEN_PATTERN = re.compile(r"\b(" + "|".join(FORBIDDEN_KEYWORDS) + r")\b", re.IGNORECASE)

# Chặn LLM tự viết CTE — vì node sẽ tự chèn CTE riêng để enforce quyền
# (guidelines/guideline_authors bị shadow). Nếu LLM cũng viết WITH, tên CTE
# có thể đụng nhau hoặc phá vỡ việc shadow.
FORBIDDEN_KEYWORDS_SQL_START = re.compile(r"^\s*WITH\b", re.IGNORECASE)

# Chỉ cho phép 3 bảng này trong FROM/JOIN — quyền theo user/guideline_id
# được enforce cứng bằng CTE shadow ở _scope_sql().
ALLOWED_TABLES = {"guidelines", "author", "guideline_authors"}
TABLE_REF_PATTERN = re.compile(r"\b(?:FROM|JOIN)\s+([a-zA-Z_][a-zA-Z0-9_]*)", re.IGNORECASE)


def _extract_tables(sql: str) -> set[str]:
    return {m.group(1).lower() for m in TABLE_REF_PATTERN.finditer(sql)}


class SafeCatalogueSearchNode:
    """Text-to-SQL: LLM tự viết câu SELECT. Node chặn cứng các từ khóa
    ghi/xóa/thay đổi schema, chỉ cho phép 3 bảng whitelist (guidelines,
    author, guideline_authors), và ENFORCE CỨNG phân quyền theo
    filtered_guideline_ids bằng cách bọc SQL của LLM trong 2 CTE cùng tên
    'guidelines' / 'guideline_authors' đã lọc sẵn — CTE sẽ shadow tên bảng
    thật trong toàn bộ câu query, nên bất kể LLM viết alias/join thế nào
    cũng chỉ thấy đúng phạm vi được cấp quyền."""

    def __init__(self):
        print("⏳ [Catalogue Search] Initializing...")
        self.llm = ChatOpenAI(model=config.LLM_MODEL, api_key=config.OPENAI_API_KEY, temperature=0)
        self.db_manager = DatabaseManager()

    def process(self, state: RouterState) -> dict:
        query = state.get("query", "")
        filtered_guideline_ids = state.get("filtered_guideline_ids", [])

        if not filtered_guideline_ids:
            print("⚠️ [Catalogue Search] Không có guideline nào được cấp quyền cho user này.")
            return {"error_response": "Bạn chưa được cấp quyền xem guideline nào."}

        try:
            raw_sql = self.llm.invoke(TEXT_TO_SQL_PROMPT.format(query=query)).content
        except Exception as exc:
            print(f"❌ [Catalogue Search] LLM error: {exc}")
            return {"error_response": "Xin lỗi, mình chưa hiểu rõ yêu cầu tra cứu này."}

        sql = self._clean_sql_text(raw_sql)

        rejection = self._validate(sql)
        if rejection:
            print(f"⚠️ [Catalogue Search] Rejected ({rejection}): {sql}")
            return {"error_response": "Câu hỏi này chưa thể tra cứu được, bạn thử diễn đạt lại nhé."}

        scoped_sql = self._scope_sql(sql, filtered_guideline_ids)

        print(f"📋 [Catalogue Audit] query={query!r}\nscoped_guideline_ids={filtered_guideline_ids}\nSQL: {scoped_sql}")
        rows, columns = self._run(scoped_sql)

        if not rows:
            return {"error_response": "Không tìm thấy kết quả phù hợp với yêu cầu tra cứu của bạn."}

        return {"rows": rows, "columns": columns}

    @staticmethod
    def _clean_sql_text(raw_sql: str) -> str:
        text = raw_sql.strip()
        text = re.sub(r"^```(?:sql)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"```\s*$", "", text)
        return text.rstrip(";").strip()

    @staticmethod
    def _validate(sql: str) -> str | None:
        if not sql:
            return "empty SQL"
        if FORBIDDEN_KEYWORDS_SQL_START.search(sql):
            return "LLM tự viết CTE (WITH) — không cho phép, xung đột với scope enforcement"
        if not sql.upper().startswith("SELECT"):
            return "not a SELECT statement"
        forbidden_match = FORBIDDEN_PATTERN.search(sql)
        if forbidden_match:
            return f"forbidden keyword: {forbidden_match.group()}"

        tables = _extract_tables(sql)
        disallowed = tables - ALLOWED_TABLES
        if disallowed:
            return f"disallowed tables: {disallowed}"

        return None

    @staticmethod
    def _scope_sql(sql: str, filtered_guideline_ids: list[int]) -> str:
        """Bọc SQL gốc trong CTE 'guidelines' và 'guideline_authors' đã lọc
        sẵn theo guideline_id được phép. CTE cùng tên sẽ shadow bảng thật
        trong toàn bộ phần SQL phía sau, nên enforce quyền độc lập với việc
        LLM có tự thêm điều kiện lọc đúng hay không."""
        safe_ids = ",".join(str(int(gid)) for gid in filtered_guideline_ids)
        return (
            f"WITH guidelines AS ("
            f"    SELECT * FROM guidelines WHERE guideline_id IN ({safe_ids})"
            f"), guideline_authors AS ("
            f"    SELECT * FROM guideline_authors WHERE guideline_id IN ({safe_ids})"
            f") {sql}"
        )

    def _run(self, sql: str):
        conn = None
        cursor = None
        try:
            conn = self.db_manager.get_connection()
            cursor = conn.cursor()
            cursor.execute("SET LOCAL statement_timeout = '5s';")
            cursor.execute(sql)
            rows = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
            return rows, columns
        except Exception as e:
            print(f"❌ [Catalogue Search DB Error] {e}")
            return [], []
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()