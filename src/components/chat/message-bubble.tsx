import Icons from "@/components/icons/icons";
import type { Citation, Message } from "@/types/api-types";
import { MessageRole } from "@/types/api-types";
import { formatCitationLabel, parseTextAndCitations } from "@/utils/citation-parser";
import { formatTime } from "@/utils/format-time";
import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Disclaimer } from "./disclaimer";

interface MessageBubbleProps {
  message: Message;
  onCitationClick: (citation: Citation, index: number) => void;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  onCitationClick,
}: MessageBubbleProps) {
  const isAssistant = message.role === MessageRole.ASSISTANT;

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
          {isAssistant ? (
            <AssistantContent
              parsedContent={parsedContent}
              onCitationClick={onCitationClick}
            />
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

function AssistantContent({
  parsedContent,
  onCitationClick,
}: {
  parsedContent: ReturnType<typeof parseTextAndCitations>;
  onCitationClick: (citation: Citation, index: number) => void;
}) {
  const { textWithMarkers, citations } = parsedContent;

  return (
    <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 whitespace-pre-wrap">
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
}

function processCitationMarkers(
  children: React.ReactNode,
  citations: Citation[],
  onCitationClick: (citation: Citation, index: number) => void
): React.ReactNode {
  if (!children) return children;

  if (typeof children === "string") {
    children = children.trim();
  }

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

  return children;
}
