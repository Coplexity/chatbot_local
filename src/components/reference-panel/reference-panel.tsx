import React from "react";
import Icons from "@/components/icons/icons";
import { Reference } from "@/types/chat-types";

interface ReferencePanelProps {
  reference: Reference;
  onClose: () => void;
}

export function ReferencePanel({ reference, onClose }: ReferencePanelProps) {
  return (
    <div className="w-xs border-l border-[#EBEBEB] bg-white h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-[#EBEBEB] flex items-center justify-between">
        <div className="font-bold">
          <span className="text-[#50ACB7]">
            Tham chiếu [{reference.number}] -
          </span>
          <span> Nguồn gốc</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition"
        >
          <Icons.XIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col justify-between">
        <div>
          <p className="leading-relaxed text-base">{reference.content}</p>
        </div>

        <div className="p-4 rounded-lg border border-[#EBEBEB]">
          <p>
            <span>Nguồn dẫn đủ: </span>
            {reference.source}
          </p>

          <button className="bg-[#F2F8FF] py-2 px-4 w-full items-center rounded-md text-[#027BFF] font-medium underline mt-4 hover:bg-[#E1EFFF]">
            Xem tài liệu đầy đủ
          </button>
        </div>
      </div>
    </div>
  );
}
