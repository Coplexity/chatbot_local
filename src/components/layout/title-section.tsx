import Icons from "../icons/icons";

export function TitleSection({ onMenuClick }: { onMenuClick?: () => void }) {
  return (
    <div className="px-4 pt-4 pb-3 lg:px-6 lg:pt-6 lg:pb-4 w-full bg-bg-app flex items-center justify-between">
      {/* Mobile menu button + Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-full hover:bg-white transition-colors"
          aria-label="Open menu"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        <h2 className="text-[1.75rem] leading-none font-extrabold tracking-[-0.03em] text-slate-700">
          Chatbot Y tế
        </h2>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 lg:gap-3">
        <button className="p-2 rounded-full text-slate-500 hover:bg-white transition-colors cursor-pointer">
          <Icons.UploadIcon className="w-4 h-4 lg:w-5 lg:h-5" />
        </button>
        <button className="p-2 rounded-full text-slate-500 hover:bg-white transition-colors cursor-pointer">
          <Icons.Copy className="w-4 h-4 lg:w-5 lg:h-5" />
        </button>
      </div>
    </div>
  );
}
