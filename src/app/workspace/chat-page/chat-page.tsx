import Icons from "@/components/icons/icons";
import { useState, useEffect, useRef } from "react";
import { useSearch } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chatService } from "@/services/chat.service";
import type { Message } from "@/types/api-types";
import { MessageRole } from "@/types/api-types";
import { Reference } from "@/types/chat-types";
import { ReferencePanel } from "@/components/reference-panel/reference-panel";
import { App } from "antd";

export function ChatPage() {
  const search = useSearch({ from: "/workspace/chat" });
  const chatId = search?.chatId;
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  const [input, setInput] = useState("");
  const [selectedReference, setSelectedReference] = useState<Reference | null>(
    null
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch messages for the current conversation
  const { data: messagesData, isLoading } = useQuery({
    queryKey: ["messages", chatId],
    queryFn: async () => {
      if (!chatId || typeof chatId !== "string") {
        return { conversation: null, messages: [] };
      }
      return chatService.getMessages(chatId);
    },
    enabled: !!chatId && typeof chatId === "string",
  });

  const messages = messagesData?.messages || [];

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => {
      if (!chatId || typeof chatId !== "string") {
        throw new Error("No conversation selected");
      }
      return chatService.sendMessage(chatId, { content });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !chatId) return;

    const userInput = input;
    setInput("");

    try {
      await sendMessageMutation.mutateAsync(userInput);
    } catch (error: any) {
      console.error("Failed to send message:", error);
      message.error(error?.message || "Gửi tin nhắn thất bại. Vui lòng thử lại.");
      setInput(userInput); // Restore input on error
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);

    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  };

  const handleReferenceClick = (reference: Reference) => {
    setSelectedReference(reference);
  };

  const renderMessageText = (message: Message) => {
    // For now, just render the content
    // TODO: Parse citations from metadata if available
    return message.content;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  if (!chatId) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg mb-2">Chọn một cuộc trò chuyện</p>
          <p className="text-sm">hoặc tạo cuộc trò chuyện mới để bắt đầu</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-500">Đang tải tin nhắn...</div>
      </div>
    );
  }

  return (
    <div className="relative h-full flex">
      <div className="flex-1 flex flex-col relative py-6">
        <div className="flex-1 overflow-y-auto p-4 pb-24">
          <div className="flex flex-col gap-4">
            {messages.map((m) => (
              <div key={m.id}>
                <div
                  className={`flex items-start mb-4 gap-x-4 ${m.role === MessageRole.USER ? "justify-end" : ""
                    }`}
                >
                  {m.role === MessageRole.ASSISTANT && <Icons.BotChat />}
                  <div
                    className={`px-4 py-3 rounded-t-2xl ${m.role === MessageRole.USER
                      ? "rounded-bl-2xl bg-white border border-design-border shadow-sm max-w-[70%]"
                      : "rounded-br-2xl bg-bg-answer w-full border border-bg-answer"
                      }`}
                  >
                    {renderMessageText(m)}
                  </div>
                </div>
                <div className={`mt-2 text-sm text-gray-400 ${m.role === MessageRole.USER ? "text-right" : "text-left ml-12"}`}>
                  {formatTime(m.createdAt)}
                </div>
              </div>
            ))}
            {sendMessageMutation.isPending && (
              <div className="flex items-start mb-4 gap-x-4">
                <Icons.BotChat />
                <div className="px-4 py-3 rounded-t-2xl rounded-br-2xl bg-bg-answer w-full border border-bg-answer">
                  <div className="flex gap-1 text-cite">
                    <span className="animate-bounce">●</span>
                    <span className="animate-bounce" style={{ animationDelay: '100ms' }}>●</span>
                    <span className="animate-bounce" style={{ animationDelay: '200ms' }}>●</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="absolute bottom-6 px-6 left-0 right-0 bg-bg-main">
          <div className="w-full border border-design-border rounded-2xl flex items-center px-4 py-3 shadow-sm focus-within:border-btn-text focus-within:ring-2 focus-within:ring-btn-text/10 transition-all">
            <textarea
              className="w-full resize-none outline-none text-base max-h-40 overflow-y-auto bg-transparent"
              rows={1}
              placeholder="Bạn cần hỏi gì?"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={sendMessageMutation.isPending}
            />

            <button
              onClick={handleSend}
              disabled={sendMessageMutation.isPending || !input.trim()}
              className="ml-3 p-2 rounded-xl bg-btn-bg text-btn-text hover:bg-btn-hover-bg transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Icons.SendIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {selectedReference && (
        <ReferencePanel
          reference={selectedReference}
          onClose={() => setSelectedReference(null)}
        />
      )}
    </div>
  );
}
