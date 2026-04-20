import Icons from "@/components/icons/icons";
import type { Citation, Message } from "@/types/api-types";
import { MessageRole } from "@/types/api-types";
import { formatCitationLabel, parseTextAndCitations } from "@/utils/citation-parser";
import { formatTime } from "@/utils/format-time";
import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Disclaimer } from "./disclaimer";
import { ThinkingPanel } from "./thinking-panel";
import { TypingIndicator } from "./typing-indicator";

interface StreamingState {
  isStreaming: boolean;
  citations: Citation[];
}

interface MessageBubbleProps {
  message: Message;
  hydratedCitations?: Citation[];
  streamingState?: StreamingState;
  onCitationClick: (citation: Citation, index: number) => void;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  hydratedCitations,
  streamingState,
  onCitationClick,
}: MessageBubbleProps) {
  const isAssistant = message.role === MessageRole.ASSISTANT;
  const isStreamingAssistant = isAssistant && streamingState?.isStreaming === true;

  const parsedContent = useMemo(() => {
    if (!isAssistant) {
      return {
        textWithMarkers: message.content,
        cleanedText: message.content,
        citations: [],
      };
    }
    const parsed = parseTextAndCitations(message.content);
    const resolvedCitations = streamingState?.citations ?? hydratedCitations;

    if (!resolvedCitations || resolvedCitations.length === 0) {
      return parsed;
    }

    const hydratedByChunkId = new Map(
      resolvedCitations.map((citation) => [citation.chunkId, citation])
    );
    const parsedCitations = parsed.citations.map((citation) => {
      const hydrated = hydratedByChunkId.get(citation.chunkId);
      return hydrated ? { ...citation, reference: hydrated.reference } : citation;
    });

    return {
      ...parsed,
      citations: parsedCitations.length > 0 ? parsedCitations : resolvedCitations,
    };
  }, [message.content, isAssistant, hydratedCitations, streamingState]);

  return (
    <div>
      <div
        className={`flex items-start mb-3 lg:mb-4 gap-x-3 lg:gap-x-4 ${
          message.role === MessageRole.USER ? "justify-end" : ""
        }`}
      >
        {isAssistant && (
          <Icons.BotChat className="w-10 h-10 lg:w-12 lg:h-12 shrink-0 rounded-full border border-design-border bg-white p-1.5" />
        )}
        <div
          className={`px-4 lg:px-5 py-3 lg:py-4 rounded-[1.35rem] text-sm lg:text-base ${
            message.role === MessageRole.USER
              ? "bg-white border border-design-border max-w-[85%] lg:max-w-[48%] text-slate-700"
              : "bg-bg-answer w-full border border-transparent text-slate-700"
          }`}
        >
          {isAssistant && <ThinkingPanel steps={message.metadata?.thinking} />}
          {isAssistant ? (
            isStreamingAssistant && !parsedContent.textWithMarkers.trim() ? (
              <div aria-label="Assistant is typing">
                <TypingIndicator />
              </div>
            ) : (
              <AssistantContent
                parsedContent={parsedContent}
                onCitationClick={onCitationClick}
              />
            )
          ) : (
            <span className="whitespace-pre-wrap">{message.content}</span>
          )}
          {isAssistant && (
            <CitationSummary
              citations={parsedContent.citations}
              onCitationClick={onCitationClick}
            />
          )}
          {isAssistant && <Disclaimer />}
        </div>
      </div>
      <div
        className={`mt-1 lg:mt-2 text-xs lg:text-sm text-slate-500 ${
          message.role === MessageRole.USER
            ? "text-right"
            : "text-right pr-1"
        }`}
      >
        {formatTime(message.createdAt)}
      </div>
    </div>
  );
});

function AssistantContent({
  parsedContent,
  onCitationClick,
}: {
  parsedContent: ReturnType<typeof parseTextAndCitations>;
  onCitationClick: (citation: Citation, index: number) => void;
}) {
  const { textWithMarkers, citations } = parsedContent;

  return (
    <div className="prose max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:mt-4 prose-headings:mb-2 prose-p:text-slate-700 prose-li:text-slate-700">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p>{processCitationMarkers(children, citations, onCitationClick)}</p>
          ),
          li: ({ children }) => (
            <li>{processCitationMarkers(children, citations, onCitationClick)}</li>
          ),
        }}
      >
        {textWithMarkers}
      </ReactMarkdown>
    </div>
  );
}

function CitationSummary({
  citations,
  onCitationClick,
}: {
  citations: Citation[];
  onCitationClick: (citation: Citation, index: number) => void;
}) {
  if (citations.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 lg:gap-2 mt-3 pt-3 border-t border-slate-200/80">
      {citations.map((citation, index) => (
        <button
          key={`${citation.chunkId}-${index}`}
          onClick={() => onCitationClick(citation, index)}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-white/70 text-cite hover:bg-white transition-colors cursor-pointer"
          title={formatCitationLabel(citation)}
        >
          <span className="font-medium">[{index + 1}]</span>
          <span className="text-slate-500 max-w-24 lg:max-w-32 truncate">
            {formatCitationLabel(citation)}
          </span>
        </button>
      ))}
    </div>
  );
}

function processCitationMarkers(
  children: React.ReactNode,
  citations: Citation[],
  onCitationClick: (citation: Citation, index: number) => void
): React.ReactNode {
  if (!children) return children;

  if (Array.isArray(children)) {
    return children.map((child, idx) => (
      <span key={idx}>
        {processCitationMarkers(child, citations, onCitationClick)}
      </span>
    ));
  }

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
            className="inline-flex items-center justify-center text-cite font-semibold hover:bg-cite/10 rounded-full px-1 cursor-pointer transition-colors text-xs lg:text-sm"
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

  return children;
}
