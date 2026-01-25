import Icons from "@/components/icons/icons";
import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { useSearch, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { chatService } from "@/services/chat.service";
import type { Message, Citation } from "@/types/api-types";
import { MessageRole } from "@/types/api-types";
import { Reference } from "@/types/chat-types";
import { ReferencePanel } from "@/components/reference-panel/reference-panel";
import { App } from "antd";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  parseTextAndCitations,
  citationToReference,
  formatCitationLabel,
} from "@/utils/citation-parser";

// Optimistic user message for immediate display
interface OptimisticMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

// Props for memoized message bubble
interface MessageBubbleProps {
  message: Message;
  onCitationClick: (citation: Citation, index: number) => void;
}

// Memoized message bubble component for optimized rendering
const MessageBubble = memo(function MessageBubble({
  message,
  onCitationClick,
}: MessageBubbleProps) {
  const isAssistant = message.role === MessageRole.ASSISTANT;

  // Parse citations only for assistant messages (non-streaming, complete messages)
  const parsedContent = useMemo(() => {
    if (!isAssistant) {
      return {
        textWithMarkers: message.content,
        cleanedText: message.content,
        citations: [],
      };
    }
    return parseTextAndCitations(message.content);
  }, [message.content, isAssistant]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  // Render message content with markdown and clickable citation markers
  const renderMessageContent = () => {
    if (!isAssistant) {
      return <span className="whitespace-pre-wrap">{message.content}</span>;
    }

    // Render text with clickable citation markers for assistant messages
    const { textWithMarkers, citations } = parsedContent;

    return (
      <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 whitespace-pre-wrap">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // Custom renderer to handle citation markers [n]
            p: ({ children }) => {
              return (
                <p>
                  {processCitationMarkers(children, citations, onCitationClick)}
                </p>
              );
            },
            li: ({ children }) => {
              return (
                <li>
                  {processCitationMarkers(children, citations, onCitationClick)}
                </li>
              );
            },
          }}
        >
          {textWithMarkers}
        </ReactMarkdown>
      </div>
    );
  };

  // Render citation summary at the bottom
  const renderCitationSummary = () => {
    const { citations } = parsedContent;
    if (citations.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1.5 lg:gap-2 mt-2 lg:mt-3 pt-2 lg:pt-3 border-t border-gray-200">
        {citations.map((citation, index) => (
          <button
            key={`${citation.start_char}-${index}`}
            onClick={() => onCitationClick(citation, index)}
            className="inline-flex items-center gap-1 px-1.5 lg:px-2 py-0.5 lg:py-1 text-xs rounded-md bg-cite/10 text-cite hover:bg-cite/20 transition-colors cursor-pointer"
            title={formatCitationLabel(citation)}
          >
            <span className="font-medium">[{index + 1}]</span>
            <span className="text-gray-600 max-w-24 lg:max-w-32 truncate">
              {formatCitationLabel(citation)}
            </span>
          </button>
        ))}
      </div>
    );
  };

  // Render disclaimer for assistant messages
  const renderDisclaimer = () => {
    return (
      <div className="mt-2 lg:mt-3 pt-2 lg:pt-3 border-t border-gray-200">
        <p className="text-xs lg:text-sm text-gray-500 italic">
          Chatbot chỉ cung cấp thông tin y tế mang tính tham khảo, không thay thế tư vấn, chẩn đoán hoặc điều trị của bác sĩ.
        </p>
      </div>
    );
  };

  return (
    <div>
      <div
        className={`flex items-start mb-3 lg:mb-4 gap-x-3 lg:gap-x-4 ${
          message.role === MessageRole.USER ? "justify-end" : ""
        }`}
      >
        {isAssistant && (
          <Icons.BotChat className="w-6 h-6 lg:w-8 lg:h-8 shrink-0" />
        )}
        <div
          className={`px-3 lg:px-4 py-2 lg:py-3 rounded-t-xl lg:rounded-t-2xl text-sm lg:text-base ${
            message.role === MessageRole.USER
              ? "rounded-bl-xl lg:rounded-bl-2xl bg-white border border-design-border max-w-[85%] lg:max-w-[70%]"
              : "rounded-br-xl lg:rounded-br-2xl bg-bg-answer w-full border border-bg-answer"
          }`}
        >
          {renderMessageContent()}
          {isAssistant && renderCitationSummary()}
          {isAssistant && renderDisclaimer()}
        </div>
      </div>
      <div
        className={`mt-1 lg:mt-2 text-xs lg:text-sm text-gray-400 ${
          message.role === MessageRole.USER
            ? "text-right"
            : "text-left ml-9 lg:ml-12"
        }`}
      >
        {formatTime(message.createdAt)}
      </div>
    </div>
  );
});

