import re
import unicodedata

from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from rapidfuzz import process as fuzz_process

from core import config
from core.database import DatabaseManager
from core.prompts import TEXT_TO_SQL_PROMPT, TEXT_TO_SQL_RETRY_PROMPT
from core.schemas import RouterState, TextToSqlDecision

FORBIDDEN_KEYWORDS = [
    "DELETE", "UPDATE", "INSERT", "ALTER", "CREATE", "DROP", "TRUNCATE",
    "GRANT", "REVOKE", "COPY", "CALL", "EXECUTE", "DO", "MERGE",
    "VACUUM", "ANALYZE", "REFRESH", "LOCK", "COMMENT",
]
FORBIDDEN_PATTERN = re.compile(r"\b(" + "|".join(FORBIDDEN_KEYWORDS) + r")\b", re.IGNORECASE)

ALLOWED_TABLES = {"guidelines", "author", "guideline_authors"}
TABLE_REF_PATTERN = re.compile(r"\b(?:FROM|JOIN)\s+([a-zA-Z_][a-zA-Z0-9_]*)", re.IGNORECASE)

COUNT_PATTERN = re.compile(r"\bCOUNT\s*\(", re.IGNORECASE)
GROUP_BY_PATTERN = re.compile(r"\bGROUP\s+BY\b", re.IGNORECASE)

FUZZY_THRESHOLD_STRICT = 60
FUZZY_THRESHOLD_TOPIC = 60
SEMANTIC_THRESHOLD_TOPIC = 0.6


def _extract_tables(sql: str) -> set[str]:
    return {m.group(1).lower() for m in TABLE_REF_PATTERN.finditer(sql)}


def _strip_diacritics(text: str) -> str:
    """Bỏ dấu tiếng Việt + hạ chữ thường, dùng làm lớp so khớp phụ khi
    fuzzy match trên chuỗi có dấu thất bại (vd người dùng gõ 'xa hoi' thay
    vì 'Xã hội' — 2 chuỗi lệch nhiều ký tự byte nên fuzzy match trên bản
    có dấu dễ trượt ngưỡng dù về ý nghĩa là khớp)."""
    normalized = unicodedata.normalize("NFD", text or "")
    without_marks = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    return without_marks.lower().strip()


