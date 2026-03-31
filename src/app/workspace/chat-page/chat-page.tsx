import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { App } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";

import { ChatInput, MessageBubble } from "@/components/chat";
import { ReferencePanel } from "@/components/reference-panel/reference-panel";
import { useGuestChat } from "@/hooks/useGuestChat";
import type { Citation, Message } from "@/types/api-types";
import { MessageRole } from "@/types/api-types";
import { Reference } from "@/types/chat-types";
import { citationToReference, parseTextAndCitations } from "@/utils/citation-parser";

const EMPTY_STATE_HEADLINES = ["Xin chào! Tôi có thể giúp gì cho bạn?"];

const AUTO_SCROLL_THRESHOLD_PX = 80;
const STREAM_LOCK_THRESHOLD_PX = 24;

type MessagesQueryData = {
  conversation: unknown;
  messages: Message[];
};

type RenderedMessage = Message & {
  isStreaming?: boolean;
  localCitations?: Citation[];
};

function isValidChatId(id: unknown): id is string {
  return typeof id === "string" && (id.length >= 32 || id.startsWith("guest-"));
}

function createLocalMessage(
  chatId: string | undefined,
  partial: Partial<RenderedMessage> & Pick<Message, "role" | "content">
): RenderedMessage {
  const timestamp = new Date().toISOString();

  return {
    id: partial.id ?? `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    conversationId: partial.conversationId ?? chatId ?? "pending-conversation",
    role: partial.role,
    content: partial.content,
    tokenCount: partial.tokenCount ?? 0,
    metadata: partial.metadata,
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
    isStreaming: partial.isStreaming,
    localCitations: partial.localCitations,
  };
}

function stripLocalFields(message: RenderedMessage): Message {
  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role,
    content: message.content,
    tokenCount: message.tokenCount,
    metadata: message.metadata,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
}

function finalizeMessages(
  messages: RenderedMessage[],
  assistantPlaceholderId: string,
  rawStreamingText: string,
  conversationId?: string
): RenderedMessage[] {
  return messages.map((message) => {
    const nextConversationId = conversationId ?? message.conversationId;

    if (message.id !== assistantPlaceholderId) {
      return {
        ...message,
        conversationId: nextConversationId,
      };
    }

    return {
      ...message,
      conversationId: nextConversationId,
      content: rawStreamingText,
      updatedAt: new Date().toISOString(),
      isStreaming: false,
    };
  });
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
  const [pendingMessages, setPendingMessages] = useState<RenderedMessage[]>([]);
  const [emptyStateHeadline] = useState(
    () => EMPTY_STATE_HEADLINES[Math.floor(Math.random() * EMPTY_STATE_HEADLINES.length)]
  );
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const pendingMessagesRef = useRef<RenderedMessage[]>([]);

  useEffect(() => {
    pendingMessagesRef.current = pendingMessages;
  }, [pendingMessages]);

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
    setPendingMessages([]);
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

  const messages: RenderedMessage[] = messagesData?.messages ?? [];
  const visibleMessages: RenderedMessage[] = isNewChat
    ? pendingMessages
    : [...messages, ...pendingMessages];

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
  }, [visibleMessages]);

  const messageCitationsById = Object.fromEntries(
    visibleMessages
      .filter((message) => message.role === MessageRole.ASSISTANT)
      .map((message) => {
        const citations = message.localCitations ?? parseTextAndCitations(message.content).citations;

        return [message.id, citations];
      })
      .filter(([, citations]) => citations.length > 0)
  );

  const handleCitationClick = useCallback((citation: Citation, index: number) => {
    const reference = citationToReference(citation, index);
    setSelectedReference(reference);
    setReferenceScrollRequestKey((prev) => prev + 1);
  }, []);

  const updatePendingMessage = useCallback(
    (messageId: string, updater: (message: RenderedMessage) => RenderedMessage) => {
      setPendingMessages((prev) => {
        const next = prev.map((message) =>
          message.id === messageId ? updater(message) : message
        );
        pendingMessagesRef.current = next;
        return next;
      });
    },
    []
  );

  const handleStreamingText = useCallback(
    (messageId: string, nextRawText: string) => {
      const parsed = parseTextAndCitations(nextRawText);

      updatePendingMessage(messageId, (message) => ({
        ...message,
        content: parsed.textWithMarkers,
        localCitations: parsed.citations,
        updatedAt: new Date().toISOString(),
      }));
    },
    [updatePendingMessage]
  );

  const appendStreamingTrace = useCallback(
    (messageId: string, nextTrace: string) => {
      const normalizedTrace = nextTrace.trim();

      if (!normalizedTrace) {
        return;
      }

      updatePendingMessage(messageId, (message) => {
        const thinking = Array.isArray(message.metadata?.thinking)
          ? message.metadata.thinking
          : [];

        if (thinking.at(-1) === normalizedTrace) {
          return message;
        }

        return {
          ...message,
          metadata: {
            ...message.metadata,
            thinking: [...thinking, normalizedTrace],
          },
        };
      });
    },
    [updatePendingMessage]
  );

  const handleSend = useCallback(async () => {
    if (!input.trim() || isStreaming) {
      return;
    }

    const userInput = input;
    setInput("");

    const userMessage = createLocalMessage(chatId, {
      id: `temp-${Date.now()}`,
      role: MessageRole.USER,
      content: userInput,
    });
    const assistantPlaceholderId = `assistant-${Date.now()}`;
    const assistantMessage = createLocalMessage(chatId, {
      id: assistantPlaceholderId,
      role: MessageRole.ASSISTANT,
      content: "",
      isStreaming: true,
      metadata: { thinking: [] },
      localCitations: [],
    });
    const newPendingMessages = [userMessage, assistantMessage];

    setPendingMessages((prev) => {
      const next = [...prev, ...newPendingMessages];
      pendingMessagesRef.current = next;
      return next;
    });
    setIsStreaming(true);

    try {
      if (isNewChat) {
        let newConversationId: string | null = null;
        let rawStreamingText = "";

        for await (const chunk of startConversationStream(userInput)) {
          if ("type" in chunk && chunk.type === "conversation") {
            newConversationId = chunk.conversationId;
          } else if ("type" in chunk && chunk.type === "trace") {
            appendStreamingTrace(assistantPlaceholderId, chunk.trace);
          } else if (
            ((("type" in chunk && chunk.type === "text") || (!("type" in chunk) && "text" in chunk)) &&
              chunk.text)
          ) {
            rawStreamingText += chunk.text;
            handleStreamingText(assistantPlaceholderId, rawStreamingText);
          }
        }

        if (newConversationId) {
          const promotedMessages = finalizeMessages(
            pendingMessagesRef.current,
            assistantPlaceholderId,
            rawStreamingText,
            newConversationId
          );

          queryClient.setQueryData(["messages", newConversationId, isGuest], {
            conversation: null,
            messages: promotedMessages.map(stripLocalFields),
          });
          pendingMessagesRef.current = [];
          setPendingMessages([]);
          await queryClient.invalidateQueries({ queryKey: ["conversations"] });
          navigate({ to: "/chat", search: { chatId: newConversationId } });
        }
      } else {
        let rawStreamingText = "";

        for await (const chunk of sendMessageStream(chatId as string, userInput)) {
          if ("type" in chunk && chunk.type === "trace") {
            appendStreamingTrace(assistantPlaceholderId, chunk.trace);
          } else if (
            ((("type" in chunk && chunk.type === "text") || (!("type" in chunk) && "text" in chunk)) &&
              chunk.text)
          ) {
            rawStreamingText += chunk.text;
            handleStreamingText(assistantPlaceholderId, rawStreamingText);
          }
        }

        const finalizedMessages = finalizeMessages(
          pendingMessagesRef.current,
          assistantPlaceholderId,
          rawStreamingText
        );

        queryClient.setQueryData(
          ["messages", chatId, isGuest],
          (current: MessagesQueryData | undefined) => ({
            conversation: current?.conversation ?? null,
            messages: [...(current?.messages ?? []), ...finalizedMessages.map(stripLocalFields)],
          })
        );
        pendingMessagesRef.current = [];
        setPendingMessages([]);
        await queryClient.invalidateQueries({ queryKey: ["conversations"] });
      }
    } catch (error: any) {
      console.error("Failed to send message:", error);
      antMessage.error(error?.message || "Gửi tin nhắn thất bại. Vui lòng thử lại.");
      setInput(userInput);
      setPendingMessages((prev) => {
        const next = prev.filter(
          (message) => message.id !== userMessage.id && message.id !== assistantPlaceholderId
        );
        pendingMessagesRef.current = next;
        return next;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [
    input,
    isStreaming,
    chatId,
    isGuest,
    isNewChat,
    antMessage,
    navigate,
    queryClient,
    appendStreamingTrace,
    handleStreamingText,
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
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-2 pt-4 pb-28 lg:px-6 lg:pt-8 lg:pb-36 overscroll-contain rounded-[1.75rem] bg-white"
        >
          <div className="flex flex-col gap-5 lg:gap-6 min-h-full">
            {visibleMessages.map((message) => (
              <MessageBubble
                key={message.id}
                message={stripLocalFields(message)}
                hydratedCitations={messageCitationsById[message.id]}
                streamingState={
                  message.role === MessageRole.ASSISTANT && message.isStreaming
                    ? {
                        isStreaming: true,
                        citations: message.localCitations ?? [],
                      }
                    : undefined
                }
                onCitationClick={handleCitationClick}
              />
            ))}

            {!visibleMessages.length && !isStreaming && (
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
