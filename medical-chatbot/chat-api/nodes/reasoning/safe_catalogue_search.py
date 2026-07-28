from langchain_openai import ChatOpenAI

from core import config
from core.database import DatabaseManager
from core.schemas import CatalogueFilters, RouterState


class SafeCatalogueSearchNode:
    """Extract approved filters then execute a parameterized catalogue query.

    Neither user text nor LLM output is ever used as SQL syntax.
    """

    def __init__(self):
        self.llm = ChatOpenAI(model=config.LLM_MODEL, api_key=config.OPENAI_API_KEY, temperature=0)
        self.db_manager = DatabaseManager()

    def _filters(self, query: str) -> CatalogueFilters:
        return self.llm.with_structured_output(CatalogueFilters).invoke(
            "Extract only catalogue filters from this request. Do not infer SQL or fields outside the schema.\n"
            f"Request: {query}"
        )

    def process(self, state: RouterState) -> dict:
        allowed_ids = state.get("filtered_guideline_ids", [])
        if not allowed_ids:
            return {"response": "Không có tài liệu nào trong phạm vi quyền truy cập của bạn."}
        try:
            filters = self._filters(state["query"])
        except Exception as exc:
            print(f"[Catalogue] filter extraction failed: {exc}")
            filters = CatalogueFilters()

        where, params = ["g.guideline_id = ANY(%s)"], [allowed_ids]
        if filters.guideline_id is not None:
            where.append("g.guideline_id = %s"); params.append(filters.guideline_id)
        if filters.chu_de:
            where.append("g.chu_de ILIKE %s"); params.append(f"%{filters.chu_de.strip()}%")
        if filters.loai_van_ban:
            where.append("g.loai_van_ban ILIKE %s"); params.append(f"%{filters.loai_van_ban.strip()}%")
        if filters.doi_van_ban:
            where.append("g.doi_van_ban ILIKE %s"); params.append(f"%{filters.doi_van_ban.strip()}%")
        if filters.author:
            where.append("EXISTS (SELECT 1 FROM unnest(COALESCE(g.authors, ARRAY[]::text[])) a WHERE a ILIKE %s)")
            params.append(f"%{filters.author.strip()}%")

        conn = cursor = None
        try:
            conn = self.db_manager.get_connection(); cursor = conn.cursor()
            cursor.execute(
                "SELECT g.title, g.chu_de, g.loai_van_ban, g.doi_van_ban, g.authors "
                "FROM guidelines g WHERE " + " AND ".join(where) + " ORDER BY g.guideline_id LIMIT 50",
                tuple(params),
            )
            rows = cursor.fetchall()
            if not rows:
                return {"response": "Không tìm thấy tài liệu phù hợp trong phạm vi quyền truy cập."}
            lines = ["### Tài liệu tìm thấy"]
            for title, topic, doc_type, doi, authors in rows:
                lines.append(f"- **{title or 'Không có tiêu đề'}** — Chủ đề: {topic or '—'}; Loại: {doc_type or '—'}; DOI: {doi or '—'}; Tác giả: {', '.join(authors or []) or 'Không rõ'}")
            return {"response": "\n".join(lines)}
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
