import Icons from "@/components/icons/icons";
import { useMemo, useState } from "react";

interface ThinkingPanelProps {
  steps?: string[];
}

export function ThinkingPanel({ steps = [] }: ThinkingPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const visibleSteps = useMemo(() => {
    return steps
      .map((step) => step.trim())
      .filter((step, index, all) => step.length > 0 && (index === 0 || step !== all[index - 1]));
  }, [steps]);

  if (visibleSteps.length === 0) {
    return null;
  }

  return (
    <div className="mb-3 rounded-2xl border border-slate-200 bg-white/80">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Thinking
          </p>
          <p className="text-sm font-medium text-slate-600">
            {visibleSteps.length} step{visibleSteps.length === 1 ? "" : "s"}
          </p>
        </div>
        <Icons.AngleDown
          className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="border-t border-slate-200 px-4 py-3">
          <div className="space-y-2">
            {visibleSteps.map((step, index) => (
              <p key={`${index}-${step}`} className="text-sm leading-6 text-slate-600 whitespace-pre-wrap">
                {step}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
