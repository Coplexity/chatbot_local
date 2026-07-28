from core.database import DatabaseManager
from core.schemas import RouterState


class ActiveVersionFilterNode:
    """Return only active versions within the already authorized catalogue scope."""

    def __init__(self):
        self.db_manager = DatabaseManager()

    def process(self, state: RouterState) -> dict:
        guideline_ids = state.get("filtered_guideline_ids", [])
        document_types = state.get("selected_document_types", {})
        topics = [item.get("name") for item in state.get("selected_topics", []) if item.get("name")]
        if not guideline_ids or not topics:
            return {"active_version_ids": []}
        clauses, params = ["g.guideline_id = ANY(%s)", "g.chu_de = ANY(%s)"], [guideline_ids, topics]
        pairs = [(topic, doc_type) for topic, types in document_types.items() for doc_type in types]
        if pairs:
            clauses.append("(" + " OR ".join("(g.chu_de = %s AND g.loai_van_ban = %s)" for _ in pairs) + ")")
            params.extend(value for pair in pairs for value in pair)
        conn = cursor = None
        try:
            conn = self.db_manager.get_connection(); cursor = conn.cursor()
            cursor.execute("SELECT DISTINCT gv.version_id FROM guideline_versions gv JOIN guidelines g ON g.guideline_id = gv.guideline_id WHERE gv.status = 'active' AND " + " AND ".join(clauses) + " ORDER BY gv.version_id", tuple(params))
            return {"active_version_ids": [row[0] for row in cursor.fetchall()]}
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
