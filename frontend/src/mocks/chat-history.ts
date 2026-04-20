import { ChatHistory } from "@/types/chat-types";
import { Reference } from "@/types/chat-types";

// Helper to create mock references with the new Citation-based structure
const createReference = (
  id: string,
  number: number,
  chunkId: number,
  noi_dung: string
): Reference => ({
  id,
  number,
  chunkId,
  excerpt: noi_dung,
  reference: {
    chunkId,
    guidelineTitle: `Tài liệu ${chunkId}`,
    headings: [],
  },
});

export const chatHistoryData: ChatHistory[] = [
  {
    chatId: "chat-001",
    title: "Triệu chứng viêm phổi",
    messages: [
      {
        id: 1,
        sender: "user",
        text: "Triệu chứng và cách phòng ngừa bệnh viêm phổi cấp là gì?",
        time: "10:30",
      },
      {
        id: 2,
        sender: "bot",
        text: "Triệu chứng bao gồm sốt cao, ho, khó thở [1]. Để phòng ngừa, tiêm vắc-xin phế cầu và cúm [2], vệ sinh cá nhân [3]",
        time: "10:31",
        references: [
          createReference(
            "ref-1",
            1,
            1,
            "Viêm phổi cấp thường có các triệu chứng như sốt cao đột ngột, ho có đờm, khó thở, đau ngực khi hít thở sâu."
          ),
          createReference(
            "ref-2",
            2,
            2,
            "Vắc-xin phòng phế cầu khuẩn và vắc-xin cúm là biện pháp quan trọng nhất để giảm nguy cơ viêm phổi."
          ),
          createReference(
            "ref-3",
            3,
            3,
            "Rửa tay thường xuyên bằng xà phòng, đeo khẩu trang khi tiếp xúc với người bệnh."
          ),
        ],
      },
    ],
  },
  {
    chatId: "chat-002",
    title: "Triệu chứng sốt xuất huyết",
    messages: [
      {
        id: 1,
        sender: "user",
        text: "Các triệu chứng của sốt xuất huyết là gì?",
        time: "11:15",
      },
      {
        id: 2,
        sender: "bot",
        text: "Triệu chứng sốt xuất huyết: sốt cao đột ngột [1], đau đầu dữ dội, đau mỏi cơ [2], nổi ban đỏ trên da [3].",
        time: "11:16",
        references: [
          createReference(
            "ref-4",
            1,
            1,
            "Sốt xuất huyết thường bắt đầu với cơn sốt cao đột ngột từ 39-40°C, kéo dài 2-7 ngày."
          ),
          createReference(
            "ref-5",
            2,
            2,
            "Người bệnh thường cảm thấy đau đầu dữ dội, đau sau hốc mắt, đau mỏi toàn thân."
          ),
          createReference(
            "ref-6",
            3,
            3,
            "Ban đỏ xuất hiện sau 2-5 ngày sốt, thường ở chi và thân mình."
          ),
        ],
      },
    ],
  },
  {
    chatId: "chat-003",
    title: "Phòng ngừa bệnh viêm da cơ địa",
    messages: [
      {
        id: 1,
        sender: "user",
        text: "Làm thế nào để phòng ngừa viêm da cơ địa?",
        time: "14:20",
      },
      {
        id: 2,
        sender: "bot",
        text: "Phòng ngừa viêm da cơ địa: giữ ẩm cho da [1], tránh các chất kích ứng [2], sử dụng kem dưỡng ẩm thường xuyên [3].",
        time: "14:21",
        references: [
          createReference(
            "ref-7",
            1,
            1,
            "Duy trì độ ẩm cho da là yếu tố quan trọng nhất. Tắm bằng nước ấm, không quá nóng."
          ),
          createReference(
            "ref-8",
            2,
            2,
            "Hạn chế tiếp xúc với xà phòng mạnh, nước tẩy rửa, hóa chất, vải len và vải tổng hợp."
          ),
          createReference(
            "ref-9",
            3,
            3,
            "Thoa kem dưỡng ẩm ít nhất 2 lần mỗi ngày, đặc biệt sau khi tắm."
          ),
        ],
      },
    ],
  },
  {
    chatId: "chat-004",
    title: "Triệu chứng cúm A",
    messages: [
      {
        id: 1,
        sender: "user",
        text: "Triệu chứng cúm A như thế nào?",
        time: "16:45",
      },
      {
        id: 2,
        sender: "bot",
        text: "Triệu chứng cúm A: sốt cao [1], ho, đau họng [2], mệt mỏi, đau cơ, chảy nước mũi [3].",
        time: "16:46",
        references: [
          createReference(
            "ref-10",
            1,
            1,
            "Cúm A thường gây sốt cao đột ngột từ 38-40°C, kèm theo ớn lạnh và toát mồ hôi."
          ),
          createReference(
            "ref-11",
            2,
            2,
            "Ho khan, đau họng là triệu chứng thường gặp. Ho có thể kéo dài 2-3 tuần."
          ),
          createReference(
            "ref-12",
            3,
            3,
            "Mệt mỏi, đau nhức cơ khớp, nhức đầu, chảy nước mũi, nghẹt mũi."
          ),
        ],
      },
    ],
  },
];