// Process text children to replace [n] markers with clickable buttons
function processCitationMarkers(
  children: React.ReactNode,
  citations: Citation[],
  onCitationClick: (citation: Citation, index: number) => void
): React.ReactNode {
  if (!children) return children;

  if (typeof children === "string") {
    children = children.trim();
  }

  // If children is an array, process each element
  if (Array.isArray(children)) {
    return children.map((child, idx) => (
      <span key={idx}>
        {processCitationMarkers(child, citations, onCitationClick)}
      </span>
    ));
  }

  // If it's a string, replace [n] markers with buttons
  if (typeof children === "string") {
    const markerRegex = /\[(\d+)\]/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = markerRegex.exec(children)) !== null) {
      if (match.index > lastIndex) {
        parts.push(children.slice(lastIndex, match.index));
      }

      const markerNum = parseInt(match[1], 10);
      const citationIndex = markerNum - 1;

      if (citationIndex >= 0 && citationIndex < citations.length) {
        const citation = citations[citationIndex];
        parts.push(
          <button
            key={`marker-${match.index}`}
            onClick={(e) => {
              e.stopPropagation();
              onCitationClick(citation, citationIndex);
            }}
            className="inline-flex items-center justify-center text-cite font-semibold hover:bg-cite/20 rounded px-0.5 cursor-pointer transition-colors text-xs lg:text-sm"
            title={formatCitationLabel(citation)}
          >
            [{markerNum}]
          </button>
        );
      } else {
        parts.push(match[0]);
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < children.length) {
      parts.push(children.slice(lastIndex));
    }

    return parts.length > 0 ? parts : children;
  }

  // For other React elements, return as-is
  return children;
}

