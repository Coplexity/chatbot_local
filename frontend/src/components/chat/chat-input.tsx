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
    <div className="absolute bottom-4 lg:bottom-6 px-2 lg:px-6 left-0 right-0 bg-transparent">
      <div className="w-full border border-design-border rounded-[1.2rem] flex items-end px-4 lg:px-5 py-3 lg:py-4 bg-white focus-within:border-[#4c82e8] transition-all">
        <textarea
          className="w-full resize-none outline-none text-base lg:text-lg text-slate-700 max-h-32 lg:max-h-40 overflow-y-auto bg-transparent placeholder:text-slate-500"
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
          className="ml-3 p-2 text-slate-400 hover:text-[#4c82e8] bg-transparent transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
        >
          <Icons.SendIcon className="w-4 h-4 lg:w-5 lg:h-5" />
        </button>
      </div>
    </div>
  );
}
