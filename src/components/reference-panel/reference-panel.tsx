import React from "react";
import Icons from "@/components/icons/icons";
import { Reference } from "@/types/chat-types";
import { formatCitationLabel } from "@/utils/citation-parser";

interface ReferencePanelProps {
  reference: Reference;
  onClose: () => void;
}

export function ReferencePanel({ reference, onClose }: ReferencePanelProps) {
  // Build source label from citation fields
  const sourceLabel = formatCitationLabel(reference);

  // Get the excerpt content
  const excerptContent =
    reference.noi_dung_da_su_dung || "Không có nội dung trích dẫn";

  // Check for special resource types (figure/table)
  const hasResource = reference.resource_type && reference.resource_content;

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
          className="text-gray-400 hover:text-gray-600 transition cursor-pointer"
        >
          <Icons.XIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
        {/* Citation location info */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          {reference.chuong !== undefined && reference.chuong !== null && (
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-gray-500">Chương</span>
              <p className="font-medium text-gray-900">{reference.chuong}</p>
            </div>
          )}
          {reference.dieu !== undefined && reference.dieu !== null && (
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-gray-500">Điều</span>
              <p className="font-medium text-gray-900">{reference.dieu}</p>
            </div>
          )}
          {reference.khoan !== undefined && reference.khoan !== null && (
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-gray-500">Khoản</span>
              <p className="font-medium text-gray-900">{reference.khoan}</p>
            </div>
          )}
          {reference.phu_luc !== undefined && reference.phu_luc !== null && (
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-gray-500">Phụ lục</span>
              <p className="font-medium text-gray-900">{reference.phu_luc}</p>
            </div>
          )}
        </div>

        {/* Excerpt content */}
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-500 mb-2">
            Nội dung trích dẫn
          </h4>
          <div className="bg-gray-50 rounded-lg p-4 leading-relaxed text-base text-gray-800">
            {excerptContent}
          </div>
        </div>

        {/* Resource content (figure/table) */}
        {hasResource && (
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">
              {reference.resource_type === "figure" ? "Hình ảnh" : "Bảng"}
            </h4>
            {reference.resource_type === "figure" ? (
              <img
                src={reference.resource_content}
                alt="Reference figure"
                className="w-full rounded-lg border border-gray-200"
              />
            ) : (
              <div
                className="overflow-x-auto bg-white rounded-lg border border-gray-200 p-2"
                dangerouslySetInnerHTML={{
                  __html: reference.resource_content || "",
                }}
              />
            )}
          </div>
        )}

        {/* Source reference */}
        <div className="p-4 rounded-lg border border-[#EBEBEB] mt-auto">
          <p className="text-sm">
            <span className="text-gray-500">Nguồn dẫn: </span>
            <span className="font-medium">{sourceLabel}</span>
          </p>

          {(reference.start_char !== undefined || reference.end_char !== undefined) && (
            <p className="text-xs text-gray-400 mt-1">
              Vị trí: {reference.start_char} - {reference.end_char}
            </p>
          )}

          <button className="bg-[#F2F8FF] py-2 px-4 w-full items-center rounded-md text-[#027BFF] font-medium underline mt-4 hover:bg-[#E1EFFF] cursor-pointer">
            Xem tài liệu đầy đủ
          </button>
        </div>
      </div>
    </div>
  );
}
