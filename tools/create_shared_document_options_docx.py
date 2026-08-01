from __future__ import annotations

import datetime as dt
import os
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "docs"
OUTPUT_FILE = OUTPUT_DIR / "PHUONG_AN_KHO_TAI_LIEU_DUNG_CHUNG.docx"


def xml_text(value: object) -> str:
    return escape(str(value), {'"': "&quot;"})


def run(
    text: str,
    *,
    bold: bool = False,
    italic: bool = False,
    color: str | None = None,
    size: int | None = None,
) -> str:
    properties: list[str] = []
    if bold:
        properties.append("<w:b/>")
    if italic:
        properties.append("<w:i/>")
    if color:
        properties.append(f'<w:color w:val="{color}"/>')
    if size:
        properties.append(f'<w:sz w:val="{size}"/><w:szCs w:val="{size}"/>')
    rpr = f"<w:rPr>{''.join(properties)}</w:rPr>" if properties else ""
    return (
        f"<w:r>{rpr}<w:t xml:space=\"preserve\">"
        f"{xml_text(text)}</w:t></w:r>"
    )


def paragraph(
    text: str = "",
    *,
    style: str | None = None,
    align: str | None = None,
    before: int | None = None,
    after: int | None = None,
    keep_next: bool = False,
    bold: bool = False,
    italic: bool = False,
    color: str | None = None,
    size: int | None = None,
) -> str:
    ppr: list[str] = []
    if style:
        ppr.append(f'<w:pStyle w:val="{style}"/>')
    if align:
        ppr.append(f'<w:jc w:val="{align}"/>')
    if before is not None or after is not None:
        attrs = []
        if before is not None:
            attrs.append(f'w:before="{before}"')
        if after is not None:
            attrs.append(f'w:after="{after}"')
        ppr.append(f"<w:spacing {' '.join(attrs)}/>")
    if keep_next:
        ppr.append("<w:keepNext/>")
    prop_xml = f"<w:pPr>{''.join(ppr)}</w:pPr>" if ppr else ""
    content = run(text, bold=bold, italic=italic, color=color, size=size) if text else ""
    return f"<w:p>{prop_xml}{content}</w:p>"


def rich_paragraph(
    pieces: list[dict[str, object]],
    *,
    style: str | None = None,
    align: str | None = None,
    before: int | None = None,
    after: int | None = None,
) -> str:
    ppr: list[str] = []
    if style:
        ppr.append(f'<w:pStyle w:val="{style}"/>')
    if align:
        ppr.append(f'<w:jc w:val="{align}"/>')
    if before is not None or after is not None:
        attrs = []
        if before is not None:
            attrs.append(f'w:before="{before}"')
        if after is not None:
            attrs.append(f'w:after="{after}"')
        ppr.append(f"<w:spacing {' '.join(attrs)}/>")
    prop_xml = f"<w:pPr>{''.join(ppr)}</w:pPr>" if ppr else ""
    content = "".join(
        run(
            str(piece.get("text", "")),
            bold=bool(piece.get("bold", False)),
            italic=bool(piece.get("italic", False)),
            color=str(piece["color"]) if piece.get("color") else None,
            size=int(piece["size"]) if piece.get("size") else None,
        )
        for piece in pieces
    )
    return f"<w:p>{prop_xml}{content}</w:p>"


def bullet(text: str, level: int = 0) -> str:
    return (
        "<w:p>"
        "<w:pPr>"
        '<w:pStyle w:val="ListParagraph"/>'
        f'<w:numPr><w:ilvl w:val="{level}"/><w:numId w:val="1"/></w:numPr>'
        "</w:pPr>"
        f"{run(text)}"
        "</w:p>"
    )


def numbered(text: str, level: int = 0) -> str:
    return (
        "<w:p>"
        "<w:pPr>"
        '<w:pStyle w:val="ListParagraph"/>'
        f'<w:numPr><w:ilvl w:val="{level}"/><w:numId w:val="2"/></w:numPr>'
        "</w:pPr>"
        f"{run(text)}"
        "</w:p>"
    )


def page_break() -> str:
    return "<w:p><w:r><w:br w:type=\"page\"/></w:r></w:p>"


def cell(
    content: str,
    *,
    width: int,
    shade: str | None = None,
    bold: bool = False,
    color: str | None = None,
    align: str | None = None,
) -> str:
    tcpr = [f'<w:tcW w:w="{width}" w:type="dxa"/>']
    if shade:
        tcpr.append(f'<w:shd w:val="clear" w:color="auto" w:fill="{shade}"/>')
    p = paragraph(
        content,
        align=align,
        before=30,
        after=30,
        bold=bold,
        color=color,
    )
    return f"<w:tc><w:tcPr>{''.join(tcpr)}</w:tcPr>{p}</w:tc>"


