import { useState, useRef, useEffect } from "react";
import Icons from "@/components/icons/icons";

export default function ChatBot({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Chào bạn, mình giúp được gì?" },
  ]);
  const [input, setInput] = useState("");
  const chatRef = useRef<HTMLDivElement | null>(null);

  const handleSend = () => {
    if (!input.trim()) return;
    const newMessages = [
      ...messages,
      { sender: "user", text: input },
      {
        sender: "bot",
        text: "Mở rộng quyền tiếp cận đất đai:\nCông dân Việt Nam định cư ở nước ngoài có quốc tịch Việt Nam được sử dụng đất như người trong nước.",
      },
    ];
    setMessages(newMessages);
    setInput("");
  };

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  if (!open) return null;

  return (
    <div className="fixed bottom-10 right-30 w-85 h-[500px] bg-white rounded-lg shadow-lg flex flex-col z-50 border border-gray-200 animate-fade-in p-4">
      {/* Header */}
      <div className="flex justify-between items-center pb-4 border-b border-[#EFEEF5]">
        <div className="flex items-center gap-2">
          <Icons.Chat />
          <div>
            <p className="font-bold">Chat Bot</p>
            <p className="text-xs text-[#3bb625]">Online</p>
          </div>
        </div>
        <button onClick={onClose} className="text-[#AEAEAE] hover:text-black">
          <Icons.Close />
        </button>
      </div>

      {/* Body */}
      <div
        ref={chatRef}
        className="flex-1 overflow-y-auto flex flex-col mt-4 gap-y-4"
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${
              msg.sender === "user" ? "justify-end" : "justify-start"
            } mb-2`}
          >
            {msg.text.includes("Mở rộng quyền") ? (
              <div className="bg-[#EFEEF5] text-black p-4 rounded-lg w-auto wrap-break-word">
                <p className="font-bold mb-1">
                  Mở rộng quyền tiếp cận đất đai:
                </p>
                <p>
                  Công dân Việt Nam định cư ở nước ngoài có quốc tịch Việt Nam
                  được sử dụng đất như người trong nước.
                </p>
                <button className="mt-2 bg-design-lightblue rounded-lg px-4 py-2 text-primary-blue underline hover:bg-blue-200 transition">
                  Xem văn bản
                </button>
              </div>
            ) : (
              <div
                className={`px-4 py-2 rounded-lg wrap-break-word max-w-[90%] ${
                  msg.sender === "user"
                    ? "bg-[#222020] text-white"
                    : "bg-[#EFEEF5] text-black"
                }`}
              >
                {msg.text}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-end justify-between border-t border-[#EFEEF5] pt-4 gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Hỏi gì đó..."
          rows={1}
          className="w-full bg-[#F9F9F9] rounded-lg p-3 text-sm outline-none focus:ring-1 focus:ring-primary-blue resize-none"
        />
        <button
          onClick={handleSend}
          className="hover:scale-110 transition-transform"
        >
          <Icons.Send className="h-11" />
        </button>
      </div>
    </div>
  );
}
