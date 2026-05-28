import { useRef, useCallback, useEffect } from "react";

import { ModeSelector } from "./mode-selector";
import { QueryScopePopover } from "./query-scope-popover";
import Icons from "@/components/icons/icons";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
  mode: "basic" | "deep";
  onModeChange: (mode: "basic" | "deep") => void;
  selectedUserIds: string[];
  onUserIdsChange: (userIds: string[]) => void;
  queryHistory: string[];
  historyIndex: number;
  onHistoryNavigate: (index: number) => void;
  isStreaming: boolean;
  hasDraft: boolean;
  onSendDraft: () => void;
  onDiscardDraft: () => void;
}

const MAX_CHARS = 500;

export function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
  mode = "basic",
  onModeChange,
  selectedUserIds,
  onUserIdsChange,
  queryHistory,
  historyIndex,
  onHistoryNavigate,
  isStreaming,
  hasDraft,
  onSendDraft,
  onDiscardDraft,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const historyIndexRef = useRef(historyIndex);
  const isNavigatingRef = useRef(false);

  historyIndexRef.current = historyIndex;

  const adjustHeight = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const lineHeight = 24;
    const maxLines = 12;
    const maxHeight = lineHeight * maxLines + 24;
    const newHeight = Math.min(Math.max(ta.scrollHeight, 48), maxHeight);
    ta.style.height = newHeight + "px";
  }, []);

  useEffect(() => {
    adjustHeight();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    if (text.length > MAX_CHARS) return;
    onChange(text);
    isNavigatingRef.current = false;
    adjustHeight();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (value.trim()) {
        onSend();
      }
      return;
    }

    if (e.key === "ArrowUp" && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      if (queryHistory.length === 0) return;
      const nextIndex = Math.min(historyIndexRef.current + 1, queryHistory.length - 1);
      isNavigatingRef.current = true;
      onHistoryNavigate(nextIndex);
      const target = queryHistory[nextIndex] ?? "";
      onChange(target);
      requestAnimationFrame(() => {
        adjustHeight();
        const ta = textareaRef.current;
        if (ta) ta.selectionStart = ta.selectionEnd = ta.value.length;
      });
      return;
    }

    if (e.key === "ArrowDown" && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      if (queryHistory.length === 0) return;
      if (historyIndexRef.current === 0) {
        isNavigatingRef.current = false;
        onHistoryNavigate(-1);
        onChange("");
        return;
      }
      const nextIndex = Math.max(historyIndexRef.current - 1, 0);
      isNavigatingRef.current = true;
      onHistoryNavigate(nextIndex);
      onChange(queryHistory[nextIndex] ?? "");
      requestAnimationFrame(() => {
        adjustHeight();
        const ta = textareaRef.current;
        if (ta) ta.selectionStart = ta.selectionEnd = ta.value.length;
      });
      return;
    }
  };

  const canSend = value.trim().length > 0;

  return (
    <div className="absolute bottom-4 lg:bottom-6 px-2 lg:px-6 left-0 right-0 bg-transparent">
      <div
        className={`
          w-full rounded-2xl border bg-white shadow-sm
          transition-all duration-200
          ${isStreaming ? "border-blue-200" : "border-slate-200 hover:border-slate-300"}
          focus-within:border-[#4c82e8] focus-within:shadow-blue-200/30 focus-within:shadow-md
        `}
      >
        {hasDraft && !isStreaming && (
          <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-1">
            <span className="text-sm text-blue-600">
              Bạn có tin nhắn đang chờ
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onDiscardDraft}
                className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Bỏ
              </button>
              <button
                type="button"
                onClick={onSendDraft}
                className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg transition-colors"
              >
                Gửi
              </button>
            </div>
          </div>
        )}

        <div className="px-4 pt-3 pb-2">
          <textarea
            ref={textareaRef}
            className="
              w-full resize-none outline-none text-base text-slate-700
              bg-transparent placeholder:text-slate-400
              max-h-64 overflow-y-auto
            "
            rows={1}
            placeholder="Viết câu hỏi..."
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onInput={adjustHeight}
            disabled={false}
            aria-label="Nhập câu hỏi"
          />
        </div>

        <div className="flex items-center justify-between px-4 pb-3">
          <div className="flex items-center gap-2 min-w-0">
            <ModeSelector
              value={mode}
              onChange={onModeChange}
              disabled={false}
            />
            <QueryScopePopover
              selectedUserIds={selectedUserIds}
              onChange={onUserIdsChange}
              disabled={false}
            />
          </div>

          <button
            type="button"
            onClick={onSend}
            disabled={!canSend || disabled}
            className="
              w-9 h-9 lg:w-10 lg:h-10 rounded-full flex items-center justify-center
              bg-[#4c82e8] text-white
              transition-all duration-150
              hover:bg-[#3f73d4] hover:scale-105 hover:shadow-lg hover:shadow-blue-200
              disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none
              cursor-pointer
            "
            aria-label="Gửi tin nhắn"
            title="Gửi tin nhắn (Enter)"
          >
            <Icons.SendIcon className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