export function ChatPage() {
  const search = useSearch({ from: "/workspace/chat" });
  const navigate = useNavigate();
  const chatId = search?.chatId;
  const isNewChat = chatId === "new";
  const queryClient = useQueryClient();
  const { message: antMessage } = App.useApp();

  const [input, setInput] = useState("");
  const [selectedReference, setSelectedReference] = useState<Reference | null>(
    null
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [optimisticMessage, setOptimisticMessage] =
    useState<OptimisticMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Close reference panel when switching conversations
  useEffect(() => {
    setSelectedReference(null);
  }, [chatId]);

  // Fetch messages for the current conversation (skip for new chat)
  const { data: messagesData, isLoading } = useQuery({
    queryKey: ["messages", chatId],
    queryFn: async () => {
      if (!chatId || typeof chatId !== "string" || chatId === "new") {
        return { conversation: null, messages: [] };
      }
      return chatService.getMessages(chatId);
    },
    enabled: !!chatId && typeof chatId === "string" && chatId !== "new",
  });

  const messages = messagesData?.messages || [];

  // Auto-scroll to bottom when messages or streaming content changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText, optimisticMessage]);

  const handleCitationClick = useCallback(
    (citation: Citation, index: number) => {
      const reference = citationToReference(citation, index);
      setSelectedReference(reference);
    },
    []
  );

  const handleSend = useCallback(async () => {
    if (!input.trim() || isStreaming) return;

    const userInput = input;
    setInput("");

    // Show user message immediately (optimistic update)
    const tempMessage: OptimisticMessage = {
      id: `temp-${Date.now()}`,
      role: MessageRole.USER,
      content: userInput,
      createdAt: new Date().toISOString(),
    };
    setOptimisticMessage(tempMessage);

    // Start streaming
    setIsStreaming(true);
    setStreamingText("");

    try {
      if (isNewChat) {
        // Start new conversation with first message
        let newConversationId: string | null = null;

        for await (const chunk of chatService.startConversationStream(
          userInput
        )) {
          if (chunk.type === "conversation") {
            newConversationId = chunk.conversationId;
          } else if (chunk.type === "text" && chunk.text) {
            setStreamingText((prev) => prev + chunk.text);
          }
        }

        // Navigate to the new conversation
        if (newConversationId) {
          await queryClient.invalidateQueries({ queryKey: ["conversations"] });
          navigate({ to: "/chat", search: { chatId: newConversationId } });
        }
      } else {
        // Send message to existing conversation
        for await (const chunk of chatService.sendMessageStream(
          chatId as string,
          userInput
        )) {
          if (chunk.text) {
            setStreamingText((prev) => prev + chunk.text);
          }
        }

        // Streaming complete - refresh messages from server
        await queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
        await queryClient.invalidateQueries({ queryKey: ["conversations"] });
      }
    } catch (error: any) {
      console.error("Failed to send message:", error);
      antMessage.error(
        error?.message || "Gửi tin nhắn thất bại. Vui lòng thử lại."
      );
      // Restore input on error
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
    queryClient,
    antMessage,
    navigate,
  ]);

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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  if (isLoading && !isNewChat) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-500">Đang tải tin nhắn...</div>
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col lg:flex-row overflow-hidden">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col relative py-4 lg:py-6 min-h-0">
        <div className="flex-1 overflow-y-auto px-3 lg:px-4 pb-24 lg:pb-24 overscroll-contain">
          <div className="flex flex-col gap-3 lg:gap-4">
            {/* Messages rendering - keep your existing code */}
            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                onCitationClick={handleCitationClick}
              />
            ))}

            {optimisticMessage && (
              <div>
                <div className="flex items-start mb-3 lg:mb-4 gap-x-3 lg:gap-x-4 justify-end">
                  <div className="px-3 lg:px-4 py-2 lg:py-3 rounded-t-2xl rounded-bl-2xl bg-white border border-design-border shadow-sm max-w-[85%] lg:max-w-[70%]">
                    <span className="whitespace-pre-wrap text-sm lg:text-base">
                      {optimisticMessage.content}
                    </span>
                  </div>
                </div>
                <div className="mt-1 lg:mt-2 text-xs lg:text-sm text-gray-400 text-right">
                  {formatTime(optimisticMessage.createdAt)}
                </div>
              </div>
            )}

            {isStreaming && (
              <div>
                <div className="flex items-start mb-3 lg:mb-4 gap-x-3 lg:gap-x-4">
                  <Icons.BotChat className="w-6 h-6 lg:w-8 lg:h-8 shrink-0" />
                  <div className="px-3 lg:px-4 py-2 lg:py-3 rounded-t-2xl rounded-br-2xl bg-bg-answer w-full border border-bg-answer">
                    {streamingText ? (
                      <>
                        <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm lg:text-base">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {streamingText}
                          </ReactMarkdown>
                        </div>
                        <div className="mt-2 lg:mt-3 pt-2 lg:pt-3 border-t border-gray-200">
                          <p className="text-xs lg:text-sm text-gray-500 italic">
                            Chatbot chỉ cung cấp thông tin y tế mang tính tham khảo, không thay thế tư vấn, chẩn đoán hoặc điều trị của bác sĩ.
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="flex gap-1 text-cite">
                        <span className="animate-bounce">●</span>
                        <span
                          className="animate-bounce"
                          style={{ animationDelay: "100ms" }}
                        >
                          ●
                        </span>
                        <span
                          className="animate-bounce"
                          style={{ animationDelay: "200ms" }}
                        >
                          ●
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input area - responsive positioning and sizing */}
        <div className="absolute bottom-4 lg:bottom-6 px-3 lg:px-6 left-0 right-0 bg-bg-main">
          <div className="w-full border border-design-border rounded-xl lg:rounded-2xl flex items-center px-3 lg:px-4 py-2 lg:py-3 shadow-sm focus-within:border-btn-text focus-within:ring-2 focus-within:ring-btn-text/10 transition-all">
            <textarea
              className="w-full resize-none outline-none text-sm lg:text-base max-h-32 lg:max-h-40 overflow-y-auto bg-transparent"
              rows={1}
              placeholder="Bạn cần hỏi gì?"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
            />

            <button
              onClick={handleSend}
              disabled={isStreaming || !input.trim()}
              className="ml-2 lg:ml-3 p-2 rounded-lg lg:rounded-xl bg-btn-bg text-btn-text hover:bg-btn-hover-bg transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
            >
              <Icons.SendIcon className="w-4 h-4 lg:w-5 lg:h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Reference panel - overlays on mobile, sidebar on desktop */}
      {selectedReference && (
        <ReferencePanel
          reference={selectedReference}
          onClose={() => setSelectedReference(null)}
        />
      )}
    </div>
  );
}
