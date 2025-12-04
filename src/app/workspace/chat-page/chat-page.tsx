import Icons from "@/components/icons/icons";
import { useState } from "react";

export function ChatPage() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "user",
      text: "Triệu chứng và cách phòng ngừa bệnh viêm phổi cấp là gì?",
      time: "13:21",
    },
    {
      id: 2,
      sender: "bot",
      text: "Triệu chứng bao gồm sốt cao, ho, khó thở. Để phòng ngừa, tiêm vắc-xin phế cầu và cúm, vệ sinh cá nhân.",
      time: "13:22",
    },
  ]);

  const [input, setInput] = useState("");

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

    // Auto resize textarea
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  };

  return (
    <div className="relative h-full flex flex-col">
      {/* Messages - với padding bottom để không bị input che */}
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
                  {m.text}
                </div>
              </div>
              <div className="mt-2 text-right text-sm text-gray-500">
                {m.time}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Input - Fixed absolute at bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-white">
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
  );
}
