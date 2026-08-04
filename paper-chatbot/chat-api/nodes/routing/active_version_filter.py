from core.database import DatabaseManager
from core.schemas import RouterState


class ActiveVersionFilterNode:
    """Lọc các version active từ guideline_versions theo chủ đề đã route."""

    def __init__(self):
        print("⏳ [Version Filter] Initializing...")
        self.db_manager = DatabaseManager()

    def process(self, state: RouterState):
        filtered_guideline_ids = state.get("filtered_guideline_ids", [])
        selected_topics = state.get("selected_topics", [])
        topic_values = [item["name"] for item in selected_topics if item.get("name")]

        if not filtered_guideline_ids:
            print("⚠️ [Version Filter] Không có guideline nào sau lọc owner_user_id.")
            return {"active_version_ids": []}
        if not topic_values:
            print("⚠️ [Version Filter] Không có chủ đề nào đã route.")
            return {"active_version_ids": []}

        conn = None
        cursor = None
        try:
            conn = self.db_manager.get_connection()
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT DISTINCT gv.version_id
                FROM guideline_versions gv
                JOIN guidelines g ON g.guideline_id = gv.guideline_id
                WHERE gv.status = 'active'
                  AND g.guideline_id = ANY(%s)
                  AND g.chu_de = ANY(%s)
                ORDER BY gv.version_id;
                """,
                (filtered_guideline_ids, topic_values),
            )
            version_ids = [row[0] for row in cursor.fetchall()]
            print(
                f"🧾 [Version Filter] guideline_ids={len(filtered_guideline_ids)}, "
                f"topics={topic_values}: tìm thấy {len(version_ids)} version active -> {version_ids}"
            )
            return {"active_version_ids": version_ids}
        except Exception as e:
            print(f"❌ [Version Filter Error] {e}")
            return {"active_version_ids": []}
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()