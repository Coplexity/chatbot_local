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
import { citationToReference, parseTextAndCitations } from "@/utils/citation-parser";

const EMPTY_STATE_HEADLINES = [
  "Xin chào! Tôi có thể giúp gì cho bạn?",
];

const AUTO_SCROLL_THRESHOLD_PX = 48;
const STREAM_LOCK_THRESHOLD_PX = 1;

function isValidChatId(id: unknown): id is string {
  return typeof id === "string" && (id.length >= 32 || id.startsWith("guest-"));
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
  const [referenceScrollRequestKey, setReferenceScrollRequestKey] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streamingTrace, setStreamingTrace] = useState<string[]>([]);
  const [streamingCitations, setStreamingCitations] = useState<Citation[]>([]);
  const [optimisticMessage, setOptimisticMessage] = useState<OptimisticMessage | null>(null);
  const [streamInstanceId, setStreamInstanceId] = useState(0);
  const [emptyStateHeadline] = useState(
    () => EMPTY_STATE_HEADLINES[Math.floor(Math.random() * EMPTY_STATE_HEADLINES.length)]
  );
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);

  const updateShouldAutoScroll = useCallback(() => {
    const container = scrollContainerRef.current;

    if (!container) {
      shouldAutoScrollRef.current = true;
      return;
    }

    const distanceFromBottom =
      container.scrollHeight - container.clientHeight - container.scrollTop;

    if (isStreaming) {
      shouldAutoScrollRef.current = distanceFromBottom <= STREAM_LOCK_THRESHOLD_PX;
      return;
    }

    shouldAutoScrollRef.current = distanceFromBottom <= AUTO_SCROLL_THRESHOLD_PX;
  }, [isStreaming]);

  useEffect(() => {
    shouldAutoScrollRef.current = true;
    setSelectedReference(null);
  }, [chatId]);

  useEffect(() => {
    setStreamingCitations([]);
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
    const container = scrollContainerRef.current;

    if (!container) {
      return;
    }

    updateShouldAutoScroll();
    container.addEventListener("scroll", updateShouldAutoScroll);

    return () => {
      container.removeEventListener("scroll", updateShouldAutoScroll);
    };
  }, [updateShouldAutoScroll]);

  useEffect(() => {
    if (isStreaming) {
      return;
    }

    updateShouldAutoScroll();
  }, [isStreaming, updateShouldAutoScroll]);

  useEffect(() => {
    if (!shouldAutoScrollRef.current) {
      return;
    }

    const container = scrollContainerRef.current;

    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, streamingText, optimisticMessage]);
  const messageCitationsById = Object.fromEntries(
    messages
      .filter((message) => message.role === MessageRole.ASSISTANT)
      .map((message) => {
        const parsed = parseTextAndCitations(message.content);

        return [message.id, parsed.citations];
      })
      .filter(([, citations]) => citations.length > 0)
  );

  const handleCitationClick = useCallback(
    (citation: Citation, index: number) => {
      const reference = citationToReference(citation, index);
      setSelectedReference(reference);
      setReferenceScrollRequestKey((prev) => prev + 1);
    }, []
  );

  const handleStreamingText = useCallback((nextRawText: string) => {
    const parsed = parseTextAndCitations(nextRawText);
    setStreamingText(parsed.textWithMarkers);
    setStreamingCitations(parsed.citations);
  }, []);

  const appendStreamingTrace = useCallback((nextTrace: string) => {
    const normalizedTrace = nextTrace.trim();

    if (!normalizedTrace) {
      return;
    }

    setStreamingTrace((prev) => {
      if (prev.at(-1) === normalizedTrace) {
        return prev;
      }

      return [...prev, normalizedTrace];
    });
  }, []);

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
    setStreamingTrace([]);
    setStreamingCitations([]);
    setStreamInstanceId((prev) => prev + 1);

    try {
      if (isNewChat) {
        let newConversationId: string | null = null;
        let rawStreamingText = "";

        for await (const chunk of startConversationStream(userInput)) {
          if ("type" in chunk && chunk.type === "conversation") {
            newConversationId = chunk.conversationId;
          } else if ("type" in chunk && chunk.type === "trace") {
            appendStreamingTrace(chunk.trace);
          } else if ((("type" in chunk && chunk.type === "text") || (!('type' in chunk) && "text" in chunk)) && chunk.text) {
            rawStreamingText += chunk.text;
            handleStreamingText(rawStreamingText);
          }
        }

        if (newConversationId) {
          await queryClient.invalidateQueries({ queryKey: ["conversations"] });
          navigate({ to: "/chat", search: { chatId: newConversationId } });
        }
      } else {
        let rawStreamingText = "";
        for await (const chunk of sendMessageStream(
          chatId as string,
          userInput
        )) {
          if ("type" in chunk && chunk.type === "trace") {
            appendStreamingTrace(chunk.trace);
          } else if ((("type" in chunk && chunk.type === "text") || (!('type' in chunk) && "text" in chunk)) && chunk.text) {
            rawStreamingText += chunk.text;
            handleStreamingText(rawStreamingText);
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
      setStreamingTrace([]);
    } finally {
      setIsStreaming(false);
      setStreamingText("");
      setStreamingTrace([]);
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
    appendStreamingTrace,
    handleStreamingText,
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
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-2 pt-4 pb-28 lg:px-6 lg:pt-8 lg:pb-36 overscroll-contain rounded-[1.75rem] bg-white"
        >
          <div className="flex flex-col gap-5 lg:gap-6 min-h-full">
            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                hydratedCitations={messageCitationsById[m.id]}
                onCitationClick={handleCitationClick}
              />
            ))}

            {optimisticMessage && (
              <OptimisticBubble message={optimisticMessage} />
            )}

            {isStreaming && (
              <StreamingBubble
                key={`stream-${streamInstanceId}`}
                streamingText={streamingText}
                streamingTrace={streamingTrace}
                citations={streamingCitations}
                onCitationClick={handleCitationClick}
              />
            )}

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

            <div />
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
          scrollRequestKey={referenceScrollRequestKey}
          onClose={() => setSelectedReference(null)}
        />
      )}
    </div>
  );
}
