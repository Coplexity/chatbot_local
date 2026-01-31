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
        <div className="px-3 lg:px-4 py-2 lg:py-3 rounded-t-2xl rounded-bl-2xl bg-white border border-design-border shadow-sm max-w-[85%] lg:max-w-[70%]">
          <span className="whitespace-pre-wrap text-sm lg:text-base">
            {message.content}
          </span>
        </div>
      </div>
      <div className="mt-1 lg:mt-2 text-xs lg:text-sm text-gray-400 text-right">
        {formatTime(message.createdAt)}
      </div>
    </div>
  );
}

export type { OptimisticMessage };
