import Icons from "@/components/icons/icons";
import React, { useState } from "react";

interface FileWithProgress {
  file: File;
  progress: number;
  id: string;
}

interface UploadDraftProps {
  onCheck: () => void;
  showResult: Boolean;
}

export function UploadDraft({ onCheck, showResult }: UploadDraftProps) {
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [text, setText] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      const newFiles: FileWithProgress[] = Array.from(selectedFiles).map(
        (file) => ({
          file,
          progress: 0,
          id: `${file.name}-${Date.now()}-${Math.random()}`,
        })
      );

      setFiles((prev) => [...prev, ...newFiles]);

      newFiles.forEach((fileWithProgress) => {
        const interval = setInterval(() => {
          setFiles((prevFiles) =>
            prevFiles.map((f) => {
              if (f.id === fileWithProgress.id) {
                if (f.progress >= 100) {
                  clearInterval(interval);
                  return { ...f, progress: 100 };
                }
                return { ...f, progress: f.progress + 5 };
              }
              return f;
            })
          );
        }, 100);
      });
    }

    e.target.value = "";
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="w-full mx-auto border border-[#DCDCDC] rounded-lg shadow-sm">
      <div className="p-6 bg-[#F9F9F9] border-b border-[#EFEEF5] rounded-t-lg">
        <h2>Nhập tờ trình/ dự thảo</h2>
      </div>
      <div className="m-6 space-y-4">
        {/* upload */}
        <div className="border-2 border-dashed border-[#DCDCDC] rounded-lg p-6 text-center bg-design-lightblue space-y-2">
          <>
            <h3>
              {files.length > 0
                ? `Đã chọn ${files.length} file`
                : "Chưa chọn file"}
            </h3>
            <p>Kéo hoặc thả hoặc chọn một hoặc nhiều file</p>
            <p className="mb-4">
              Vui lòng upload file PDF hoặc DOCX, dung lượng không vượt quá 10MB
            </p>
            <label
              htmlFor="file-upload"
              className="border border-primary-blue text-primary-blue px-4 py-2 space-x-2 rounded-sm cursor-pointer hover:bg-blue-600 hover:text-white transition font-bold"
            >
              <Icons.FileUpload />
              Chọn file
            </label>
            <input
              id="file-upload"
              type="file"
              accept=".pdf,.docx"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </>
        </div>

        {files.length > 0 && (
          <div className="space-y-3">
            {files.map((fileWithProgress) => (
              <div
                key={fileWithProgress.id}
                className="w-full flex justify-between gap-8"
              >
                <div className="w-full space-y-2">
                  {/* File & Size */}
                  <div className="flex justify-between items-center">
                    <span>{fileWithProgress.file.name}</span>
                    <span>
                      {`${(fileWithProgress.file.size / 1024 / 1024).toFixed(
                        1
                      )}MB`}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-300 h-2 rounded-full">
                    <div
                      className="h-2 rounded-full bg-primary-blue transition-all"
                      style={{ width: `${fileWithProgress.progress}%` }}
                    />
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveFile(fileWithProgress.id)}
                  className="text-[#AEAEAE] text-xl hover:text-red-500"
                >
                  <Icons.TrashAlt />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Text input */}
        <div className="">
          <h3 className="mb-4">Hoặc nhập văn bản</h3>
          <textarea
            value={text}
            onChange={handleTextChange}
            placeholder="Nhập văn bản"
            className="w-full h-30 p-4 border border-[#DCDCDC] rounded-lg"
          />
        </div>

        {/* Check */}
        <div className="flex justify-end">
          <button
            className={`flex items-center gap-2 ${
              showResult ? "bg-primary-blue" : "bg-[#AEAEAE]"
            } text-white px-4 py-2 rounded-md hover:bg-primary-blue transition cursor-pointer`}
            onClick={onCheck}
          >
            <Icons.ArrowsRotate />
            Kiểm tra
          </button>
        </div>
      </div>
    </div>
  );
}
