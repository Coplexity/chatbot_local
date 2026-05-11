import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBrain } from "@fortawesome/free-solid-svg-icons";

interface ThinkingToggleProps {
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function ThinkingToggle({ enabled, onToggle, disabled }: ThinkingToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label="Bật/tắt hiển thị quá trình suy nghĩ của bot"
      title="Bật/tắt hiển thị quá trình suy nghĩ của bot"
      onClick={onToggle}
      disabled={disabled}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
        transition-all duration-200 cursor-pointer select-none
        disabled:opacity-40 disabled:cursor-not-allowed
        ${enabled
          ? "bg-[#4c82e8] text-white shadow-sm"
          : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-600"
        }
      `}
    >
      <FontAwesomeIcon icon={faBrain} className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">Thinking</span>
      <span className="sm:hidden">💭</span>
    </button>
  );
}
