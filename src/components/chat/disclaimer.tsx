import { DISCLAIMER_TEXT } from "./constants";

export function Disclaimer() {
  return (
    <div className="mt-2 lg:mt-3 pt-2 lg:pt-3 border-t border-gray-200">
      <p className="text-xs lg:text-sm text-gray-500 italic">{DISCLAIMER_TEXT}</p>
    </div>
  );
}
