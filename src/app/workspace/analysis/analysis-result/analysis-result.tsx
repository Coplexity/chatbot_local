import Icons from "@/components/icons/icons";
import React from "react";

export function AnalysisResult() {
  return (
    <div className="w-full mx-auto border border-[#DCDCDC] rounded-lg shadow-sm">
      <div className="p-6 bg-[#F9F9F9] border-b border-[#EFEEF5] rounded-t-lg">
        <h2>Kết quả phân tích</h2>
      </div>
      <div className="m-6 space-y-4 ">
        {/* Relative legit */}
        <div className="flex flex-wrap items-center gap-2 mb-6 pb-6 border-b border-[#EFEEF5]">
          <span>Luật liên quan:</span>
          <h3>Luật đất đai 2023</h3>
          <button className="mx-4 bg-design-lightblue py-2 px-4 rounded-lg text-primary-blue underline cursor-pointer shadow-xs">
            Xem văn bản
          </button>
        </div>

        {/* Prefer */}
        <div className="flex gap-2 items-center">
          <span>Tương thích:</span>{" "}
          <h3>Có - giải thích [LLM giải thích + trích dẫn]</h3>
        </div>

        {/* Download */}
        <div className="flex justify-end">
          <button className="items-center gap-2 bg-primary-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition cursor-pointer">
            <Icons.Download />
            Tải báo cáo
          </button>
        </div>
      </div>
    </div>
  );
}
