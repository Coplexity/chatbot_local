import Icons from "../icons/icons";

export function TitleSection({ onMenuClick }: { onMenuClick?: () => void }) {
  return (
    <div className="p-4 lg:p-6 w-full pb-6 lg:pb-10 bg-bg-aside flex items-center justify-between">
      {/* Mobile menu button + Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-white/50 transition-colors"
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

        <h2 className="text-base lg:text-2xl font-bold">Chatbot y tế</h2>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 lg:gap-3">
        <button className="p-2 rounded-lg hover:bg-white/50 transition-colors cursor-pointer hidden">
          <Icons.UploadIcon className="w-4 h-4 lg:w-5 lg:h-5" />
        </button>
        <button className="p-2 rounded-lg hover:bg-white/50 transition-colors cursor-pointer hidden">
          <Icons.Copy className="w-4 h-4 lg:w-5 lg:h-5" />
        </button>
      </div>
    </div>
  );
}
