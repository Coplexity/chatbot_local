import Icons from "../icons/icons";

export function TitleSection() {
  return (
    <div className="p-6 w-full pb-10 bg-bg-aside flex items-center justify-between">
      <h2>Chatbot y tế</h2>
      <div className="flex gap-3">
        <button className="p-2 rounded-lg hover:bg-white/50 transition-colors cursor-pointer hidden">
          <Icons.UploadIcon className="w-5 h-5" />
        </button>
        <button className="p-2 rounded-lg hover:bg-white/50 transition-colors cursor-pointer hidden">
          <Icons.Copy className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