def table(
    headers: list[str],
    rows: list[list[str]],
    *,
    widths: list[int] | None = None,
    header_fill: str = "1F4E78",
) -> str:
    column_count = len(headers)
    widths = widths or [int(9360 / column_count)] * column_count
    grid = "".join(f'<w:gridCol w:w="{width}"/>' for width in widths)
    border = (
        "<w:tblBorders>"
        '<w:top w:val="single" w:sz="4" w:color="B7C9D6"/>'
        '<w:left w:val="single" w:sz="4" w:color="B7C9D6"/>'
        '<w:bottom w:val="single" w:sz="4" w:color="B7C9D6"/>'
        '<w:right w:val="single" w:sz="4" w:color="B7C9D6"/>'
        '<w:insideH w:val="single" w:sz="4" w:color="D9E2E8"/>'
        '<w:insideV w:val="single" w:sz="4" w:color="D9E2E8"/>'
        "</w:tblBorders>"
    )
    output = [
        "<w:tbl>",
        "<w:tblPr>",
        '<w:tblW w:w="9360" w:type="dxa"/>',
        '<w:tblLayout w:type="fixed"/>',
        border,
        '<w:tblCellMar><w:top w:w="90" w:type="dxa"/><w:left w:w="100" w:type="dxa"/>'
        '<w:bottom w:w="90" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar>',
        "</w:tblPr>",
        f"<w:tblGrid>{grid}</w:tblGrid>",
        "<w:tr>",
        '<w:trPr><w:tblHeader/></w:trPr>',
    ]
    for header, width in zip(headers, widths):
        output.append(
            cell(
                header,
                width=width,
                shade=header_fill,
                bold=True,
                color="FFFFFF",
                align="center",
            )
        )
    output.append("</w:tr>")
    for row_index, row in enumerate(rows):
        output.append("<w:tr>")
        fill = "F4F8FB" if row_index % 2 else None
        for value, width in zip(row, widths):
            output.append(cell(value, width=width, shade=fill))
        output.append("</w:tr>")
    output.append("</w:tbl>")
    return "".join(output)


def callout(title: str, text: str, *, fill: str = "EAF3F8", accent: str = "1F4E78") -> str:
    content = rich_paragraph(
        [
            {"text": f"{title}: ", "bold": True, "color": accent},
            {"text": text},
        ],
        before=40,
        after=40,
    )
    return (
        "<w:tbl><w:tblPr>"
        '<w:tblW w:w="9360" w:type="dxa"/>'
        '<w:tblBorders><w:left w:val="single" w:sz="18" w:color="'
        f'{accent}"/></w:tblBorders>'
        "</w:tblPr><w:tblGrid><w:gridCol w:w=\"9360\"/></w:tblGrid>"
        "<w:tr><w:tc><w:tcPr><w:tcW w:w=\"9360\" w:type=\"dxa\"/>"
        f'<w:shd w:val="clear" w:color="auto" w:fill="{fill}"/>'
        '<w:tcMar><w:top w:w="140" w:type="dxa"/><w:left w:w="180" w:type="dxa"/>'
        '<w:bottom w:w="140" w:type="dxa"/><w:right w:w="180" w:type="dxa"/></w:tcMar>'
        f"</w:tcPr>{content}</w:tc></w:tr></w:tbl>"
    )


def architecture_box(lines: list[str]) -> str:
    rows = [[line] for line in lines]
    return table(["Luồng kiến trúc"], rows, widths=[9360], header_fill="31708E")


def section_title(number: str, title: str) -> str:
    return paragraph(f"{number}. {title}", style="Heading1")


def subsection(title: str) -> str:
    return paragraph(title, style="Heading2")


