from core.database import DatabaseManager
from basic_mode.core.schemas import RouterState


class GuidelineOwnerFilterNode:
    """Lá»c guidelines theo owner_user_id trÆ°á»›c khi Ä‘á»‹nh tuyáº¿n chuyÃªn khoa."""

    def __init__(self):
        print("â³ [Guideline Owner Filter] Initializing...")
        self.db_manager = DatabaseManager()

    @staticmethod
    def _normalize_user_ids(user_id):
        if user_id is None or user_id == "":
            return None
        if isinstance(user_id, int):
            return [user_id]
        if isinstance(user_id, (list, tuple, set)):
            parts = [str(part).strip() for part in user_id if str(part).strip()]
            if not parts:
                return None
            try:
                return [int(part) for part in parts]
            except ValueError:
                print(f"âš ï¸ [Guideline Owner Filter] user_id khÃ´ng há»£p lá»‡: {user_id!r}")
                return []
        if isinstance(user_id, str):
            raw_parts = [part.strip() for part in user_id.split(",")]
            parts = [part for part in raw_parts if part]
            if not parts:
                return None
            try:
                return [int(part) for part in parts]
            except ValueError:
                print(f"âš ï¸ [Guideline Owner Filter] user_id khÃ´ng há»£p lá»‡: {user_id!r}")
                return []
        print(f"âš ï¸ [Guideline Owner Filter] user_id khÃ´ng há»£p lá»‡: {user_id!r}")
        return []

    @staticmethod
    def _load_admin_user_ids(cursor):
        cursor.execute(
            """
            SELECT user_id
            FROM author
            WHERE role = 'admin'
            ORDER BY user_id;
            """
        )
        return [row[0] for row in cursor.fetchall()]

    def process(self, state: RouterState):
        raw_user_ids = state.get("user_ids")
        user_ids = self._normalize_user_ids(raw_user_ids)
        if user_ids == []:
            return {"filtered_guideline_ids": [], "filtered_specialties": []}

        conn = None
        cursor = None

        try:
            conn = self.db_manager.get_connection()
            cursor = conn.cursor()

            if user_ids is None:
                user_ids = self._load_admin_user_ids(cursor)
                if not user_ids:
                    print("âš ï¸ [Guideline Owner Filter] KhÃ´ng tÃ¬m tháº¥y user role='admin'.")
                    return {"filtered_guideline_ids": [], "filtered_specialties": []}
                print(f"ðŸ§© [Guideline Owner Filter] KhÃ´ng cÃ³ user_ids, dÃ¹ng admin user_ids={user_ids}.")

            owner_filter_sql = ""
            params = []
            if user_ids is not None:
                owner_filter_sql = "AND owner_user_id = ANY(%s)"
                params.append(user_ids)
            else:
                print("â„¹ï¸ [Guideline Owner Filter] KhÃ´ng cÃ³ user_ids, dÃ¹ng toÃ n bá»™ guidelines.")

            cursor.execute(
                f"""
                SELECT guideline_id, chu_de
                FROM guidelines
                WHERE chu_de IS NOT NULL
                  AND btrim(chu_de) <> ''
                  {owner_filter_sql}
                ORDER BY chu_de, guideline_id;
                """,
                tuple(params),
            )
            rows = cursor.fetchall()

            guideline_ids = [row[0] for row in rows]
            specialties = list(dict.fromkeys(row[1] for row in rows if row[1]))

            if user_ids is not None:
                print(
                    f"ðŸ§© [Guideline Owner Filter] user_ids={user_ids}: "
                    f"lá»c Ä‘Æ°á»£c {len(guideline_ids)} guideline(s), {len(specialties)} chuyÃªn khoa."
                )

            return {
                "filtered_guideline_ids": guideline_ids,
                "filtered_specialties": specialties,
            }
        except Exception as e:
            print(f"âŒ [Guideline Owner Filter DB Error] {e}")
            return {"filtered_guideline_ids": [], "filtered_specialties": []}
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

