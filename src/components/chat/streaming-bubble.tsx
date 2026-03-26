import Icons from "@/components/icons/icons";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Disclaimer } from "./disclaimer";
import { TypingIndicator } from "./typing-indicator";

interface StreamingBubbleProps {
  streamingText: string;
}

export function StreamingBubble({ streamingText }: StreamingBubbleProps) {
  return (
    <div>
      <div className="flex items-start mb-3 lg:mb-4 gap-x-3 lg:gap-x-4">
        <Icons.BotChat className="w-10 h-10 lg:w-12 lg:h-12 shrink-0 rounded-full border border-design-border bg-white p-1.5" />
        <div className="px-4 lg:px-5 py-3 lg:py-4 rounded-[1.35rem] bg-bg-answer w-full border border-transparent text-slate-700">
          {streamingText ? (
            <>
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm lg:text-base prose-p:text-slate-700">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {streamingText}
                </ReactMarkdown>
              </div>
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