def build_document_body() -> str:
    parts: list[str] = []

    # Cover
    parts.extend(
        [
            paragraph("CHATBOT LOCAL — TEAM 5 THÀNH VIÊN", align="center", color="5B6573", size=20),
            paragraph("", after=360),
            paragraph(
                "PHƯƠNG ÁN XÂY DỰNG",
                align="center",
                bold=True,
                color="1F4E78",
                size=36,
            ),
            paragraph(
                "KHO TÀI LIỆU RAG DÙNG CHUNG",
                align="center",
                bold=True,
                color="1F4E78",
                size=36,
            ),
            paragraph("", after=160),
            paragraph(
                "So sánh phương án máy chủ nội bộ miễn phí và phương án dịch vụ cloud miễn phí",
                align="center",
                italic=True,
                color="44546A",
                size=23,
            ),
            paragraph("", after=600),
            callout(
                "Mục tiêu",
                "Mỗi tài liệu chỉ được tải lên, OCR, chia chunk và tạo embedding một lần; "
                "sau đó cả nhóm cùng sử dụng để giảm thời gian và chi phí xử lý tài liệu.",
            ),
            paragraph("", after=540),
            table(
                ["Thông tin", "Nội dung"],
                [
                    ["Phạm vi", "Kho tài liệu, chunks, embeddings, file gốc và backend dùng chung"],
                    ["Đối tượng", "Nhóm phát triển 5 thành viên"],
                    ["Phiên bản", "1.0 — phục vụ họp và ra quyết định"],
                    ["Ngày lập", "23/07/2026"],
                ],
                widths=[2200, 7160],
            ),
            page_break(),
        ]
    )

    # Executive summary
    parts.extend(
        [
            section_title("1", "Tóm tắt để ra quyết định"),
            paragraph(
                "Dự án hiện đã dùng PostgreSQL + pgvector và lưu chunks/embeddings trong cơ sở dữ liệu. "
                "Vì vậy nhóm không cần thay kiến trúc RAG; việc cần làm là đặt database, file tài liệu và "
                "backend tại một nơi dùng chung, đồng thời ngăn xử lý trùng bằng mã băm nội dung.",
            ),
            table(
                ["Phương án", "Dữ liệu nằm ở đâu?", "Chi phí hạ tầng", "Phù hợp nhất khi"],
                [
                    [
                        "A. Máy chủ của team",
                        "Một PC/laptop do team chỉ định",
                        "0 đồng; chỉ có điện và Internet",
                        "Ưu tiên tiết kiệm, có máy có thể bật khi cần",
                    ],
                    [
                        "B. Cloud Free Tier",
                        "Database và file nằm trên hạ tầng nhà cung cấp",
                        "0 đồng trong hạn mức miễn phí",
                        "Cần truy cập từ xa thuận tiện, dữ liệu còn ít",
                    ],
                ],
                widths=[1900, 2600, 2200, 2660],
            ),
            paragraph(""),
            callout(
                "Khuyến nghị sơ bộ",
                "Bắt đầu với Phương án A vì không bị giới hạn 500 MB database và tận dụng được code Docker "
                "hiện có. Dùng Tailscale để 5 người truy cập an toàn. Khi yêu cầu uptime hoặc dung lượng "
                "thay đổi, có thể chuyển từng phần sang cloud mà không phải làm lại dữ liệu.",
                fill="E2F0D9",
                accent="548235",
            ),
            subsection("Quyết định nhóm cần thống nhất trong cuộc họp"),
            bullet("Có máy nào đủ ổn định để làm máy chủ chung và ai chịu trách nhiệm vận hành?"),
            bullet("Tài liệu có nhạy cảm hoặc chứa dữ liệu y tế/cá nhân không?"),
            bullet("Dung lượng tài liệu dự kiến trong 3–6 tháng là bao nhiêu?"),
            bullet("Nhóm chấp nhận máy chủ có thể tạm ngừng khi mất điện/mất mạng hay cần hoạt động 24/7?"),
            bullet("Ai có quyền upload, rebuild chunks, kích hoạt phiên bản và xóa tài liệu?"),
        ]
    )

    # Problem and principles
    parts.extend(
        [
            section_title("2", "Bài toán hiện tại và nguyên tắc chung"),
            subsection("2.1. Vấn đề cần giải quyết"),
            bullet("Mỗi thành viên chạy local nên cùng một văn bản có thể bị upload và xử lý nhiều lần."),
            bullet("OCR, tóm tắt, chia chunk và embedding lặp lại gây tốn tiền và thời gian."),
            bullet("Database local khiến mỗi người nhìn thấy một tập tài liệu khác nhau."),
            bullet("Khó kiểm soát phiên bản tài liệu nào đang active và ai đã thay đổi nội dung."),
            subsection("2.2. Thành phần dữ liệu cần dùng chung"),
            table(
                ["Nhóm dữ liệu", "Ví dụ", "Nơi lưu phù hợp"],
                [
                    ["Dữ liệu nghiệp vụ", "Tài khoản, guideline, version, quyền truy cập", "PostgreSQL"],
                    ["Dữ liệu RAG", "Chunks, text_abstract, embedding", "PostgreSQL + pgvector"],
                    ["File gốc", "PDF/DOCX tải lên", "Ổ đĩa máy chủ hoặc Object Storage"],
                    ["Artifact xử lý", "OCR markdown, JSON, ảnh, bảng", "Ổ đĩa máy chủ hoặc Object Storage"],
                    ["Cấu hình bí mật", "API keys, database password", "Biến môi trường phía backend"],
                ],
                widths=[2100, 3460, 3800],
            ),
            subsection("2.3. Nguyên tắc chống phát sinh phí trùng"),
            numbered("Tính SHA-256 của file ngay khi nhận upload."),
            numbered("Nếu content_hash đã tồn tại, không OCR/chunk/embed lại; chỉ trả về tài liệu có sẵn."),
            numbered("Tính chunk_hash sau bước chuẩn hóa nội dung."),
            numbered("Chunk không đổi được dùng lại embedding; chỉ xử lý chunk mới hoặc bị sửa."),
            numbered("Lưu embedding_model và embedding_version để không tái sử dụng vector sai model."),
            callout(
                "Lưu ý",
                "Dùng database chung chưa đủ để chống phí trùng. Ứng dụng vẫn phải kiểm tra hash và khóa "
                "job xử lý để hai người upload cùng lúc không tạo hai pipeline song song.",
                fill="FFF2CC",
                accent="BF9000",
            ),
        ]
    )

    # Option A
    parts.extend(
        [
            page_break(),
            section_title("3", "Phương án A — Một máy của team làm máy chủ chung"),
            paragraph(
                "Một PC hoặc laptop của nhóm chạy PostgreSQL/pgvector, backend quản lý tài liệu, chat API "
                "và nơi lưu file. Các thành viên kết nối qua mạng riêng Tailscale; không mở PostgreSQL trực "
                "tiếp ra Internet.",
            ),
            subsection("3.1. Dữ liệu được lưu ở đâu?"),
            callout(
                "Trả lời ngắn",
                "Toàn bộ dữ liệu chính nằm trên ổ đĩa của máy chủ được chỉ định. Máy của các thành viên "
                "khác chỉ là thiết bị truy cập, không cần giữ bản database riêng.",
            ),
            architecture_box(
                [
                    "5 thành viên → Tailscale (mạng riêng được mã hóa)",
                    "→ Frontend/Backend trên máy chủ của team",
                    "→ PostgreSQL + pgvector: users, documents, versions, chunks, embeddings",
                    "→ Ổ đĩa máy chủ: PDF/DOCX gốc, OCR, JSON, ảnh và artifacts",
                    "→ Backup định kỳ: ổ cứng thứ hai hoặc kho lưu trữ mã hóa",
                ]
            ),
            subsection("3.2. Thành phần và yêu cầu tối thiểu"),
            table(
                ["Thành phần", "Khuyến nghị ban đầu"],
                [
                    ["Máy chủ", "PC/laptop có SSD; RAM 8 GB tối thiểu, 16 GB tốt hơn"],
                    ["Hệ điều hành", "Windows/Linux; Docker Desktop hoặc Docker Engine"],
                    ["Database", "PostgreSQL 16 + pgvector, chạy bằng Docker Compose hiện có"],
                    ["Truy cập nhóm", "Tailscale Personal, tối đa 6 người miễn phí"],
                    ["Ổ đĩa", "Tùy lượng tài liệu; nên còn trống ít nhất 50–100 GB"],
                    ["Backup", "pg_dump + thư mục uploads/artifacts; tối thiểu mỗi ngày"],
                ],
                widths=[2500, 6860],
            ),
            paragraph(
                "Ghi chú: nếu dự án được vận hành cho mục đích thương mại, cần kiểm tra điều khoản sử dụng "
                "của gói Tailscale Personal; có thể thay bằng Cloudflare Tunnel/Zero Trust Free cho nhóm dưới "
                "50 người.",
                italic=True,
                color="5B6573",
            ),
            subsection("3.3. Chi phí"),
            table(
                ["Khoản mục", "Chi phí dự kiến", "Ghi chú"],
                [
                    ["PostgreSQL/pgvector", "0 đồng", "Phần mềm mã nguồn mở, chạy trên máy có sẵn"],
                    ["Tailscale Personal", "0 đồng", "Đủ cho nhóm 5 người theo giới hạn 6 người"],
                    ["Lưu trữ", "0 đồng", "Dùng ổ đĩa hiện có"],
                    ["Backend", "0 đồng", "Chạy Docker trên máy chủ"],
                    ["Điện/Internet", "Chi phí gián tiếp", "Máy phải bật khi nhóm sử dụng"],
                    ["OCR/OpenAI/LLM", "Theo mức sử dụng", "Vẫn phát sinh nhưng tài liệu chỉ xử lý một lần"],
                ],
                widths=[2500, 2000, 4860],
            ),
            subsection("3.4. Ưu điểm"),
            bullet("Không có giới hạn cloud 500 MB cho vector database."),
            bullet("Tận dụng Docker Compose và cấu trúc PostgreSQL/pgvector hiện tại."),
            bullet("File nhạy cảm không phải đưa lên dịch vụ lưu trữ của bên thứ ba."),
            bullet("Chi phí hạ tầng gần như bằng 0 và dễ tăng dung lượng bằng cách nâng ổ cứng."),
            subsection("3.5. Nhược điểm và rủi ro"),
            bullet("Máy chủ tắt, mất điện hoặc mất mạng thì cả nhóm không sử dụng được."),
            bullet("Hỏng SSD hoặc mất máy có thể làm mất dữ liệu nếu không có backup."),
            bullet("Một người phải chịu trách nhiệm cập nhật, giám sát và khôi phục."),
            bullet("Không có SLA; hiệu năng phụ thuộc cấu hình máy và đường truyền Internet."),
            subsection("3.6. Bảo mật bắt buộc"),
            bullet("Không port-forward và không công khai cổng PostgreSQL 5432."),
            bullet("Chỉ cho phép truy cập frontend/backend qua Tailscale hoặc Zero Trust."),
            bullet("Mỗi thành viên có tài khoản riêng; không dùng chung tài khoản admin."),
            bullet("API key chỉ nằm ở backend/.env; tuyệt đối không đưa vào frontend hoặc Git."),
            bullet("Mã hóa ổ đĩa bằng BitLocker/LUKS nếu tài liệu có dữ liệu nhạy cảm."),
            bullet("Thu hồi quyền Tailscale và tài khoản ứng dụng ngay khi thành viên rời nhóm."),
            subsection("3.7. Backup và khôi phục"),
            table(
                ["Hạng mục", "Cách backup", "Tần suất"],
                [
                    ["PostgreSQL", "pg_dump dạng custom archive", "Hằng đêm"],
                    ["File gốc/artifact", "Đồng bộ bản sao có mã hóa", "Hằng đêm"],
                    ["Cấu hình", "Lưu mẫu .env không chứa secret; secret ở password manager", "Khi thay đổi"],
                    ["Kiểm tra restore", "Dựng database thử từ bản backup", "Mỗi tháng"],
                ],
                widths=[2200, 4760, 2400],
            ),
        ]
    )

    # Option B
    parts.extend(
        [
            page_break(),
            section_title("4", "Phương án B — Dùng dịch vụ cloud miễn phí"),
            paragraph(
                "Database/chunks và file gốc được lưu trên hạ tầng cloud. Thành viên có thể truy cập từ "
                "mọi nơi mà không phụ thuộc ổ đĩa của một cá nhân. Tuy nhiên backend xử lý OCR/chunk/embed "
                "vẫn cần một nơi để chạy.",
            ),
            subsection("4.1. Kiến trúc đề xuất"),
            architecture_box(
                [
                    "5 thành viên → Frontend/Backend dùng chung",
                    "→ Supabase Free: PostgreSQL + pgvector và có thể lưu file trong Storage",
                    "HOẶC",
                    "→ Neon Free: PostgreSQL + pgvector",
                    "→ Cloudflare R2 Free: PDF/DOCX và artifacts",
                    "→ Một máy/runner chạy pipeline OCR, chunk và embedding",
                ]
            ),
            subsection("4.2. Hai cấu hình cloud có thể chọn"),
            table(
                ["Cấu hình", "Database/vector", "File gốc", "Nhận xét"],
                [
                    [
                        "B1. Supabase toàn bộ",
                        "Supabase Free — 500 MB",
                        "Supabase Storage — 1 GB",
                        "Dễ quản lý nhất, ít dịch vụ",
                    ],
                    [
                        "B2. Neon + R2",
                        "Neon Free — 0,5 GB",
                        "Cloudflare R2 — 10 GB miễn phí",
                        "Nhiều dung lượng file hơn, cấu hình phức tạp hơn",
                    ],
                ],
                widths=[1800, 2350, 2600, 2610],
            ),
            subsection("4.3. Chi phí và giới hạn free tier tại thời điểm lập tài liệu"),
            table(
                ["Dịch vụ", "Mức miễn phí chính", "Điểm cần lưu ý"],
                [
                    [
                        "Supabase Free",
                        "500 MB database; 1 GB file; 2 project active",
                        "Có thể pause sau 1 tuần không hoạt động; không có backup tự động",
                    ],
                    [
                        "Neon Free",
                        "0,5 GB/project; 100 CU-giờ/tháng/project",
                        "Compute scale-to-zero khi không hoạt động",
                    ],
                    [
                        "Cloudflare R2",
                        "10 GB-tháng; 1 triệu ghi và 10 triệu đọc/tháng",
                        "Egress trực tiếp miễn phí; vượt hạn mức tính theo usage",
                    ],
                    [
                        "Backend/worker",
                        "Có thể chạy trên máy của team",
                        "Free host thường sleep hoặc giới hạn CPU/thời gian xử lý",
                    ],
                ],
                widths=[2100, 3400, 3860],
            ),
            subsection("4.4. Vì sao 500 MB có thể nhanh đầy?"),
            paragraph(
                "Dự án hiện dùng halfvec(3072). Mỗi embedding thô chiếm khoảng 3.072 × 2 byte = 6.144 byte, "
                "chưa tính nội dung chunk, abstract, metadata, khóa và vector index.",
            ),
            table(
                ["Số chunks", "Dung lượng vector thô xấp xỉ", "Thực tế"],
                [
                    ["10.000", "58,6 MiB", "Cao hơn sau khi cộng text và index"],
                    ["25.000", "146,5 MiB", "Cần theo dõi database size"],
                    ["50.000", "293 MiB", "Có nguy cơ sát/vượt 500 MB khi cộng phần còn lại"],
                ],
                widths=[2200, 3200, 3960],
            ),
            callout(
                "Kết luận dung lượng",
                "Cloud Free Tier phù hợp để thử nghiệm hoặc kho tài liệu nhỏ. Không nên coi giới hạn 500 MB "
                "là 500 MB dành riêng cho embeddings.",
                fill="FFF2CC",
                accent="BF9000",
            ),
            subsection("4.5. Ưu điểm"),
            bullet("Không phụ thuộc ổ cứng hoặc địa điểm của một thành viên."),
            bullet("Truy cập từ xa thuận tiện và database do nhà cung cấp vận hành."),
            bullet("Dễ chuyển sang gói trả phí khi dự án tăng trưởng."),
            bullet("R2 có 10 GB miễn phí, phù hợp lưu PDF/artifact nhỏ và vừa."),
            subsection("4.6. Nhược điểm và rủi ro"),
            bullet("Giới hạn database vector nhỏ; có thể phải trả phí hoặc di chuyển sớm."),
            bullet("Backend/pipeline OCR vẫn phải chạy ở đâu đó; cloud database không thay thế worker."),
            bullet("Dữ liệu được lưu tại bên thứ ba, cần xem xét yêu cầu dữ liệu y tế/cá nhân."),
            bullet("Phải cấu hình quyền truy cập, bucket private, SSL và secret cẩn thận."),
            bullet("Backup database và object storage là hai việc riêng; backup DB không bao gồm file."),
            subsection("4.7. Bảo mật bắt buộc"),
            bullet("Chỉ backend được giữ database service key; frontend không kết nối bằng quyền quản trị."),
            bullet("Bật Row Level Security nếu frontend truy cập Supabase Data API."),
            bullet("Bucket tài liệu phải private; tải file qua signed URL hoặc endpoint có xác thực."),
            bullet("Giới hạn quyền upload/rebuild cho editor/admin."),
            bullet("Theo dõi dung lượng và đặt spend cap/cảnh báo trước khi bật thanh toán."),
        ]
    )

    # Comparison
    parts.extend(
        [
            page_break(),
            section_title("5", "So sánh trực tiếp"),
            table(
                ["Tiêu chí", "A. Máy chủ của team", "B. Cloud Free Tier"],
                [
                    ["Chi phí hạ tầng", "0 đồng nếu có sẵn máy", "0 đồng trong hạn mức"],
                    ["Dung lượng vector", "Theo ổ cứng, dễ mở rộng", "Khoảng 500 MB database"],
                    ["Dữ liệu nằm ở đâu", "Trên máy chủ của team", "Trên nhà cung cấp cloud"],
                    ["Truy cập từ xa", "Qua Tailscale/Zero Trust", "Có sẵn qua Internet + SSL"],
                    ["Uptime", "Phụ thuộc máy, điện và mạng", "Tốt hơn nhưng free tier có thể sleep/pause"],
                    ["Backup", "Team tự chịu trách nhiệm", "Free tier vẫn cần tự thiết kế backup"],
                    ["Độ khó ban đầu", "Trung bình", "Trung bình"],
                    ["Bảo mật dữ liệu", "Kiểm soát vật lý tốt", "Phụ thuộc cấu hình và nhà cung cấp"],
                    ["Khả năng tăng trưởng", "Nâng ổ cứng/máy hoặc migrate", "Nâng gói dịch vụ"],
                    ["Phù hợp hiện tại", "Rất phù hợp khi ưu tiên tiết kiệm", "Phù hợp kho nhỏ/POC"],
                ],
                widths=[2450, 3455, 3455],
            ),
            subsection("5.1. Chấm điểm định hướng (1 thấp — 5 cao)"),
            table(
                ["Tiêu chí", "Trọng số", "A", "B", "Ghi chú"],
                [
                    ["Không phát sinh tiền host", "25%", "5", "4", "Cloud có nguy cơ vượt quota"],
                    ["Dung lượng RAG", "20%", "5", "2", "Vector 3072 chiều tốn dung lượng"],
                    ["Ổn định/uptime", "15%", "2", "4", "Máy cá nhân không có SLA"],
                    ["Bảo mật/kiểm soát", "15%", "4", "4", "Cả hai cần cấu hình đúng"],
                    ["Dễ vận hành", "15%", "3", "3", "Mỗi cách có phần việc riêng"],
                    ["Dễ mở rộng", "10%", "3", "5", "Cloud nâng cấp thuận tiện hơn"],
                    ["Điểm quy đổi", "100%", "4,0", "3,5", "A phù hợp ưu tiên chi phí hiện tại"],
                ],
                widths=[2450, 1400, 900, 900, 3710],
            ),
            callout(
                "Đề xuất lựa chọn",
                "Chọn Phương án A cho giai đoạn hiện tại. Thiết kế storage abstraction và content hash ngay "
                "từ đầu để sau này chuyển file lên R2 hoặc chuyển database lên cloud mà không sửa toàn bộ ứng dụng.",
                fill="E2F0D9",
                accent="548235",
            ),
        ]
    )

    # Implementation roadmap
    parts.extend(
        [
            section_title("6", "Lộ trình triển khai đề xuất"),
            subsection("Giai đoạn 1 — Dùng chung thật sự, chi phí 0 đồng"),
            numbered("Chọn một máy chủ và một người chịu trách nhiệm chính."),
            numbered("Chạy PostgreSQL/pgvector và toàn bộ backend bằng Docker Compose."),
            numbered("Tạo mạng Tailscale gồm máy chủ và 5 tài khoản thành viên."),
            numbered("Chỉ công bố cổng web/API; giữ PostgreSQL trong mạng Docker hoặc firewall riêng."),
            numbered("Chuyển mọi người sang cùng URL dùng chung; không upload qua local riêng."),
            numbered("Thêm content_hash/chunk_hash và khóa job chống xử lý đồng thời."),
            numbered("Thiết lập backup database + uploads/artifacts hằng đêm."),
            subsection("Giai đoạn 2 — Tăng độ an toàn, vẫn ưu tiên miễn phí"),
            numbered("Đưa bản sao file mã hóa lên R2 Free hoặc kho backup phù hợp."),
            numbered("Thêm dashboard theo dõi dung lượng, trạng thái ingestion và chi phí API."),
            numbered("Thêm audit log: ai upload, chỉnh sửa, rebuild, active hoặc xóa."),
            subsection("Giai đoạn 3 — Chuyển cloud khi có điều kiện"),
            numbered("Di chuyển PostgreSQL bằng pg_dump/pg_restore."),
            numbered("Đồng bộ file sang object storage và cập nhật storage_uri."),
            numbered("Chạy kiểm thử retrieval/citation trước khi chuyển traffic."),
            numbered("Giữ máy chủ cũ ở chế độ chỉ đọc trong thời gian xác nhận."),
            subsection("Phân công gợi ý cho 5 người"),
            table(
                ["Vai trò", "Trách nhiệm"],
                [
                    ["1. Hạ tầng", "Máy chủ, Docker, Tailscale, giám sát và backup"],
                    ["2. Backend", "Hash/dedup, storage adapter, khóa ingestion job"],
                    ["3. RAG/AI", "Chunking, embedding version, kiểm thử retrieval"],
                    ["4. Frontend/QA", "Luồng upload, trạng thái xử lý, test nhiều tài khoản"],
                    ["5. Dữ liệu/bảo mật", "Quyền truy cập, tài liệu chuẩn, audit và restore drill"],
                ],
                widths=[2500, 6860],
            ),
        ]
    )

    # Meeting checklist
    parts.extend(
        [
            page_break(),
            section_title("7", "Biên bản quyết định dùng trong cuộc họp"),
            paragraph("Nhóm có thể điền trực tiếp phần dưới đây sau khi thống nhất."),
            table(
                ["Nội dung", "Quyết định của nhóm"],
                [
                    ["Phương án được chọn", "☐ A — Máy chủ team    ☐ B — Cloud Free Tier"],
                    ["Máy/người phụ trách hạ tầng", "........................................................................"],
                    ["Người có quyền upload/rebuild", "........................................................................"],
                    ["Dung lượng dự kiến 6 tháng", "........................................................................"],
                    ["Thời gian cần hoạt động", "☐ Khi làm việc    ☐ 24/7"],
                    ["Tần suất backup", "☐ Hằng ngày    ☐ Khác: ................................"],
                    ["Nơi giữ bản backup thứ hai", "........................................................................"],
                    ["Ngày triển khai thử", "........................................................................"],
                    ["Ngày đánh giá lại", "........................................................................"],
                ],
                widths=[3100, 6260],
            ),
            subsection("Điều kiện hoàn thành thử nghiệm"),
            bullet("Cả 5 thành viên đăng nhập và nhìn thấy cùng danh sách tài liệu."),
            bullet("Upload cùng một file lần thứ hai không gọi lại OCR/embedding."),
            bullet("Chat API truy xuất đúng chunks từ database chung."),
            bullet("File nguồn mở được qua quyền truy cập hợp lệ."),
            bullet("Khôi phục thành công một bản backup thử."),
            bullet("Không có database password hoặc API key trong frontend/Git."),
        ]
    )

    # Sources
    parts.extend(
        [
            section_title("8", "Nguồn tham khảo và giả định"),
            paragraph(
                "Thông tin hạn mức có thể thay đổi theo thời gian. Trước khi triển khai, nhóm nên kiểm tra "
                "lại trực tiếp tại trang giá chính thức.",
            ),
            table(
                ["Nguồn", "Đường dẫn"],
                [
                    ["Supabase Pricing", "https://supabase.com/pricing"],
                    ["Supabase Vector Columns", "https://supabase.com/docs/guides/ai/vector-columns"],
                    ["Supabase Storage", "https://supabase.com/docs/guides/storage"],
                    ["Supabase RAG Permissions", "https://supabase.com/docs/guides/ai/rag-with-permissions"],
                    ["Neon Pricing", "https://neon.com/pricing"],
                    ["Neon pgvector/AI Concepts", "https://neon.com/docs/ai/ai-concepts"],
                    ["Cloudflare R2 Pricing", "https://developers.cloudflare.com/r2/pricing/"],
                    ["Cloudflare Tunnel", "https://developers.cloudflare.com/tunnel/"],
                    ["Cloudflare Zero Trust Plans", "https://www.cloudflare.com/plans/zero-trust-services/"],
                    ["Tailscale Free Plans", "https://tailscale.com/kb/1154/free-plans-discounts"],
                ],
                widths=[3300, 6060],
            ),
            paragraph(""),
            callout(
                "Giả định kỹ thuật",
                "Tài liệu này dựa trên cấu trúc hiện tại của repository: PostgreSQL/pgvector, bảng documents, "
                "guideline_versions, chunks và embedding halfvec(3072). Ước lượng dung lượng vector là dung "
                "lượng thô, chưa bao gồm index và overhead của PostgreSQL.",
                fill="EAF3F8",
                accent="1F4E78",
            ),
            paragraph("HẾT", align="center", bold=True, color="1F4E78", before=480, size=22),
        ]
    )

    return "".join(parts)


