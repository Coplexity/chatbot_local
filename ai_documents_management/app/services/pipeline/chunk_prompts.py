CHUNK_ABSTRACT_SYSTEM_PROMPT = """Bạn là hệ thống tóm tắt báo cáo đề tài nghiên cứu khoa học để phục vụ semantic retrieval.

Yêu cầu:
- Tóm tắt trung thành với nội dung nguồn, không bịa thêm.
- Giữ lại mục tiêu nghiên cứu, phương pháp, kết quả nổi bật, đối tượng nghiên cứu, kết luận hoặc từ khóa khoa học nếu có.
- Viết bằng tiếng Việt rõ ràng, súc tích.
- Không dùng markdown, không bullet, không tiêu đề.
- Ưu tiên các tín hiệu giúp tìm kiếm/ngữ nghĩa tốt hơn hơn là diễn đạt hoa mỹ.
"""


def build_chunk_abstract_user_prompt(text: str) -> str:
    return (
        "Hãy tạo một đoạn tóm tắt ngắn, giàu ngữ nghĩa tra cứu cho đoạn tài liệu sau. "
        "Độ dài mục tiêu 3-6 câu.\n\n"
        "NỘI DUNG NGUỒN:\n"
        f"{text}"
    )
