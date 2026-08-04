from langchain_openai import ChatOpenAI

from core import config
from core.database import DatabaseManager
from core.prompts import TOPIC_ROUTER_PROMPT
from core.schemas import RouterState, TopicRouteDecision

FALLBACK_TOPIC = "khac"  # fallback topic for HyDE when no valid topic is found

class TopicRoutingNode:
    """Select allowed `guidelines.chu_de` values for an aggregate request."""

    def __init__(self):
        print("⏳ [TopicRouting] Initializing...")
        self.llm = ChatOpenAI(model=config.LLM_MODEL, api_key=config.OPENAI_API_KEY, temperature=0)
        self.db_manager = DatabaseManager()

    def _load_valid_topics(self, guideline_ids=None):
        """Fallback: tự query lại chu_de từ guidelines khi filtered_topics rỗng."""
        if guideline_ids is not None and not guideline_ids:
            return []
        conn = None
        cursor = None
        try:
            conn = self.db_manager.get_connection()
            cursor = conn.cursor()
            guideline_filter_sql = "AND guideline_id = ANY(%s)" if guideline_ids is not None else ""
            params = (guideline_ids,) if guideline_ids is not None else ()
            cursor.execute(
                f"""
                SELECT DISTINCT chu_de
                FROM guidelines
                WHERE chu_de IS NOT NULL
                  AND btrim(chu_de) <> ''
                  {guideline_filter_sql}
                ORDER BY chu_de;
                """,
                params,
            )
            return [row[0] for row in cursor.fetchall()]
        except Exception as e:
            print(f"❌ [TopicRouting DB Error] Không tải được valid topics: {e}")
            return []
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    def process(self, state: RouterState) -> dict:
        query = state.get("query", "")
        topics = state.get("filtered_topics") or []

        if not topics:
            print("⚠️ [TopicRouting] filtered_topics rỗng, fallback query lại DB...")
            topics = self._load_valid_topics(state.get("filtered_guideline_ids"))

        if not topics:
            print("⚠️ [TopicRouting] Không tìm thấy chủ đề hợp lệ.")
            return {"selected_topics": [], "hypothetical_document": query}

        topics_string = ", ".join(topics)
        prompt = TOPIC_ROUTER_PROMPT.format(topics_string=topics_string, query=query)
        allowed_names = set(topics) | {FALLBACK_TOPIC}

        try:
            decision = self.llm.with_structured_output(TopicRouteDecision).invoke(prompt)
            raw_selected = [t.name for t in decision.analyzed_topics if t.name in allowed_names]
            hyde = query # or decision.hypothetical_document
        except Exception as exc:
            print(f"❌ [TopicRouting] LLM error, fallback: {exc}")
            raw_selected, hyde = list(topics[:5]), query

        # "khac" không phải chu_de thật. Nếu LLM vẫn chọn được ít
        # nhất một chu_de thật trong whitelist thì giữ nguyên các chu_de đó
        # (bỏ token fallback); chỉ khi không còn chu_de thật nào mới mở rộng
        # về 5 chu_de đầu tiên để bước retrieval sau vẫn có dữ liệu.
        real_selected = [name for name in raw_selected if name != FALLBACK_TOPIC]
        selected_names = real_selected if real_selected else topics[:5]

        selected = [{"name": name} for name in selected_names]
        print(f"🧭 [TopicRouting] Điều phối đến: {selected_names}")

        
        return {"selected_topics": selected, "hypothetical_document": hyde}