def styles_xml() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial" w:cs="Arial"/>
        <w:sz w:val="21"/><w:szCs w:val="21"/>
        <w:lang w:val="vi-VN" w:eastAsia="vi-VN"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr><w:spacing w:after="120" w:line="300" w:lineRule="auto"/></w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:widowControl/><w:spacing w:after="120" w:line="300" w:lineRule="auto"/></w:pPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>
    <w:pPr><w:keepNext/><w:keepLines/><w:pageBreakBefore w:val="0"/>
      <w:spacing w:before="280" w:after="140"/></w:pPr>
    <w:rPr><w:b/><w:color w:val="1F4E78"/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>
    <w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="220" w:after="100"/></w:pPr>
    <w:rPr><w:b/><w:color w:val="31708E"/><w:sz w:val="25"/><w:szCs w:val="25"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="ListParagraph">
    <w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:qFormat/>
    <w:pPr><w:ind w:left="720" w:hanging="360"/><w:contextualSpacing/></w:pPr>
  </w:style>
</w:styles>
"""


def numbering_xml() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="0">
    <w:multiLevelType w:val="multilevel"/>
    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/>
      <w:lvlText w:val="•"/><w:lvlJc w:val="left"/>
      <w:pPr><w:tabs><w:tab w:val="num" w:pos="360"/></w:tabs><w:ind w:left="720" w:hanging="360"/></w:pPr>
      <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr>
    </w:lvl>
    <w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/>
      <w:lvlText w:val="–"/><w:lvlJc w:val="left"/>
      <w:pPr><w:tabs><w:tab w:val="num" w:pos="1080"/></w:tabs><w:ind w:left="1440" w:hanging="360"/></w:pPr>
    </w:lvl>
  </w:abstractNum>
  <w:abstractNum w:abstractNumId="1">
    <w:multiLevelType w:val="multilevel"/>
    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/>
      <w:lvlText w:val="%1."/><w:lvlJc w:val="left"/>
      <w:pPr><w:tabs><w:tab w:val="num" w:pos="360"/></w:tabs><w:ind w:left="720" w:hanging="360"/></w:pPr>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
  <w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>
</w:numbering>
"""


