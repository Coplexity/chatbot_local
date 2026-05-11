interface ModeOption {
  value: "basic" | "deep";
  label: string;
}

const MODE_OPTIONS: ModeOption[] = [
  { value: "basic", label: "Basic" },
  { value: "deep", label: "Deep thinking" },
];

interface ModeSelectorProps {
  value: "basic" | "deep";
  onChange: (mode: "basic" | "deep") => void;
  disabled?: boolean;
}

export function ModeSelector({ value, onChange, disabled }: ModeSelectorProps) {
  const selectedValue = value ?? "basic";

  return (
    <div
      role="group"
      aria-label="Chọn chế độ tư vấn"
      className="inline-flex items-center rounded-full border border-slate-200 bg-white p-0.5 gap-0"
    >
      {MODE_OPTIONS.map((opt) => {
        const isActive = selectedValue === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={isActive}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`
              px-3 py-1 rounded-full text-sm font-medium transition-all duration-200
              disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer
              ${isActive
                ? "bg-[#4c82e8] text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }
            `}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
