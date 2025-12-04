import Icons from "@/components/icons/icons";
import { useState, useEffect } from "react";
import { useSearch } from "@tanstack/react-router";
import { chatHistoryData } from "@/mocks/chat-history";
import { Message, Reference } from "@/types/chat-types";
import { ReferencePanel } from "@/components/reference-panel/reference-panel";

export function ChatPage() {
  const search = useSearch({ from: "/workspace/chat" });
  const chatId = search?.chatId;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedReference, setSelectedReference] = useState<Reference | null>(
    null
  );

  useEffect(() => {
    if (chatId) {
      const chatHistory = chatHistoryData.find(
        (chat) => chat.chatId === chatId
      );
      if (chatHistory) {
        setMessages(chatHistory.messages);
      }
    } else {
      setMessages([]);
    }
  }, [chatId]);

  const handleSend = () => {
    if (!input.trim()) return;

    const currentTime = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender: "user",
        text: input,
        time: currentTime,
      },
    ]);

    setInput("");

    setTimeout(() => {
      const botTime = new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "bot",
          text: "Đây là câu trả lời ngẫu nhiên từ bot cho câu hỏi của bạn.",
          time: botTime,
        },
      ]);
    }, 1000);
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
    if (!message.references || message.references.length === 0) {
      return message.text;
    }

    let text = message.text;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    message.references.forEach((ref) => {
      const refPattern = `[${ref.number}]`;
      const index = text.indexOf(refPattern, lastIndex);

      if (index !== -1) {
        if (index > lastIndex) {
          parts.push(text.substring(lastIndex, index));
        }

        parts.push(
          <button
            key={ref.id}
            onClick={() => handleReferenceClick(ref)}
            className="text-[#50ACB7] cursor-pointer font-bold hover:underline"
          >
            [{ref.number}]
          </button>
        );

        lastIndex = index + refPattern.length;
      }
    });

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return <>{parts}</>;
  };

  return (
    <div className="relative h-full flex">
      <div className="flex-1 flex flex-col relative py-6">
        <div className="flex-1 overflow-y-auto p-4 pb-24">
          <div className="flex flex-col gap-4">
            {messages.map((m) => (
              <div key={m.id}>
                <div
                  className={`flex items-start mb-4 gap-x-4 ${
                    m.sender === "user" ? "justify-end" : ""
                  }`}
                >
                  {m.sender === "bot" && <Icons.BotChat />}
                  <div
                    className={`px-4 py-3 rounded-t-2xl ${
                      m.sender === "user"
                        ? "rounded-bl-2xl bg-white border border-[#EBEBEB]"
                        : "rounded-br-2xl bg-[#F6FEFF] w-full"
                    }`}
                  >
                    {renderMessageText(m)}
                  </div>
                </div>
                <div className="mt-2 text-right text-sm text-gray-500">
                  {m.time}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-6 px-6 left-0 right-0 bg-white">
          <div className="w-full border border-gray-200 rounded-xl flex items-center px-3 py-2">
            <textarea
              className="w-full resize-none outline-none text-base max-h-40 overflow-y-auto"
              rows={1}
              placeholder="Bạn cần hỏi gì?"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
            />

            <button
              onClick={handleSend}
              className="ml-2 text-gray-400 hover:text-gray-600 transition"
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