def document_xml() -> str:
    body = build_document_body()
    section = """
<w:sectPr>
  <w:headerReference w:type="default" r:id="rIdHeader"/>
  <w:footerReference w:type="default" r:id="rIdFooter"/>
  <w:pgSz w:w="11906" w:h="16838"/>
  <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"
           w:header="567" w:footer="567" w:gutter="0"/>
  <w:cols w:space="708"/>
  <w:docGrid w:linePitch="360"/>
</w:sectPr>
"""
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
 xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>{body}{section}</w:body>
</w:document>
"""


def header_xml() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr><w:jc w:val="right"/><w:spacing w:after="0"/>
      <w:pBdr><w:bottom w:val="single" w:sz="4" w:space="4" w:color="9FBAD0"/></w:pBdr>
    </w:pPr>
    <w:r><w:rPr><w:color w:val="5B6573"/><w:sz w:val="16"/></w:rPr>
      <w:t>Phương án kho tài liệu RAG dùng chung</w:t>
    </w:r>
  </w:p>
</w:hdr>
"""


def footer_xml() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0"/></w:pPr>
    <w:r><w:rPr><w:color w:val="7F7F7F"/><w:sz w:val="16"/></w:rPr>
      <w:t>Chatbot Local  •  23/07/2026  •  Trang </w:t>
    </w:r>
    <w:r><w:fldChar w:fldCharType="begin"/></w:r>
    <w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>
    <w:r><w:fldChar w:fldCharType="end"/></w:r>
  </w:p>
