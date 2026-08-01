import sys
sys.stdout.reconfigure(encoding='utf-8')
import asyncio
import json
from app.schemas.guideline import GuidelineListItem, UpdateGuidelineMetadataRequest
from app.services.pipeline.chunking_service import BBoxChunkingService

def test_schemas():
    print("--- TESTING SCHEMAS ---")
    item = GuidelineListItem(
        guideline_id=1,
        title="Nghiên cứu về AI",
        doi_van_ban="10.1234/nckh",
        owner_user_id=1
    )
    print("GuidelineListItem created successfully:")
    print(item.model_dump())
    assert item.doi_van_ban == "10.1234/nckh"

    req = UpdateGuidelineMetadataRequest(
        doi_van_ban="10.5678/nckh2"
    )
    print("UpdateGuidelineMetadataRequest created successfully:")
    print(req.model_dump())
    assert req.doi_van_ban == "10.5678/nckh2"
    print("Schemas test passed!\n")

def test_chunking_payload():
    print("--- TESTING CHUNKING PAYLOAD ---")
    mock_toc_data = {
        "title": "Báo cáo Đề tài Ứng dụng AI",
        "loai_van_ban": "Cấp cơ sở",
        "don_vi_ban_hanh": "Đại học Bách Khoa",
        "chu_de": "Công nghệ thông tin",
        "abstract": "Tóm tắt đề tài AI...",
        "authors": ["Nguyễn Văn A", "Trần Thị B"],
        "doi_van_ban": "10.9999/test-doi",
        "source_file": "bao_cao_ai.pdf",
        "chapters": [
            {
                "title": "MỞ ĐẦU",
                "sections": []
            }
        ]
    }
    
    mock_ade_chunks = [
        {"id": "c1", "start_char": 0, "end_char": 100, "bboxes": []}
    ]
    
    mock_ocr_md = "<!-- PAGE BREAK -->\n# MỞ ĐẦU\nNội dung mở đầu..."
    
    payload = BBoxChunkingService.build_chunk_payload(
        ocr_md_text=mock_ocr_md,
        ade_chunks=mock_ade_chunks,
        toc_data=mock_toc_data
    )
    
    print("Chunk Payload Output:")
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    
    assert "doi_van_ban" in payload
    assert payload["doi_van_ban"] == "10.9999/test-doi"
    assert "don_vi_ban_hanh" in payload
    print("Chunking payload test passed!\n")

if __name__ == "__main__":
    try:
        test_schemas()
        test_chunking_payload()
        print("ALL TESTS PASSED SUCCESSFULLY! ✅")
    except Exception as e:
        print(f"TEST FAILED ❌: {e}")
