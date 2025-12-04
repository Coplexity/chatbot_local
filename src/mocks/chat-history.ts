import { ChatHistory } from "@/types/chat-types";

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
          {
            id: "ref-1",
            number: 1,
            title: "Triệu chứng viêm phổi cấp",
            content:
              "Viêm phổi cấp thường có các triệu chứng như sốt cao đột ngột, ho có đờm, khó thở, đau ngực khi hít thở sâu. Bệnh có thể tiến triển nhanh nếu không được điều trị kịp thời.",
            source:
              "Hướng dẫn chẩn đoán và điều trị bệnh viêm phổi cấp, Bộ Y Tế, Tập chỉ Y học Việt Nam, Tập 502, Số 1, 2023, trang 15-25",
          },
          {
            id: "ref-2",
            number: 2,
            title: "Vắc-xin phòng bệnh",
            content:
              "Vắc-xin phòng phế cầu khuẩn và vắc-xin cúm là biện pháp quan trọng nhất để giảm nguy cơ viêm phổi, đặc biệt là ở người cao tuổi và người có bệnh nền",
            source:
              "Hướng dẫn tiêm chủng mở rộng, Bộ Y Tế, 2023, trang 45-50",
          },
          {
            id: "ref-3",
            number: 3,
            title: "Vệ sinh cá nhân",
            content:
              "Rửa tay thường xuyên bằng xà phòng, đeo khẩu trang khi tiếp xúc với người bệnh, tránh nơi đông người là các biện pháp phòng ngừa hiệu quả.",
            source: "Hướng dẫn phòng chống bệnh truyền nhiễm, Bộ Y Tế, 2023",
          },
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
          {
            id: "ref-4",
            number: 1,
            title: "Sốt cao đột ngột",
            content:
              "Sốt xuất huyết thường bắt đầu với cơn sốt cao đột ngột từ 39-40°C, kéo dài 2-7 ngày. Đây là dấu hiệu đầu tiên và quan trọng nhất của bệnh.",
            source:
              "Hướng dẫn chẩn đoán và điều trị sốt xuất huyết dengue, Bộ Y Tế, 2022, trang 10-15",
          },
          {
            id: "ref-5",
            number: 2,
            title: "Đau đầu và đau cơ",
            content:
              "Người bệnh thường cảm thấy đau đầu dữ dội, đau sau hốc mắt, đau mỏi toàn thân đặc biệt là vùng lưng và khớp.",
            source: "Y học gia đình - Sốt xuất huyết, NXB Y học, 2022",
          },
          {
            id: "ref-6",
            number: 3,
            title: "Biểu hiện trên da",
            content:
              "Ban đỏ xuất hiện sau 2-5 ngày sốt, thường ở chi và thân mình. Có thể có xuất huyết dưới da, chảy máu cam hoặc chân răng.",
            source:
              "Tài liệu đào tạo phòng chống sốt xuất huyết, Viện Pasteur TP.HCM, 2023",
          },
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
          {
            id: "ref-7",
            number: 1,
            title: "Giữ ẩm cho da",
            content:
              "Duy trì độ ẩm cho da là yếu tố quan trọng nhất. Tắm bằng nước ấm, không quá nóng, thời gian ngắn 5-10 phút. Sau khi tắm ngay lập tức thoa kem dưỡng ẩm.",
            source:
              "Hướng dẫn chăm sóc da cho người viêm da cơ địa, Hội Da liễu Việt Nam, 2023",
          },
          {
            id: "ref-8",
            number: 2,
            title: "Tránh chất kích ứng",
            content:
              "Hạn chế tiếp xúc với xà phòng mạnh, nước tẩy rửa, hóa chất, vải len và vải tổng hợp. Nên mặc quần áo cotton thoáng mát.",
            source: "Bệnh da liễu thường gặp, NXB Y học, 2022, trang 156-160",
          },
          {
            id: "ref-9",
            number: 3,
            title: "Sử dụng kem dưỡng ẩm",
            content:
              "Thoa kem dưỡng ẩm ít nhất 2 lần mỗi ngày, đặc biệt sau khi tắm. Chọn kem không chứa hương liệu và chất bảo quản gây kích ứng.",
            source:
              "Khuyến cáo điều trị viêm da cơ địa, Bệnh viện Da liễu Trung ương, 2023",
          },
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
          {
            id: "ref-10",
            number: 1,
            title: "Sốt cao",
            content:
              "Cúm A thường gây sốt cao đột ngột từ 38-40°C, kèm theo ớn lạnh và toát mồ hôi. Sốt thường kéo dài 3-4 ngày.",
            source: "Hướng dẫn phòng chống bệnh cúm, Bộ Y Tế, 2023",
          },
          {
            id: "ref-11",
            number: 2,
            title: "Ho và đau họng",
            content:
              "Ho khan, đau họng là triệu chứng thường gặp. Ho có thể kéo dài 2-3 tuần ngay cả sau khi các triệu chứng khác đã thuyên giảm.",
            source: "Bệnh truyền nhiễm đường hô hấp, NXB Y học, 2022",
          },
          {
            id: "ref-12",
            number: 3,
            title: "Triệu chứng toàn thân",
            content:
              "Mệt mỏi, đau nhức cơ khớp, nhức đầu, chảy nước mũi, nghẹt mũi. Người bệnh cảm thấy kiệt sức và cần nghỉ ngơi nhiều.",
            source:
              "Tài liệu đào tạo phòng chống cúm mùa, Viện Vệ sinh Dịch tễ Trung ương, 2023",
          },
        ],
      },
    ],
  },
];