</w:ftr>
"""


def core_xml() -> str:
    timestamp = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties
 xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
 xmlns:dc="http://purl.org/dc/elements/1.1/"
 xmlns:dcterms="http://purl.org/dc/terms/"
 xmlns:dcmitype="http://purl.org/dc/dcmitype/"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Phương án kho tài liệu RAG dùng chung</dc:title>
  <dc:subject>So sánh máy chủ nội bộ và cloud free tier cho team 5 người</dc:subject>
  <dc:creator>Chatbot Local Team</dc:creator>
  <cp:lastModifiedBy>Chatbot Local Team</cp:lastModifiedBy>
  <dc:description>Tài liệu phục vụ họp và ra quyết định hạ tầng kho tài liệu dùng chung.</dc:description>
  <dcterms:created xsi:type="dcterms:W3CDTF">{timestamp}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">{timestamp}</dcterms:modified>
</cp:coreProperties>
"""


CONTENT_TYPES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
  <Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
  <Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>
"""


PACKAGE_RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>
"""


DOCUMENT_RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rIdNumbering" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
  <Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
  <Relationship Id="rIdHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
  <Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
</Relationships>
"""


SETTINGS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:zoom w:percent="100"/>
  <w:defaultTabStop w:val="720"/>
  <w:characterSpacingControl w:val="doNotCompress"/>
  <w:compat>
    <w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/>
  </w:compat>
</w:settings>
"""


APP = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
 xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Microsoft Office Word</Application>
  <AppVersion>16.0000</AppVersion>
  <Company>Chatbot Local Team</Company>
</Properties>
"""


def write_docx() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    parts = {
        "[Content_Types].xml": CONTENT_TYPES,
        "_rels/.rels": PACKAGE_RELS,
        "docProps/core.xml": core_xml(),
        "docProps/app.xml": APP,
        "word/document.xml": document_xml(),
        "word/styles.xml": styles_xml(),
        "word/numbering.xml": numbering_xml(),
        "word/settings.xml": SETTINGS,
        "word/header1.xml": header_xml(),
        "word/footer1.xml": footer_xml(),
        "word/_rels/document.xml.rels": DOCUMENT_RELS,
    }
    with zipfile.ZipFile(OUTPUT_FILE, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, content in parts.items():
            archive.writestr(name, content.encode("utf-8"))
    print(f"Created: {OUTPUT_FILE}")
    print(f"Size: {OUTPUT_FILE.stat().st_size} bytes")


if __name__ == "__main__":
    write_docx()
