import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

interface PdfPreviewProps {
  title: string;
  documentId?: number;
  pdfPage?: number;
  fallbackPage?: number;
}

export const pdfWorkerSrc = "/pdf.worker.min.js";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

function appendPageAnchor(url: string, page?: number): string {
  return page ? `${url}#page=${page}` : url;
}

function getResolvedPage(pdfPage?: number, fallbackPage?: number): number | undefined {
  return pdfPage ?? fallbackPage;
}

function buildDocumentFileUrl(template: string | undefined, documentId?: number): string | undefined {
  if (!template || documentId === undefined) {
    return undefined;
  }

  return template.replaceAll("{documentId}", String(documentId));
}

export function buildPdfOpenUrl(urlTemplate: string | undefined, documentId?: number, page?: number): string | undefined {
  const fileUrl = buildDocumentFileUrl(urlTemplate, documentId);

  if (!fileUrl) {
    return undefined;
  }

  return appendPageAnchor(fileUrl, page);
}

export function PdfPreview({ title, documentId, pdfPage, fallbackPage }: PdfPreviewProps) {
  const [hasPreviewError, setHasPreviewError] = useState(false);
  const [pageCount, setPageCount] = useState<number>();
  const [pageWidth, setPageWidth] = useState<number>();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const documentFileUrlTemplate = import.meta.env.VITE_DOCUMENT_FILE_URL_TEMPLATE as string | undefined;
  const resolvedPage = getResolvedPage(pdfPage, fallbackPage);

  const documentFileUrl = useMemo(
    () => buildDocumentFileUrl(documentFileUrlTemplate, documentId),
    [documentFileUrlTemplate, documentId, resolvedPage],
  );

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      const measuredWidth = viewport.clientWidth || entry.contentRect.width;
      setPageWidth(Math.max(Math.floor(measuredWidth) - 24, 0));
    });

    resizeObserver.observe(viewport);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!resolvedPage || !pageCount || resolvedPage > pageCount) {
      return;
    }

    const targetPage = pageRefs.current[resolvedPage];

    if (!targetPage) {
      return;
    }

    targetPage.scrollIntoView({ block: "start" });
  }, [pageCount, resolvedPage]);

  if (!documentId) {
    return (
      <div className="rounded-[1.35rem] border border-dashed border-design-border bg-slate-50 px-4 py-5 text-sm text-slate-500">
        Tài liệu PDF chưa sẵn sàng cho tham chiếu này.
      </div>
    );
  }

  if (!documentFileUrlTemplate) {
    return (
      <div className="rounded-[1.35rem] border border-amber-200 bg-amber-50 px-4 py-5 text-sm text-amber-700">
        Thiếu cấu hình VITE_DOCUMENT_FILE_URL_TEMPLATE để mở tài liệu PDF.
      </div>
    );
  }

  return (
      <div className="rounded-[1.35rem] border border-design-border bg-white overflow-hidden p-2 lg:p-3">
      {hasPreviewError ? (
          <div className="flex min-h-[22rem] items-center justify-center rounded-2xl border border-dashed border-design-border bg-slate-50 px-4 text-center text-sm text-slate-500 lg:min-h-[34rem]">
            Không thể tải PDF trong khung xem trước. Hãy thử mở ở tab mới.
          </div>
        ) : (
          <div
            data-testid="pdf-preview-viewport"
            ref={viewportRef}
            className="h-[22rem] overflow-y-auto overflow-x-hidden rounded-2xl border border-design-border bg-slate-50 lg:h-[34rem]"
          >
            <Document
              key={documentFileUrl}
              file={documentFileUrl}
              className="w-full"
              loading={(
                <div className="flex min-h-[22rem] items-center justify-center px-4 text-sm text-slate-500 lg:min-h-[34rem]">
                  Đang tải PDF...
                </div>
              )}
              onLoadError={() => {
                setPageCount(undefined);
                setHasPreviewError(true);
              }}
              onLoadSuccess={({ numPages }) => {
                setHasPreviewError(false);
                setPageCount(numPages);
              }}
              error={null}
            >
              <div data-testid="pdf-preview-pages" className="flex w-full flex-col items-center gap-3 p-3">
                {Array.from({ length: pageCount ?? 0 }, (_, index) => {
                  const pageNumber = index + 1;

                  return (
                    <div
                      key={pageNumber}
                      data-page-wrapper-number={pageNumber}
                      ref={(node) => {
                        pageRefs.current[pageNumber] = node;
                      }}
                    >
                      <Page
                        pageNumber={pageNumber}
                        renderAnnotationLayer={false}
                        renderTextLayer={false}
                        width={pageWidth}
                        className="max-w-full shadow-sm"
                        data-testid="pdf-preview-page"
                      />
                    </div>
                  );
                })}
              </div>
            </Document>
          </div>
        )}
    </div>
  );
}
