import Icons from "@/components/icons/icons";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
}

export function ChatInput({ value, onChange, onSend, disabled }: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  };

  return (
    <div className="absolute bottom-4 lg:bottom-6 px-3 lg:px-6 left-0 right-0 bg-bg-main">
      <div className="w-full border border-design-border rounded-xl lg:rounded-2xl flex items-center px-3 lg:px-4 py-2 lg:py-3 shadow-sm focus-within:border-btn-text focus-within:ring-2 focus-within:ring-btn-text/10 transition-all">
        <textarea
          className="w-full resize-none outline-none text-sm lg:text-base max-h-32 lg:max-h-40 overflow-y-auto bg-transparent"
          rows={1}
          placeholder="Bạn cần hỏi gì?"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <button
          onClick={onSend}
          disabled={disabled || !value.trim()}
          className="ml-2 lg:ml-3 p-2 rounded-lg lg:rounded-xl bg-btn-bg text-btn-text hover:bg-btn-hover-bg transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
        >
          <Icons.SendIcon className="w-4 h-4 lg:w-5 lg:h-5" />
        </button>
      </div>
    </div>
  );
}
