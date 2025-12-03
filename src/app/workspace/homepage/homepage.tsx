import Icons from "@/components/icons/icons";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { SearchDocument } from "../document-management/search-document/search-document";
import { DocumentTable } from "../document-management/document-table/document-table";
import Pagination from "../document-management/pagination/pagination";
import ChatBot from "@/components/chatbot/chatbot";

export function HomePage() {
  const [openChat, setOpenChat] = useState(false);

  const generalInfo = [
    { label: "Số văn bản", value: "150" },
    { label: "Chủ đề", value: "5" },
    { label: "Cập nhật", value: "30/10/2025" },
  ];
  const documentList = [
    {
      id: 1,
      name: "Văn bản 1",
      date: "1/1/2025",
      topic: "Đất đai",
      status: "Đã xử lý - Tốt",
    },
    {
      id: 2,
      name: "Văn bản 2",
      date: "1/1/2025",
      topic: "Giao thông",
      status: "Đang xử lý",
    },
    {
      id: 3,
      name: "Văn bản 3",
      date: "1/1/2025",
      topic: "Đất đai",
      status: "Chưa xử lý",
    },
    {
      id: 4,
      name: "Văn bản 4",
      date: "1/1/2025",
      topic: "Giao thông",
      status: "Đã xử lý - Không tốt",
    },
    {
      id: 5,
      name: "Văn bản 5",
      date: "1/1/2025",
      topic: "Giao thông",
      status: "Đã xử lý - Bình thường",
    },
    {
      id: 6,
      name: "Văn bản 6",
      date: "1/1/2025",
      topic: "Giao thông",
      status: "Đã xử lý - Bình thường",
    },
    {
      id: 7,
      name: "Văn bản 7",
      date: "1/1/2025",
      topic: "Giao thông",
      status: "Đã xử lý - Bình thường",
    },
    {
      id: 8,
      name: "Văn bản 8",
      date: "1/1/2025",
      topic: "Giao thông",
      status: "Đã xử lý - Bình thường",
    },
  ];

  return (
    <>
      <div className="my-10 flex gap-4 items-center">
        <Link to="/homepage" className="text-primary-blue no-underline">
          {" "}
          Trang chủ{" "}
        </Link>
        <Icons.AngleRight />
        <Link
          to="/document-management"
          className="font-bold text-black no-underline"
        >
          {" "}
          Quản lý văn bản{" "}
        </Link>
      </div>
      <SearchDocument />
      <div className="flex gap-4 mt-6 mb-10">
        {generalInfo.map((info) => (
          <div
            key={info.label}
            className="bg-[#F2F8FF] rounded-sm justify-between items-center flex px-4 py-2"
          >
            <span>{info.label}: </span>
            <span className="font-bold ml-1 text-primary-blue">
              {info.value}
            </span>
          </div>
        ))}
      </div>
      <DocumentTable documentList={documentList} />
      <div className="mt-10 mb-10 flex justify-end">
        {/* Pagination can be added here in the future */}
        <Pagination
          totalPages={68}
          onPageChange={(page) => console.log("Page:", page)}
        />
      </div>
      <button
        className="fixed bottom-20 right-30 z-50 cursor-pointer"
        onClick={() => setOpenChat(true)}
      >
        <Icons.Chatbot className="hover:scale-110 transition-transform duration-200" />
      </button>
      <ChatBot open={openChat} onClose={() => setOpenChat(false)} />
    </>
  );
}
