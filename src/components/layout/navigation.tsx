import React, { useState, useRef, useEffect } from "react";
import Logos from "../logos/logos";
import Icons from "../icons/icons";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chatService } from "@/services/chat.service";
import { useAuth } from "@/contexts/AuthContext";

export default function Navigation() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/workspace/chat" });
  const currentChatId = search?.chatId;
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { logout } = useAuth();

  // Fetch conversations from API
  const { data: conversationsData, isLoading } = useQuery({
    queryKey: ["conversations", searchQuery],
    queryFn: () => chatService.getConversations(1, 50, searchQuery),
  });

  const conversations = conversationsData?.items || [];

  // Delete conversation mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => chatService.deleteConversation(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      if (currentChatId === openMenuId) {
        navigate({ to: "/chat", search: { chatId: undefined } });
      }
    },
  });



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
    deleteMutation.mutate(chatId);
    setOpenMenuId(null);
  };

  const handleNewChat = () => {
    navigate({ to: "/chat", search: { chatId: "new" } });
  };

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  // Filter chat history based on search query
  const filteredChats = conversations.filter((chat) =>
    chat.title?.toLowerCase().includes(searchQuery.toLowerCase())
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
    <div className="w-full p-6 border-r border-1 border-design-border h-screen flex flex-col gap-4 bg-bg-aside overflow-hidden">
      <div className="flex justify-center mb-8">
        <Logos.Logo className="h-6" />
      </div>

      <button
        onClick={handleNewChat}
        className="w-full px-4 py-3 bg-btn-bg text-btn-text font-medium rounded-xl hover:bg-btn-hover-bg hover:shadow-md transition-all duration-200 cursor-pointer flex-shrink-0"
      >
        + Cuộc trò chuyện mới
      </button>

      <div className="relative">
        <input
          type="text"
          placeholder="Tìm kiếm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2.5 pl-9 rounded-xl border border-design-border focus:outline-none focus:border-btn-text focus:ring-1 focus:ring-btn-text/20 transition-colors bg-bg-main"
        />
        <Icons.SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 text-gray-400" />
      </div>

      <div className="font-bold mt-4 flex-shrink-0">Lịch sử trò chuyện</div>

      {isLoading ? (
        <div className="text-center text-gray-400 py-4">Đang tải...</div>
      ) : (
        <ul className="space-y-2 flex-1 overflow-y-auto min-h-0">
          {filteredChats.length > 0 ? (
            filteredChats.map((chat) => (
              <li
                key={chat.id}
                onClick={() => handleChatClick(chat.id)}
                className={`cursor-pointer transition-all duration-200 px-4 py-2.5 h-10 rounded-xl flex justify-between gap-2 relative ${currentChatId === chat.id ? "bg-design-border shadow-sm" : "hover:shadow-sm hover:bg-black/10"}`}
              >
                <span className="block truncate">
                  {highlightText(chat.title || "Cuộc trò chuyện mới", searchQuery)}
                </span>
                {currentChatId === chat.id && (
                  <div className="relative" ref={menuRef}>
                    <button onClick={(e) => toggleMenu(e, chat.id)}>
                      <Icons.MoreHorizontal />
                    </button>

                    {openMenuId === chat.id && (
                      <div className="absolute right-0 bg-white border border-[#EBEBEB] rounded-lg shadow-md w-32 z-10">
                        <button
                          onClick={(e) => handleShare(e, chat.id)}
                          className="w-full px-4 pt-4 pb-2 text-left hover:bg-gray-50 hover:rounded-t-lg flex items-center gap-2"
                        >
                          <Icons.Share2Icon className="w-4 h-4" />
                          <span>Chia sẻ</span>
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, chat.id)}
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
      )}

      <div className="border-t border-design-border pt-4">
        <button
          onClick={handleLogout}
          className="w-full px-4 py-2.5 text-left hover:bg-white/60 rounded-xl flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors cursor-pointer"
        >
          <Icons.DoorOpen className="w-4 h-4" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  );
}
