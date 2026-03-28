import Icons from "@/components/icons/icons";
import type { Citation } from "@/types/api-types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Disclaimer } from "./disclaimer";
import { ThinkingPanel } from "./thinking-panel";
import { TypingIndicator } from "./typing-indicator";
import { formatCitationLabel } from "@/utils/citation-parser";

interface StreamingBubbleProps {
  streamingText: string;
  streamingTrace?: string[];
  citations: Citation[];
  onCitationClick: (citation: Citation, index: number) => void;
}

export function StreamingBubble({
  streamingText,
  streamingTrace = [],
  citations,
  onCitationClick,
}: StreamingBubbleProps) {
  return (
    <div>
      <div className="flex items-start mb-3 lg:mb-4 gap-x-3 lg:gap-x-4">
        <Icons.BotChat className="w-10 h-10 lg:w-12 lg:h-12 shrink-0 rounded-full border border-design-border bg-white p-1.5" />
        <div className="px-4 lg:px-5 py-3 lg:py-4 rounded-[1.35rem] bg-bg-answer w-full border border-transparent text-slate-700">
          <ThinkingPanel steps={streamingTrace} />

          {streamingText ? (
            <>
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm lg:text-base prose-p:text-slate-700">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {streamingText}
                </ReactMarkdown>
              </div>
              {citations.length > 0 && (
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
              )}
              <Disclaimer />
            </>
          ) : (
            <TypingIndicator />
          )}
        </div>
      </div>
    </div>
  );
}
