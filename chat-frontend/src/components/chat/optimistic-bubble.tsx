import { formatTime } from "@/utils/format-time";
import { MessageRole } from "@/types/api-types";

interface OptimisticMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

interface OptimisticBubbleProps {
  message: OptimisticMessage;
}

export function OptimisticBubble({ message }: OptimisticBubbleProps) {
  return (
    <div>
      <div className="flex items-start mb-3 lg:mb-4 gap-x-3 lg:gap-x-4 justify-end">
        <div className="px-4 lg:px-5 py-3 lg:py-4 rounded-[1.35rem] bg-white border border-design-border max-w-[85%] lg:max-w-[48%] text-slate-700">
          <span className="whitespace-pre-wrap text-sm lg:text-base">
            {message.content}
          </span>
        </div>
      </div>
      <div className="mt-1 lg:mt-2 text-xs lg:text-sm text-slate-500 text-right">
        {formatTime(message.createdAt)}
      </div>
    </div>
  );
}

export type { OptimisticMessage };
