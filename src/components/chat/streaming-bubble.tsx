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
        <Icons.BotChat className="w-6 h-6 lg:w-8 lg:h-8 shrink-0" />
        <div className="px-3 lg:px-4 py-2 lg:py-3 rounded-t-2xl rounded-br-2xl bg-bg-answer w-full border border-bg-answer">
          {streamingText ? (
            <>
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm lg:text-base">
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
