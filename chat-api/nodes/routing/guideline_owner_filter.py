from core.database import DatabaseManager
from core.schemas import RouterState


class GuidelineOwnerFilterNode:
    """Lọc guidelines theo owner_user_id trước khi định tuyến chuyên khoa."""

    def __init__(self):
        print("⏳ [Guideline Owner Filter] Initializing...")
        self.db_manager = DatabaseManager()

    @staticmethod
    def _normalize_user_id(user_id):
        if user_id is None or user_id == "":
            return None
        try:
            return int(user_id)
        except (TypeError, ValueError):
            print(f"⚠️ [Guideline Owner Filter] user_id không hợp lệ: {user_id!r}")
            return None

    def process(self, state: RouterState):
        raw_user_id = state.get("user_id")
        user_id = self._normalize_user_id(raw_user_id)
        if raw_user_id not in (None, "") and user_id is None:
            return {"filtered_guideline_ids": [], "filtered_specialties": []}

        conn = None
        cursor = None

        try:
            conn = self.db_manager.get_connection()
            cursor = conn.cursor()

            owner_filter_sql = ""
            params = []
            if user_id is not None:
                owner_filter_sql = "AND owner_user_id = %s"
                params.append(user_id)
            else:
                print("ℹ️ [Guideline Owner Filter] Không có user_id, dùng toàn bộ guidelines.")

            cursor.execute(
                f"""
                SELECT guideline_id, chuyen_khoa
                FROM guidelines
                WHERE chuyen_khoa IS NOT NULL
                  AND btrim(chuyen_khoa) <> ''
                  {owner_filter_sql}
                ORDER BY chuyen_khoa, guideline_id;
                """,
                tuple(params),
            )
            rows = cursor.fetchall()

            guideline_ids = [row[0] for row in rows]
            specialties = list(dict.fromkeys(row[1] for row in rows if row[1]))

            if user_id is not None:
                print(
                    f"🧩 [Guideline Owner Filter] user_id={user_id}: "
                    f"lọc được {len(guideline_ids)} guideline(s), {len(specialties)} chuyên khoa."
                )

            return {
                "filtered_guideline_ids": guideline_ids,
                "filtered_specialties": specialties,
            }
        except Exception as e:
            print(f"❌ [Guideline Owner Filter DB Error] {e}")
            return {"filtered_guideline_ids": [], "filtered_specialties": []}
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()