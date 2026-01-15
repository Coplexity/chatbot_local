import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from 'rehype-raw';
import "katex/dist/katex.min.css";
import Icons from "@/components/icons/icons";
import { Reference } from "@/types/chat-types";
import { formatCitationLabel } from "@/utils/citation-parser";

interface ReferencePanelProps {
  reference: Reference;
  onClose: () => void;
}

export function ReferencePanel({ reference, onClose }: ReferencePanelProps) {
  const [imageLoading, setImageLoading] = useState(true);

  const processMarkdownContent = (content: string) => {
    if (!content) return "";
    let cleaned = content;
    // Fix LLM formatting issues with \n
    cleaned = cleaned.replace(/\| \|/g, "|\n|");
    cleaned = cleaned.trim();

    return cleaned;
  };

  const sourceLabel = formatCitationLabel(reference);
  const excerptContent =
    reference.noi_dung_da_su_dung || "Không có nội dung trích dẫn";
  const hasResource = reference.resource_type && reference.resource_content;

  return (
    <>
      {/* Mobile overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Panel - slide from right on mobile, static on desktop */}
      <div
        className={`
        fixed lg:relative
        top-0 right-0 bottom-0
        w-full sm:w-96 lg:w-xs
        transform transition-transform duration-300 ease-in-out
        z-50 lg:z-auto
        border-l border-design-border bg-white h-full flex flex-col
      `}
      >
        {/* Header */}
        <div className="p-4 lg:p-6 border-b border-design-border flex items-center justify-between">
          <div className="font-bold text-sm lg:text-base">
            <span className="text-cite">Tham chiếu [{reference.number}] -</span>
            <span> Nguồn gốc</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition cursor-pointer p-1"
            aria-label="Đóng"
          >
            <Icons.XIcon className="w-5 h-5 lg:w-6 lg:h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 flex flex-col gap-3 lg:gap-4">
          {/* Document name */}
          {reference.van_ban && (
            <div className="mb-1">
              <h4 className="text-xs lg:text-sm font-medium text-gray-500 mb-2">
                Văn bản
              </h4>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 lg:p-4">
                <p className="font-medium text-sm lg:text-base wrap-break-word">
                  {reference.van_ban}
                </p>
              </div>
            </div>
          )}

          {/* Citation location info */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            {reference.chuong !== undefined && reference.chuong !== null && (
              <div className="bg-gray-50 rounded-lg p-2 lg:p-3">
                <span className="text-gray-500 text-xs lg:text-sm">Chương</span>
                <p className="font-medium text-gray-900">{reference.chuong}</p>
              </div>
            )}
            {reference.dieu !== undefined && reference.dieu !== null && (
              <div className="bg-gray-50 rounded-lg p-2 lg:p-3">
                <span className="text-gray-500 text-xs lg:text-sm">Điều</span>
                <p className="font-medium text-gray-900">{reference.dieu}</p>
              </div>
            )}
            {reference.khoan !== undefined && reference.khoan !== null && (
              <div className="bg-gray-50 rounded-lg p-2 lg:p-3">
                <span className="text-gray-500 text-xs lg:text-sm">Khoản</span>
                <p className="font-medium text-gray-900">{reference.khoan}</p>
              </div>
            )}
            {reference.phu_luc !== undefined && reference.phu_luc !== null && (
              <div className="bg-gray-50 rounded-lg p-2 lg:p-3">
                <span className="text-gray-500 text-xs lg:text-sm">
                  Phụ lục
                </span>
                <p className="font-medium text-gray-900">{reference.phu_luc}</p>
              </div>
            )}
          </div>

          {/* Excerpt content */}
          <div className="flex-1">
            <h4 className="text-xs lg:text-sm font-medium text-gray-500 mb-2">
              Nội dung trích dẫn
            </h4>
            <div className="bg-gray-50 rounded-lg p-3 lg:p-4 leading-relaxed text-sm lg:text-base text-gray-800">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {excerptContent.replace(/\\\\/g, "\\")}
              </ReactMarkdown>
            </div>
          </div>

          {/* Resource content (figure/table) */}
          {hasResource && (
            <div>
              <h4 className="text-xs lg:text-sm font-medium text-gray-500 mb-2">
                {reference.resource_type === "figure" ? "Hình ảnh" : "Bảng"}
              </h4>
              {reference.resource_type === "figure" ? (
                <div className="relative rounded-lg border border-gray-200 min-h-28">
                  {imageLoading && (
                    <div className="absolute inset-0 bg-gray-200 rounded-lg animate-pulse flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                    </div>
                  )}
                  <img
                    src={`https://medical-chatbot.fdn.li/static/figure/${reference.resource_content}`}
                    alt="Reference figure"
                    className={`w-full transition-opacity duration-200 ${
                      imageLoading ? "opacity-0" : "opacity-100"
                    }`}
                    onLoad={() => setImageLoading(false)}
                    onError={() => setImageLoading(false)}
                  />
                </div>
              ) : (
                <div className="overflow-x-auto bg-white -mx-2 px-2">
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeKatex, rehypeRaw]}
                      components={{
                        table: ({ children }) => (
                          <table className="min-w-full border-collapse border border-gray-300 text-xs lg:text-sm">
                            {children}
                          </table>
                        ),
                        thead: ({ children }) => (
                          <thead className="bg-gray-100">{children}</thead>
                        ),
                        tbody: ({ children }) => (
                          <tbody className="bg-white divide-y divide-gray-200">
                            {children}
                          </tbody>
                        ),
                        tr: ({ children }) => (
                          <tr className="hover:bg-gray-50">{children}</tr>
                        ),
                        th: ({ children }) => (
                          <th className="border border-gray-300 bg-gray-100 px-2 lg:px-3 py-2 text-center font-semibold text-gray-900 whitespace-normal">
                            {children}
                          </th>
                        ),
                        td: ({ children }) => (
                          <td className="border border-gray-300 px-2 lg:px-3 py-2 text-gray-700 whitespace-normal align-top">
                            {children}
                          </td>
                        ),
                      }}
                    >
                      {processMarkdownContent(reference.resource_content || "")}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Source reference */}
          <div className="p-3 lg:p-4 rounded-lg border border-design-border mt-auto">
            <p className="text-xs lg:text-sm">
              <span className="text-gray-500">Nguồn dẫn: </span>
              <span className="font-medium wrap-break-word">{sourceLabel}</span>
            </p>

            {(reference.start_char !== undefined ||
              reference.end_char !== undefined) && (
              <p className="text-xs text-gray-400 mt-1">
                Vị trí: {reference.start_char} - {reference.end_char}
              </p>
            )}

            <button className="bg-btn-bg py-2 px-4 w-full items-center rounded-md text-btn-text font-medium underline mt-4 hover:bg-[#E1EFFF] cursor-pointer hidden text-sm">
              Xem tài liệu đầy đủ
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
