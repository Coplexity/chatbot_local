import React, { useState, useRef, useEffect } from "react";
import Logos from "../logos/logos";
import Icons from "../icons/icons";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGuestChat } from "@/hooks/useGuestChat";
import { useAuth } from "@/contexts/AuthContext";

export default function Navigation({
  isOpen,
  onClose,
}: {
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const navigate = useNavigate();
  const search = useSearch({ from: "/workspace/chat" });
  const currentChatId = search?.chatId;
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { logout, isGuest, isAuthenticated } = useAuth();
  const { getConversations, deleteConversation } = useGuestChat();

  // Fetch conversations from API or localStorage
  const { data: conversationsData, isLoading } = useQuery({
    queryKey: ["conversations", searchQuery, isGuest],
    queryFn: () => getConversations(1, 50, searchQuery),
  });

  const conversations = conversationsData?.items || [];

  // Delete conversation mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteConversation(id),
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
    // Close mobile menu after navigation
    onClose?.();
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
    navigate({ to: "/chat" });
    onClose?.();
  };

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
    onClose?.();
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
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Navigation sidebar */}
      <div
        className={`
        fixed lg:relative
        top-0 left-0 h-screen
        w-80 lg:w-full
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        z-50 lg:z-auto
        pb-6 px-6 border-r border-design-border
        flex flex-col gap-5 bg-[#eff3fb] overflow-hidden
      `}
      >
        {/* Close button for mobile */}
        <button
          onClick={onClose}
          className="lg:hidden absolute top-4 right-4 p-2 hover:bg-black/10 rounded-full"
          aria-label="Close menu"
        >
          <Icons.XIcon className="w-5 h-5" />
        </button>

        <div className="pt-6 pb-4 flex justify-center">
          <div className="w-52 max-w-full text-[#4c82e8]">
            <Logos.LogoMedicalChatbot className="w-full h-auto" />
          </div>
        </div>

        <button
          onClick={handleNewChat}
          className="w-full text-lg px-5 py-3 bg-btn-bg text-btn-text font-semibold rounded-full hover:bg-btn-hover-bg transition-all duration-200 cursor-pointer shrink-0 shadow-[0_12px_24px_rgba(76,130,232,0.18)]"
        >
          + Cuộc trò chuyện mới
        </button>

        <div className="relative">
          <input
            type="text"
            placeholder="Tìm kiếm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pl-11 rounded-full border border-slate-400/50 focus:outline-none focus:border-[#4c82e8] focus:ring-1 focus:ring-[#4c82e8]/20 transition-colors bg-transparent text-slate-600"
          />
          <Icons.SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        </div>

        <div className="font-extrabold text-[1.05rem] mt-2 shrink-0 text-slate-700">
          Lịch sử trò chuyện
        </div>

        {isLoading ? (
          <div className="text-center text-gray-400 py-4">Đang tải...</div>
        ) : (
          <ul className="space-y-2.5 flex-1 overflow-y-auto min-h-0 pr-1">
            {filteredChats.length > 0 ? (
              filteredChats.map((chat) => (
                <li
                  key={chat.id}
                  onClick={() => handleChatClick(chat.id)}
                  className={`cursor-pointer transition-all duration-200 px-4 py-3 rounded-2xl flex justify-between gap-2 relative text-[1.02rem] ${currentChatId === chat.id
                      ? "bg-white/85 shadow-[0_8px_20px_rgba(148,163,184,0.16)]"
                      : "hover:bg-white/50"
                    }`}
                >
                  <span className="block truncate text-slate-600">
                    {highlightText(
                      chat.title || "Cuộc trò chuyện mới",
                      searchQuery
                    )}
                  </span>
                  {currentChatId === chat.id && (
                    <div className="relative" ref={menuRef}>
                      <button onClick={(e) => toggleMenu(e, chat.id)}>
                        <Icons.MoreHorizontal />
                      </button>

                      {openMenuId === chat.id && (
                        <div className="absolute right-0 bg-white border border-design-border rounded-2xl shadow-md w-32 z-10">
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

        <div className="pt-2 mt-auto">
          {isGuest && (
            <button
              onClick={() => {
                navigate({ to: "/login" });
                onClose?.();
              }}
              className="w-full px-4 py-2 bg-btn-bg text-btn-text text-lg font-semibold rounded-full hover:bg-btn-hover-bg transition-colors cursor-pointer shadow-[0_12px_24px_rgba(76,130,232,0.18)]"
            >
              Đăng nhập
            </button>
          )}
          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-left hover:bg-white/60 rounded-full flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors cursor-pointer"
            >
              <Icons.DoorOpen className="w-4 h-4" />
              <span>Đăng xuất</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}
