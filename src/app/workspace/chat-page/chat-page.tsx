import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { App } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";

import { ChatInput, MessageBubble, OptimisticBubble, StreamingBubble, type OptimisticMessage, } from "@/components/chat";
import { ReferencePanel } from "@/components/reference-panel/reference-panel";
import { useGuestChat } from "@/hooks/useGuestChat";
import type { Citation } from "@/types/api-types";
import { MessageRole } from "@/types/api-types";
import { Reference } from "@/types/chat-types";
import { citationToReference } from "@/utils/citation-parser";

const EMPTY_STATE_HEADLINES = [
  "Xin chào! Tôi có thể giúp gì cho bạn?",
];

function isValidChatId(id: unknown): id is string {
  return typeof id === "string" && id.length >= 32;
}

export function ChatPage() {
  const search = useSearch({ from: "/workspace/chat" });
  const navigate = useNavigate();
  const chatId = search?.chatId;
  const isNewChat = !isValidChatId(chatId);
  const queryClient = useQueryClient();
  const { message: antMessage } = App.useApp();
  const { isGuest, getMessages, sendMessageStream, startConversationStream } = useGuestChat();

  const [input, setInput] = useState("");
  const [selectedReference, setSelectedReference] = useState<Reference | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [optimisticMessage, setOptimisticMessage] = useState<OptimisticMessage | null>(null);
  const [emptyStateHeadline] = useState(
    () => EMPTY_STATE_HEADLINES[Math.floor(Math.random() * EMPTY_STATE_HEADLINES.length)]
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedReference(null);
  }, [chatId]);

  const { data: messagesData, isLoading } = useQuery({
    queryKey: ["messages", chatId, isGuest],
    queryFn: async () => {
      if (isNewChat) {
        return { conversation: null, messages: [] };
      }
      return getMessages(chatId as string);
    },
    enabled: !isNewChat,
  });

  const messages = messagesData?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText, optimisticMessage]);

  const handleCitationClick = useCallback(
    (citation: Citation, index: number) => {
      const reference = citationToReference(citation, index);
      setSelectedReference(reference);
    }, []
  );

  const handleSend = useCallback(async () => {
    if (!input.trim() || isStreaming) return;

    const userInput = input;
    setInput("");

    const tempMessage: OptimisticMessage = {
      id: `temp-${Date.now()}`,
      role: MessageRole.USER,
      content: userInput,
      createdAt: new Date().toISOString(),
    };
    setOptimisticMessage(tempMessage);

    setIsStreaming(true);
    setStreamingText("");

    try {
      if (isNewChat) {
        let newConversationId: string | null = null;

        for await (const chunk of startConversationStream(userInput)) {
          if (chunk.type === "conversation") {
            newConversationId = chunk.conversationId;
          } else if (chunk.type === "text" && chunk.text) {
            setStreamingText((prev) => prev + chunk.text);
          }
        }

        if (newConversationId) {
          await queryClient.invalidateQueries({ queryKey: ["conversations"] });
          navigate({ to: "/chat", search: { chatId: newConversationId } });
        }
      } else {
        for await (const chunk of sendMessageStream(
          chatId as string,
          userInput
        )) {
          if (chunk.text) {
            setStreamingText((prev) => prev + chunk.text);
          }
        }

        await queryClient.invalidateQueries({
          queryKey: ["messages", chatId, isGuest],
        });
        await queryClient.invalidateQueries({ queryKey: ["conversations"] });
      }
    } catch (error: any) {
      console.error("Failed to send message:", error);
      antMessage.error(
        error?.message || "Gửi tin nhắn thất bại. Vui lòng thử lại."
      );
      setInput(userInput);
    } finally {
      setIsStreaming(false);
      setStreamingText("");
      setOptimisticMessage(null);
    }
  }, [
    input,
    chatId,
    isNewChat,
    isStreaming,
    isGuest,
    queryClient,
    antMessage,
    navigate,
    sendMessageStream,
    startConversationStream,
  ]);

  if (isLoading && !isNewChat) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-500">Đang tải tin nhắn...</div>
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col lg:flex-row overflow-hidden bg-white">
      <div className="flex-1 flex flex-col relative px-4 pb-4 lg:px-6 lg:pb-6 min-h-0">
        <div className="flex-1 overflow-y-auto px-2 pt-4 pb-28 lg:px-6 lg:pt-8 lg:pb-36 overscroll-contain rounded-[1.75rem] bg-white">
          <div className="flex flex-col gap-5 lg:gap-6 min-h-full">
            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                onCitationClick={handleCitationClick}
              />
            ))}

            {optimisticMessage && (
              <OptimisticBubble message={optimisticMessage} />
            )}

            {isStreaming && <StreamingBubble streamingText={streamingText} />}

            {!messages.length && !optimisticMessage && !isStreaming && (
              <div className="flex flex-1 min-h-[24rem] items-center justify-center px-6 text-center">
                <div className="max-w-xl space-y-3">
                  <h3 className="text-2xl lg:text-3xl font-extrabold tracking-[-0.03em] text-slate-700">
                    {emptyStateHeadline}
                  </h3>
                  <p className="text-sm lg:text-base leading-7 text-slate-500">
                    Nhập nội dung tra cứu vào ô dưới đây.
                  </p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        <ChatInput
          value={input}
          onChange={setInput}
          onSend={handleSend}
          disabled={isStreaming}
        />
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
