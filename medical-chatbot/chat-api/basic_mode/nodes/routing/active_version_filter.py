from core.database import DatabaseManager
from basic_mode.core.schemas import RouterState


class ActiveVersionFilterNode:
    """Lá»c cÃ¡c version active tá»« guideline_versions theo bá»‡nh Ä‘Ã£ route."""

    def __init__(self):
        print("â³ [Version Filter] Initializing...")
        self.db_manager = DatabaseManager()

    def process(self, state: RouterState):
        routed_diseases = state.get("routed_diseases", {})
        analyzed_specialties = state.get("analyzed_specialties", [])
        filtered_guideline_ids = state.get("filtered_guideline_ids")

        if filtered_guideline_ids is not None and not filtered_guideline_ids:
            print("âš ï¸ [Version Filter] KhÃ´ng cÃ³ guideline nÃ o sau lá»c owner_user_id.")
            return {"active_version_ids": []}

        specialty_values = [item["name"] for item in analyzed_specialties if item.get("name")]

        if not routed_diseases and not specialty_values:
            print("âš ï¸ [Version Filter] KhÃ´ng cÃ³ dá»¯ liá»‡u Ä‘á»ƒ lá»c version active.")
            return {"active_version_ids": []}

        candidate_pairs = [
            (chu_de, loai_van_ban)
            for chu_de, disease_names in routed_diseases.items()
            for loai_van_ban in disease_names
            if chu_de and loai_van_ban
        ]

        # Loáº¡i duplicate, giá»¯ thá»© tá»± xuáº¥t hiá»‡n.
        candidate_pairs = list(dict.fromkeys(candidate_pairs))

        conn = None
        cursor = None
        try:
            conn = self.db_manager.get_connection()
            cursor = conn.cursor()
            guideline_filter_sql = "AND g.guideline_id = ANY(%s)" if filtered_guideline_ids is not None else ""

            if candidate_pairs:
                pair_conditions = " OR ".join(
                    ["(g.chu_de = %s AND g.loai_van_ban = %s)"] * len(candidate_pairs)
                )
                params = [value for pair in candidate_pairs for value in pair]
                if filtered_guideline_ids is not None:
                    params.append(filtered_guideline_ids)
                cursor.execute(
                    f"""
                    SELECT DISTINCT gv.version_id
                    FROM guideline_versions gv
                    JOIN guidelines g ON g.guideline_id = gv.guideline_id
                    WHERE gv.status = 'active'
                      AND ({pair_conditions})
                      {guideline_filter_sql}
                    ORDER BY gv.version_id;
                    """,
                    tuple(params),
                )
            else:
                params = [specialty_values]
                if filtered_guideline_ids is not None:
                    params.append(filtered_guideline_ids)
                cursor.execute(
                    f"""
                    SELECT DISTINCT gv.version_id
                    FROM guideline_versions gv
                    JOIN guidelines g ON g.guideline_id = gv.guideline_id
                    WHERE gv.status = 'active'
                      AND g.chu_de = ANY(%s)
                      {guideline_filter_sql}
                    ORDER BY gv.version_id;
                    """,
                    tuple(params),
                )

            rows = cursor.fetchall()
            version_ids = [row[0] for row in rows]
            print(f"ðŸ§¾ [Version Filter] Active version IDs: {version_ids}")
            return {"active_version_ids": version_ids}
        except Exception as e:
            print(f"âŒ [Version Filter Error] {e}")
            return {"active_version_ids": []}
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

