import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Icons from "@/components/icons/icons";
import { Reference } from "@/types/chat-types";
import { formatCitationLabel } from "@/utils/citation-parser";

interface ReferencePanelProps {
  reference: Reference;
  onClose: () => void;
}

export function ReferencePanel({ reference, onClose }: ReferencePanelProps) {
  const [imageLoading, setImageLoading] = useState(true);
  
  // Process raw markdown content to add proper line breaks for tables
  const processMarkdownContent = (content: string) => {
    if (!content) return "";
    
    // Handle table format specifically
    if (content.includes('|') && content.includes(':--:')) {
      // For the specific format: "| Header | Header | | :--: | :--: | | Data | 0 | | Data | 1 |"
      // Convert to proper markdown table format
      
      // First, normalize the content by removing extra spaces
      let normalized = content.replace(/\s+/g, ' ').trim();
      
      // Split by the header separator pattern
      const separatorMatch = normalized.match(/\|\s*:--:\s*\|\s*:\--:\s*\|/);
      if (separatorMatch) {
        const [before, after] = normalized.split(separatorMatch[0]);
        
        // Process header
        const headerRow = before.trim();
        const separatorRow = '| :--: | :--: |';
        
        // Process data rows
        const dataContent = after.trim();
        // Split by pattern where we have | text | number |
        const dataRows = [];
        const matches = dataContent.matchAll(/\|\s*([^|]+)\s*\|\s*(\d+)\s*\|/g);
        
        for (const match of matches) {
          const [, text, number] = match;
          dataRows.push(`| ${text.trim()} | ${number} |`);
        }
        
        // Combine all parts
        const result = [headerRow, separatorRow, ...dataRows].join('\n');
        return result;
      }
      
      // Fallback: simple line break insertion
      return content
        .replace(/\|\s*:\-\-:\s*\|/g, '|\n| :--: |\n|')
        .replace(/\|\s*(\d+)\s*\|/g, ' $1 |\n|')
        .replace(/\|\s*$/gm, '|')
        .replace(/\n\|$/g, '')
        .trim();
    }
    
    return content;
  };
  
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
              <div className="relative rounded-lg border border-gray-200 min-h-28">
                {imageLoading && (
                  <div className="absolute inset-0 bg-gray-200 rounded-lg animate-pulse flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                  </div>
                )}
                <img
                  src={`https://medical-chatbot.fdn.li/static/figure/img-1.jpeg`}
                  alt="Reference figure"
                  className={`w-full transition-opacity duration-200 ${
                    imageLoading ? 'opacity-0' : 'opacity-100'
                  }`}
                  onLoad={() => setImageLoading(false)}
                  onError={() => setImageLoading(false)}
                />
              </div>
            ) : (
              <div className="overflow-x-auto bg-white">
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: ({ children }) => (
                        <table className="min-w-full border-collapse border border-gray-300">
                          {children}
                        </table>
                      ),
                      thead: ({ children }) => (
                        <thead className="bg-gray-50">
                          {children}
                        </thead>
                      ),
                      tbody: ({ children }) => (
                        <tbody className="bg-white">
                          {children}
                        </tbody>
                      ),
                      th: ({ children }) => (
                        <th className="border border-gray-300 bg-gray-50 px-4 py-2 text-center font-medium text-gray-900">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className="border border-gray-300 px-4 py-2 text-gray-700">
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

          <button className="bg-[#F2F8FF] py-2 px-4 w-full items-center rounded-md text-[#027BFF] font-medium underline mt-4 hover:bg-[#E1EFFF] cursor-pointer hidden">
            Xem tài liệu đầy đủ
          </button>
        </div>
      </div>
    </div>
  );
}
