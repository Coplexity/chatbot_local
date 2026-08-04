import React, { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import Icons from "@/components/icons/icons";
import { useGuestChat } from "@/hooks/useGuestChat";
import type { ReferenceMetadata } from "@/types/api-types";
import { Reference } from "@/types/chat-types";
import { formatCitationLabel } from "@/utils/citation-parser";
import { buildPdfOpenUrl, PdfPreview } from "./pdf-preview";

interface ReferencePanelProps {
  reference: Reference;
  scrollRequestKey: number;
  onClose: () => void;
}

export function ReferencePanel({ reference, scrollRequestKey, onClose }: ReferencePanelProps) {
  const { getReferenceMetadata } = useGuestChat();
  const [fetchedMetadata, setFetchedMetadata] = useState<ReferenceMetadata | null>(null);
  const previousResolvedMetadataRef = React.useRef<ReferenceMetadata | null>(null);

  const sourceMetadata = useMemo(
    () => fetchedMetadata ?? reference.reference,
    [fetchedMetadata, reference.reference]
  );

  useEffect(() => {
    let isActive = true;

    const previousMetadata = previousResolvedMetadataRef.current;
    const nextReferenceMetadata = reference.reference;
    const shouldKeepPreviousPdfMetadata =
      previousMetadata?.documentId !== undefined
      && nextReferenceMetadata?.documentId === undefined;

    if (shouldKeepPreviousPdfMetadata) {
      setFetchedMetadata(previousMetadata);
    } else {
      setFetchedMetadata(null);
    }

    void getReferenceMetadata([reference.chunkId])
      .then((references) => {
        if (!isActive) {
          return;
        }

        setFetchedMetadata(references[0] ?? null);
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }

        console.error("Failed to load reference metadata:", error);
      });

    return () => {
      isActive = false;
    };
  }, [reference.chunkId]);

  useEffect(() => {
    if (sourceMetadata?.documentId !== undefined) {
      previousResolvedMetadataRef.current = sourceMetadata;
    }
  }, [sourceMetadata]);

  const sourceLabel = formatCitationLabel(reference);
  const excerptContent = reference.excerpt || "Không có nội dung trích dẫn";
  const headings = sourceMetadata?.headings || [];
  const openPdfUrl = buildPdfOpenUrl(
    import.meta.env.VITE_DOCUMENT_FILE_URL_TEMPLATE as string | undefined,
    sourceMetadata?.documentId,
    sourceMetadata?.pdfPage ?? sourceMetadata?.startPage,
  );

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
        w-full sm:w-104 lg:w-120
        transform transition-transform duration-300 ease-in-out
        z-50 lg:z-auto
        border-l border-design-border bg-[#fbfcff] h-full min-h-0 flex flex-col
      `}
      >
        {/* Header */}
        <div className="p-4 lg:p-6 border-b border-design-border flex items-center justify-between bg-white/80 backdrop-blur-sm">
          <div className="font-bold text-sm lg:text-base">
            <span className="text-cite">Tham chiếu [{reference.number}]</span>
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
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 lg:p-6 flex flex-col gap-4">
          {/* Document name */}
          <h4 className="text-xs lg:text-sm font-medium text-gray-500">
            Nguồn gốc
          </h4>
          <div className="bg-white rounded-[1.35rem] p-4 border border-design-border">

            <span className="text-xs lg:text-sm font-medium text-gray-500 mb-2 hidden">
              Văn bản
            </span>

            {sourceMetadata?.guidelineTitle && (<>
              <p className="text-lg uppercase lg:text-base wrap-break-word font-semibold">
                {sourceMetadata.guidelineTitle}
              </p></>
            )}
            <div className="flex flex-wrap items-center mt-2 gap-x-3 gap-y-1 text-xs lg:text-sm text-slate-500">
              {/* {sourceMetadata?.guidelineId !== undefined && <span>Guideline #{sourceMetadata.guidelineId}</span>}
              {sourceMetadata?.versionId !== undefined && <span>Version #{sourceMetadata.versionId}</span>} */}
              {sourceMetadata?.startPage !== undefined && <span>Trang {sourceMetadata.startPage}</span>}
            </div>

            {headings.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="space-y-2">
                  {headings.map((heading, index) => {
                    const _isDeepest = index === headings.length - 1;

                    return (
                      <div
                        key={`${heading.sectionId}-${index}`}
                        className={`rounded-2xl border p-3 border-design-border bg-slate-50/70`}
                      >
                        <p className={`text-sm lg:text-base font-medium text-slate-700`}>
                          {heading.heading}
                        </p>

                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Excerpt content */}
          <div className="">
            <h4 className="text-xs lg:text-sm font-medium text-gray-500 mb-2">
              Nội dung trích dẫn
            </h4>
            <div className="bg-white rounded-[1.35rem] p-4 leading-relaxed text-sm lg:text-base text-gray-800 border border-design-border">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {excerptContent.replace(/\\\\/g, "\\")}
              </ReactMarkdown>
            </div>
          </div>

          <div className="">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h4 className="text-xs lg:text-sm font-medium text-gray-500">
              Xem trong tài liệu
            </h4>

            {openPdfUrl ? (
              <a
                href={openPdfUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs lg:text-sm font-medium text-cite hover:underline"
              >
                Open
              </a>
            ) : null}
          </div>

          <PdfPreview
            title={sourceMetadata?.guidelineTitle || sourceLabel}
            documentId={sourceMetadata?.documentId}
            pdfPage={sourceMetadata?.pdfPage}
            fallbackPage={sourceMetadata?.startPage}
            scrollRequestKey={scrollRequestKey}
          />
        </div>
        </div>

      </div>
    </>
  );
}
