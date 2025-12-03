import Icons from "../icons/icons";

export function TitleSection() {
  return (
    <div className="p-6 w-full pb-10 bg-gray-100 flex items-center justify-between">
      <h2>Chatbot y tế</h2>
      <div className="flex gap-2">
        <Icons.UploadIcon className="w-6 h-6 cursor-pointer" />
        <Icons.Copy className="w-6 h-6 cursor-pointer" />
      </div>
    </div>
  );
}
