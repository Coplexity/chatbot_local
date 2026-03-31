import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

interface PdfPreviewProps {
  title: string;
  documentId?: number;
  pdfPage?: number;
  fallbackPage?: number;
  scrollRequestKey?: number;
}

export const pdfWorkerSrc = "/pdf.worker.min.js";

const PDF_VIEWER_HORIZONTAL_PADDING = 24;
const PDF_CACHE_NAME = "pdf-preview-v1";
const pdfFileCache = new Map<string, { url: string }>();

interface PdfSource {
  objectUrl: string;
  documentFile: { url: string };
}

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

export function getCachedPdfFile(url: string): { url: string } {
  const cached = pdfFileCache.get(url);

  if (cached) {
    return cached;
  }

  const nextFile = { url };
  pdfFileCache.set(url, nextFile);
  return nextFile;
}

export async function loadPdfSource(url: string): Promise<PdfSource> {
  let response: Response | undefined;

  try {
    const cache = await caches.open(PDF_CACHE_NAME);
    response = await cache.match(url);

    if (!response) {
      response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to load PDF: ${response.status}`);
      }

      await cache.put(url, response.clone());
    }
  } catch {
    response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to load PDF: ${response.status}`);
    }
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  return {
    objectUrl,
    documentFile: { url: objectUrl },
  };
}

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

export function PdfPreview({ title, documentId, pdfPage, fallbackPage, scrollRequestKey = 0 }: PdfPreviewProps) {
  const [hasPreviewError, setHasPreviewError] = useState(false);
  const [documentSource, setDocumentSource] = useState<PdfSource>();
  const [pageCount, setPageCount] = useState<number>();
  const [pageWidth, setPageWidth] = useState<number>(400);
  const [renderedTargetPageKey, setRenderedTargetPageKey] = useState<string>();
  const currentObjectUrlRef = useRef<string | undefined>(undefined);
  const loadedDocumentUrlRef = useRef<string | undefined>(undefined);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const renderedPagesRef = useRef<Set<number>>(new Set());
  const documentFileUrlTemplate = import.meta.env.VITE_DOCUMENT_FILE_URL_TEMPLATE as string | undefined;
  const resolvedPage = getResolvedPage(pdfPage, fallbackPage);
  const targetPageKey = resolvedPage ? `${resolvedPage}:${scrollRequestKey}` : undefined;

  const documentFileUrl = useMemo(
    () => buildDocumentFileUrl(documentFileUrlTemplate, documentId),
    [documentFileUrlTemplate, documentId],
  );
  const documentFile = useMemo(
    () => documentSource?.documentFile,
    [documentSource],
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

      const measuredWidth = entry.contentRect.width;
      setPageWidth(Math.max(Math.floor(measuredWidth) - PDF_VIEWER_HORIZONTAL_PADDING, 0));
    });

    resizeObserver.observe(viewport);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const handleLoadError = useCallback(() => {
    setPageCount(undefined);
    setHasPreviewError(true);
  }, []);

  const handleLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setHasPreviewError(false);
    setPageCount(numPages);
  }, []);

  useEffect(() => {
    setRenderedTargetPageKey(undefined);
  }, [targetPageKey, documentFileUrl]);

  useEffect(() => {
    renderedPagesRef.current = new Set();
  }, [documentFileUrl]);

  useEffect(() => {
    let isActive = true;

    if (!documentFileUrl) {
      setDocumentSource(undefined);
      loadedDocumentUrlRef.current = undefined;
      return;
    }

    if (loadedDocumentUrlRef.current === documentFileUrl && documentSource) {
      return;
    }

    if (loadedDocumentUrlRef.current !== documentFileUrl) {
      setDocumentSource(undefined);
      setPageCount(undefined);
      renderedPagesRef.current = new Set();
      setRenderedTargetPageKey(undefined);
    }

    void loadPdfSource(documentFileUrl)
      .then((source) => {
        if (!isActive) {
          URL.revokeObjectURL(source.objectUrl);
          return;
        }

        if (currentObjectUrlRef.current && currentObjectUrlRef.current !== source.objectUrl) {
          URL.revokeObjectURL(currentObjectUrlRef.current);
        }

        currentObjectUrlRef.current = source.objectUrl;
        loadedDocumentUrlRef.current = documentFileUrl;
        setDocumentSource(source);
        setHasPreviewError(false);
      })
      .catch(() => {
        if (!isActive) {
          return;
        }

        setDocumentSource(undefined);
        setHasPreviewError(true);
      });

    return () => {
      isActive = false;
    };
  }, [documentFileUrl, documentSource]);

  useEffect(() => {
    return () => {
      if (currentObjectUrlRef.current) {
        URL.revokeObjectURL(currentObjectUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!resolvedPage || !targetPageKey) {
      return;
    }

    if (!renderedPagesRef.current.has(resolvedPage)) {
      return;
    }

    setRenderedTargetPageKey(targetPageKey);
  }, [resolvedPage, targetPageKey]);

  useEffect(() => {
    if (!resolvedPage || !pageCount || resolvedPage > pageCount || !targetPageKey || renderedTargetPageKey !== targetPageKey) {
      return;
    }

    const targetPage = pageRefs.current[resolvedPage];

    if (!targetPage) {
      return;
    }

    targetPage.scrollIntoView({ block: "start" });
  }, [pageCount, renderedTargetPageKey, resolvedPage, scrollRequestKey, targetPageKey]);

  const handleTargetPageRenderSuccess = useCallback((pageNumber: number) => {
    renderedPagesRef.current.add(pageNumber);

    if (!resolvedPage || pageNumber !== resolvedPage) {
      return;
    }

    setRenderedTargetPageKey(`${pageNumber}:${scrollRequestKey}`);
  }, [resolvedPage, scrollRequestKey]);

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
        ) : !documentFile ? (
          <div className="flex min-h-[22rem] items-center justify-center rounded-2xl border border-design-border bg-slate-50 px-4 text-center text-sm text-slate-500 lg:min-h-[34rem]">
            Đang tải PDF...
          </div>
        ) : (
          <div
            data-testid="pdf-preview-viewport"
            ref={viewportRef}
            className="h-[22rem] overflow-y-auto overflow-x-hidden rounded-2xl border border-design-border bg-slate-50 lg:h-[34rem]"
          >
            <Document
              key={documentFileUrl}
              file={documentFile}
              className="w-full"
              loading={(
                <div className="flex min-h-[22rem] items-center justify-center px-4 text-sm text-slate-500 lg:min-h-[34rem]">
                  Đang tải PDF...
                </div>
              )}
              onLoadError={handleLoadError}
              onLoadSuccess={handleLoadSuccess}
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
                        onRenderSuccess={() => {
                          handleTargetPageRenderSuccess(pageNumber);
                        }}
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
