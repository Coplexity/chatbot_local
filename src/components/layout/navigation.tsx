import React, { useState, useRef, useEffect } from "react";
import Logos from "../logos/logos";
import Icons from "../icons/icons";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { chatHistoryData } from "@/mocks/chat-history";

export default function Navigation() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/workspace/chat" });
  const currentChatId = search?.chatId;
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  const handleChatClick = (chatId: string) => {
    navigate({
      to: "/chat",
      search: { chatId },
    });
  };

  const toggleMenu = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === chatId ? null : chatId);
  };

  const handleShare = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    console.log("Share chat:", chatId);
    setOpenMenuId(null);
  };

  const handleDelete = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    console.log("Delete chat:", chatId);
    setOpenMenuId(null);
  };

  // Filter chat history based on search query
  const filteredChats = chatHistoryData.filter((chat) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Highlight matching text
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;

    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return (
      <>
        {parts.map((part, index) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={index} className="bg-yellow-200">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="w-full p-6 border-r border-[#EBEBEB] min-h-screen flex flex-col gap-6">
      <div className="flex justify-center mb-6">
        <Logos.Logo className="h-6" />
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder="Tìm kiếm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 pl-8 rounded-full border border-[#EBEBEB] focus:outline-none text-grey-500"
        />
        <Icons.SearchIcon className="absolute left-2 top-3 h-4" />
      </div>

      <div className="font-bold mt-6">Lịch sử trò chuyện</div>

      <ul className="space-y-6">
        {filteredChats.length > 0 ? (
          filteredChats.map((chat) => (
            <li
              key={chat.chatId}
              onClick={() => handleChatClick(chat.chatId)}
              className={`hover:text-blue-500 cursor-pointer transition px-4 py-2 rounded-lg flex justify-between gap-2 relative ${
                currentChatId === chat.chatId ? "bg-[#EBEBEB]" : ""
              }`}
            >
              <span className="block truncate">
                {highlightText(chat.title, searchQuery)}
              </span>
              {currentChatId === chat.chatId && (
                <div className="relative" ref={menuRef}>
                  <button onClick={(e) => toggleMenu(e, chat.chatId)}>
                    <Icons.MoreHorizontal />
                  </button>

                  {openMenuId === chat.chatId && (
                    <div className="absolute left-0 bg-white border border-[#EBEBEB] rounded-lg shadow-md w-32 z-10">
                      <button
                        onClick={(e) => handleShare(e, chat.chatId)}
                        className="w-full px-4 pt-4 pb-2 text-left hover:bg-gray-50 hover:rounded-t-lg flex items-center gap-2"
                      >
                        <Icons.Share2Icon className="w-4 h-4" />
                        <span>Chia sẻ</span>
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, chat.chatId)}
                        className="w-full px-4 pb-4 pt-2 text-left hover:bg-gray-50 hover:rounded-b-lg flex items-center gap-2 text-red-500"
                      >
                        <Icons.Trash2Icon className="w-4 h-4" />
                        <span>Xóa</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))
        ) : (
          <li className="px-4 py-2 text-gray-400 text-center">
            Không tìm thấy kết quả
          </li>
        )}
      </ul>
    </div>
  );
}
