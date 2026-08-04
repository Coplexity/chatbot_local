from core.database import DatabaseManager
from core.schemas import RouterState


class GuidelineOwnerFilterNode:
    """Filter scientific documents by the authorized guideline owner scope.

    Quyền truy cập theo phả hệ (parent_id): 1 user được xem toàn bộ
    guideline thuộc về CHÍNH NÓ + TỔ TIÊN (đi lên theo parent_id) +
    HẬU DUỆ (đi xuống, mọi user có parent_id trỏ về nó, đệ quy).
    KHÔNG được xem của anh/em cùng cấp (cùng parent_id nhưng không phải
    tổ tiên/hậu duệ của nhau).
    """

    def __init__(self):
        print("[Guideline Owner Filter] Initializing...")
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
                print(f"[Guideline Owner Filter] user_id không hợp lệ: {user_id!r}")
                return []
        if isinstance(user_id, str):
            raw_parts = [part.strip() for part in user_id.split(",")]
            parts = [part for part in raw_parts if part]
            if not parts:
                return None
            try:
                return [int(part) for part in parts]
            except ValueError:
                print(f"[Guideline Owner Filter] user_id không hợp lệ: {user_id!r}")
                return []
        print(f"[Guideline Owner Filter] user_id không hợp lệ: {user_id!r}")
        return []

    @staticmethod
    def _load_admin_user_ids(cursor):
        cursor.execute(
            """
            SELECT user_id
            FROM users
            WHERE role = 'admin'
            ORDER BY user_id;
            """
        )
        return [row[0] for row in cursor.fetchall()]

    @staticmethod
    def _expand_hierarchy_scope(cursor, user_ids: list[int], max_depth: int = 50) -> list[int]:
        """Mở rộng user_ids gốc thành: chính nó + toàn bộ tổ tiên (parent_id
        đi lên) + toàn bộ hậu duệ (đi xuống, đệ quy). Không bao gồm sibling.
        max_depth chặn cứng số vòng lặp đệ quy, phòng dữ liệu parent_id bị
        lỗi tạo thành chu trình (cycle) khiến CTE chạy vô hạn."""
        cursor.execute(
            """
            WITH RECURSIVE ancestors AS (
                SELECT user_id, parent_id, 0 AS depth
                FROM users WHERE user_id = ANY(%s)
                UNION
                SELECT u.user_id, u.parent_id, a.depth + 1
                FROM users u
                JOIN ancestors a ON u.user_id = a.parent_id
                WHERE a.depth < %s
            ),
            descendants AS (
                SELECT user_id, parent_id, 0 AS depth
                FROM users WHERE user_id = ANY(%s)
                UNION
                SELECT u.user_id, u.parent_id, d.depth + 1
                FROM users u
                JOIN descendants d ON u.parent_id = d.user_id
                WHERE d.depth < %s
            )
            SELECT DISTINCT user_id FROM (
                SELECT user_id FROM ancestors
                UNION
                SELECT user_id FROM descendants
            ) combined;
            """,
            (user_ids, max_depth, user_ids, max_depth),
        )
        return [row[0] for row in cursor.fetchall()]

    def process(self, state: RouterState):
        raw_user_ids = state.get("user_ids")
        user_ids = self._normalize_user_ids(raw_user_ids)
        if user_ids == []:
            return {"filtered_guideline_ids": [], "filtered_topics": []}

        conn = None
        cursor = None

        try:
            conn = self.db_manager.get_connection()
            cursor = conn.cursor()

            if user_ids is None:
                user_ids = self._load_admin_user_ids(cursor)
                if not user_ids:
                    print("[Guideline Owner Filter] Không tìm thấy user role='admin'.")
                    return {"filtered_guideline_ids": [], "filtered_topics": []}
                print(f"[Guideline Owner Filter] Không có user_ids, dùng admin user_ids={user_ids}.")

            scoped_user_ids = self._expand_hierarchy_scope(cursor, user_ids)
            print(
                f"[Guideline Owner Filter] user_ids gốc={user_ids} -> "
                f"mở rộng theo phả hệ thành {len(scoped_user_ids)} user(s): {scoped_user_ids}"
            )

            if not scoped_user_ids:
                return {"filtered_guideline_ids": [], "filtered_topics": []}

            cursor.execute(
                """
                SELECT guideline_id, chu_de
                FROM guidelines
                WHERE chu_de IS NOT NULL
                  AND btrim(chu_de) <> ''
                  AND owner_user_id = ANY(%s)
                ORDER BY chu_de, guideline_id;
                """,
                (scoped_user_ids,),
            )
            rows = cursor.fetchall()

            guideline_ids = [row[0] for row in rows]
            topics = list(dict.fromkeys(row[1] for row in rows if row[1]))

            print(
                f"[Guideline Owner Filter] scoped_user_ids={scoped_user_ids}: "
                f"lọc được {len(guideline_ids)} guideline(s), {len(topics)} chủ đề"
            )

            return {
                "filtered_guideline_ids": guideline_ids,
                "filtered_topics": topics,
            }
        except Exception as e:
            print(f"[Guideline Owner Filter DB Error] {e}")
            return {"filtered_guideline_ids": [], "filtered_topics": []}
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()