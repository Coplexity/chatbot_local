import { DISCLAIMER_TEXT } from "./constants";

export function Disclaimer() {
  return (
    <div className="mt-3 pt-3 border-t border-slate-200/80">
      <p className="text-xs lg:text-sm text-slate-500 italic">{DISCLAIMER_TEXT}</p>
    </div>
  );
}