class SafeCatalogueSearchNode:
    """Text-to-SQL 2 lượt với fuzzy/semantic fallback.

    CHỈ trả về dữ liệu thô (rows/columns) + cờ confident + confirmed_values —
    KHÔNG tự diễn giải câu trả lời. Việc format tự nhiên (giọng điệu chắc
    chắn/dè dặt, đếm/liệt kê) do CatalogueResultFormatterNode đảm nhiệm.

    Output có thể là:
      - {"error_response": str}  — không có quyền hoặc LLM lỗi hẳn
      - {"rows": [...], "columns": [...], "confident": bool, "confirmed_values": str}

    Quyền truy cập được ép ở CẢ 2 lượt bằng outer-wrap: kết quả luôn bị lọc
    theo guideline_id ∈ filtered_guideline_ids AND chu_de ∈ filtered_topics.

    SELECT list bắt buộc luôn có title (và full_name nếu đụng bảng tác giả),
    cấm COUNT/GROUP BY — để CatalogueResultFormatterNode luôn có đủ dữ liệu
    thô để tự đếm chính xác và liệt kê tên cụ thể, không chỉ trả về 1 con số.

    Matching (_match_strict/_match_topic) thử theo thứ tự: fuzzy trên chuỗi
    gốc -> fuzzy trên chuỗi đã bỏ dấu -> semantic (chỉ _match_topic) — để
    chịu được cả lỗi gõ gần đúng lẫn input thiếu dấu tiếng Việt hoàn toàn."""

    def __init__(self):
        print("⏳ [Catalogue Search] Initializing...")
        self.llm = ChatOpenAI(model=config.LLM_MODEL, api_key=config.OPENAI_API_KEY, temperature=0)
        self.db_manager = DatabaseManager()
        self.embed_model = OpenAIEmbeddings(model=config.EMBEDDING_MODEL, api_key=config.OPENAI_API_KEY)

    def _embed(self, text: str):
        return self.embed_model.embed_query(text)

    @staticmethod
    def _cosine_sim(a, b) -> float:
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = sum(x * x for x in a) ** 0.5
        norm_b = sum(y * y for y in b) ** 0.5
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)

    def process(self, state: RouterState) -> dict:
        query = state.get("query", "")
        guideline_ids = state.get("filtered_guideline_ids", [])
        topics = state.get("filtered_topics", [])

        if not guideline_ids or not topics:
            return {"error_response": "Bạn chưa có quyền truy cập văn bản nào để tra cứu."}

        # ---------- Lượt 1 ----------
        try:
            decision = self.llm.with_structured_output(TextToSqlDecision).invoke(
                TEXT_TO_SQL_PROMPT.format(query=query)
            )
        except Exception as exc:
            print(f"❌ [Catalogue Search] LLM#1 error: {exc}")
            return {"error_response": "Xin lỗi, mình chưa hiểu rõ yêu cầu tra cứu này."}

        sql1 = self._clean_sql_text(decision.sql)
        rejection = self._validate(sql1)
        rows, columns = ([], [])
        if not rejection:
            wrapped_sql = self._wrap_with_scope(sql1)
            print(f"📋 [Catalogue Audit] query={query!r}\nSQL#1: {sql1}")
            rows, columns = self._run(wrapped_sql, guideline_ids, topics)
        else:
            print(f"⚠️ [Catalogue Search] Rejected SQL#1 ({rejection}): {sql1}")

        if rows:
            return {"rows": rows, "columns": columns, "confident": True, "confirmed_values": ""}

        # ---------- Fallback: fuzzy/semantic match ----------
        f = decision.filter
        print(
            f"🔍 [Catalogue Fallback] filter từ LLM#1: "
            f"authors={f.authors} chu_de={f.chu_de} titles={f.guideline_titles}"
        )
        if not f.authors and not f.chu_de and not f.guideline_titles:
            print("🔍 [Catalogue Fallback] Bỏ qua fallback vì LLM#1 không trích được filter nào.")
            return {"rows": [], "columns": []}

        matched_authors, ok_authors = self._match_strict(f.authors, self._load_known_authors(guideline_ids))
        matched_topics, ok_topics = self._match_topic(f.chu_de, topics)
        matched_titles, ok_titles = self._match_strict(f.guideline_titles, self._load_known_titles(guideline_ids))
        print(
            f"🔍 [Catalogue Fallback] matched_authors={matched_authors} ok={ok_authors} | "
            f"matched_topics={matched_topics} ok={ok_topics} (known={topics}) | "
            f"matched_titles={matched_titles} ok={ok_titles}"
        )

        if not (ok_authors and ok_topics and ok_titles):
            print("🔍 [Catalogue Fallback] Dừng vì có ít nhất 1 filter không match được gì.")
            return {"rows": [], "columns": []}

        confirmed_parts = []
        if matched_authors:
            confirmed_parts.append(f"tác giả={matched_authors}")
        if matched_topics:
            confirmed_parts.append(f"chủ đề={matched_topics}")
        if matched_titles:
            confirmed_parts.append(f"tên văn bản={matched_titles}")
        confirmed_values = ", ".join(confirmed_parts)

        # ---------- Lượt 2 ----------
        try:
            raw_sql2 = self.llm.invoke(
                TEXT_TO_SQL_RETRY_PROMPT.format(confirmed_values=confirmed_values, query=query)
            ).content
        except Exception as exc:
            print(f"❌ [Catalogue Search] LLM#2 error: {exc}")
            return {"error_response": "Xin lỗi, mình chưa thể tra cứu được yêu cầu này."}

        sql2 = self._clean_sql_text(raw_sql2)
        rejection2 = self._validate(sql2)
        if rejection2:
            print(f"⚠️ [Catalogue Search] Rejected SQL#2 ({rejection2}): {sql2}")
            return {"rows": [], "columns": []}

        wrapped_sql2 = self._wrap_with_scope(sql2)
        print(f"📋 [Catalogue Audit] SQL#2 (retry): {sql2}")
        rows2, columns2 = self._run(wrapped_sql2, guideline_ids, topics)
        return {"rows": rows2, "columns": columns2, "confident": False, "confirmed_values": confirmed_values}

    # ---------- Validation ----------

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
        forbidden_match = FORBIDDEN_PATTERN.search(sql)
        if forbidden_match:
            return f"forbidden keyword: {forbidden_match.group()}"

        tables = _extract_tables(sql)
        disallowed = tables - ALLOWED_TABLES
        if disallowed:
            return f"disallowed tables: {disallowed}"

        if COUNT_PATTERN.search(sql):
            return "COUNT not allowed: hệ thống tự đếm ở bước sau, chỉ liệt kê rows thô"
        if GROUP_BY_PATTERN.search(sql):
            return "GROUP BY not allowed: hệ thống tự đếm ở bước sau, chỉ liệt kê rows thô"

        if not re.search(r"\bguideline_id\b", sql, re.IGNORECASE):
            return "missing guideline_id in SELECT list"
        if not re.search(r"\bchu_de\b", sql, re.IGNORECASE):
            return "missing chu_de in SELECT list"
        if not re.search(r"\btitle\b", sql, re.IGNORECASE):
            return "missing title in SELECT list"
        if ("author" in tables or "guideline_authors" in tables) and not re.search(
            r"\bfull_name\b", sql, re.IGNORECASE
        ):
            return "query touches author table but missing full_name in SELECT list"

        return None

    @staticmethod
    def _wrap_with_scope(inner_sql: str) -> str:
        cleaned = re.sub(r";+\s*$", "", inner_sql.strip())
        escaped = cleaned.replace("%", "%%")
        return f"""
            SELECT * FROM ({escaped}) AS scoped
            WHERE scoped.guideline_id = ANY(%s)
              AND scoped.chu_de = ANY(%s)
            LIMIT 50;
        """

    # ---------- Matching ----------

    def _match_strict(self, queries: list[str], known_values: list[str]) -> tuple[list[str], bool]:
        """Fuzzy match trên chuỗi gốc trước; nếu trượt, thử lại trên bản đã
        bỏ dấu (phòng trường hợp người dùng gõ tên tác giả/tên văn bản
        không dấu, ví dụ 'Nguyen Van A' thay vì 'Nguyễn Văn A')."""
        if not queries:
            return [], True
        if not known_values:
            return [], False

        stripped_known = {_strip_diacritics(v): v for v in known_values}
        matched = set()
        for q in queries:
            result = fuzz_process.extractOne(q, known_values, score_cutoff=FUZZY_THRESHOLD_STRICT)
            if result:
                matched.add(result[0])
                continue
            stripped_q = _strip_diacritics(q)
            result_stripped = fuzz_process.extractOne(
                stripped_q, list(stripped_known.keys()), score_cutoff=FUZZY_THRESHOLD_STRICT
            )
            if result_stripped:
                matched.add(stripped_known[result_stripped[0]])

        if not matched:
            return [], False
        return list(matched), True

    def _match_topic(self, queries: list[str], known_values: list[str]) -> tuple[list[str], bool]:
        """Thứ tự thử: fuzzy trên chuỗi gốc -> fuzzy trên bản bỏ dấu ->
        semantic match (embedding) cho phần vẫn chưa khớp được gì."""
        if not queries:
            return [], True
        if not known_values:
            return [], False

        stripped_known = {_strip_diacritics(v): v for v in known_values}
        matched = set()
        unresolved = []
        for q in queries:
            result = fuzz_process.extractOne(q, known_values, score_cutoff=FUZZY_THRESHOLD_TOPIC)
            if result:
                matched.add(result[0])
                continue
            stripped_q = _strip_diacritics(q)
            result_stripped = fuzz_process.extractOne(
                stripped_q, list(stripped_known.keys()), score_cutoff=FUZZY_THRESHOLD_TOPIC
            )
            if result_stripped:
                matched.add(stripped_known[result_stripped[0]])
            else:
                unresolved.append(q)

        if unresolved:
            matched.update(self._semantic_match(unresolved, known_values, SEMANTIC_THRESHOLD_TOPIC))
        if not matched:
            return [], False
        return list(matched), True

    def _semantic_match(self, queries: list[str], known_values: list[str], threshold: float) -> list[str]:
        if not queries or not known_values:
            return []
        known_vecs = [self._embed(v) for v in known_values]
        matched = []
        for q in queries:
            q_vec = self._embed(q)
            sims = [self._cosine_sim(q_vec, kv) for kv in known_vecs]
            best_idx = max(range(len(sims)), key=lambda i: sims[i])
            if sims[best_idx] >= threshold:
                matched.append(known_values[best_idx])
        return matched

    def _load_known_authors(self, guideline_ids: list[int]) -> list[str]:
        conn = None
        cursor = None
        try:
            conn = self.db_manager.get_connection()
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT DISTINCT a.full_name
                FROM author a
                JOIN guideline_authors ga ON ga.author_id = a.author_id
                WHERE ga.guideline_id = ANY(%s) AND a.full_name IS NOT NULL;
                """,
                (guideline_ids,),
            )
            return [row[0] for row in cursor.fetchall()]
        except Exception as e:
            print(f"❌ [Catalogue Search] load known_authors error: {e}")
            return []
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    def _load_known_titles(self, guideline_ids: list[int]) -> list[str]:
        conn = None
        cursor = None
        try:
            conn = self.db_manager.get_connection()
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT DISTINCT title FROM guidelines
                WHERE guideline_id = ANY(%s) AND title IS NOT NULL;
                """,
                (guideline_ids,),
            )
            return [row[0] for row in cursor.fetchall()]
        except Exception as e:
            print(f"❌ [Catalogue Search] load known_titles error: {e}")
            return []
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    # ---------- Execution ----------

    def _run(self, sql: str, guideline_ids: list[int], topics: list[str]):
        conn = None
        cursor = None
        try:
            conn = self.db_manager.get_connection()
            cursor = conn.cursor()
            cursor.execute("SET LOCAL statement_timeout = '5s';")
            cursor.execute(sql, (guideline_ids, topics))
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