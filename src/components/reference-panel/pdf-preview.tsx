import { useMemo, useState } from "react";

interface PdfPreviewProps {
  title: string;
  documentId?: number;
  pdfPage?: number;
  fallbackPage?: number;
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

export function buildPdfUrl(urlTemplate: string | undefined, documentId?: number, page?: number): string | undefined {
  const fileUrl = buildDocumentFileUrl(urlTemplate, documentId);

  if (!fileUrl) {
    return undefined;
  }

  return appendPageAnchor(fileUrl, page);
}

export function PdfPreview({ title, documentId, pdfPage, fallbackPage }: PdfPreviewProps) {
  const [hasPreviewError, setHasPreviewError] = useState(false);
  const documentFileUrlTemplate = import.meta.env.VITE_DOCUMENT_FILE_URL_TEMPLATE as string | undefined;
  const resolvedPage = getResolvedPage(pdfPage, fallbackPage);

  const finalUrl = useMemo(
    () => buildPdfUrl(documentFileUrlTemplate, documentId, resolvedPage),
    [documentFileUrlTemplate, documentId, resolvedPage],
  );

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
    <div className="rounded-[1.35rem] border border-design-border bg-white overflow-hidden">
      {hasPreviewError ? (
          <div className="flex min-h-[22rem] items-center justify-center rounded-2xl border border-dashed border-design-border bg-slate-50 px-4 text-center text-sm text-slate-500 lg:min-h-[34rem]">
            Không thể tải PDF trong khung xem trước. Hãy thử mở ở tab mới.
          </div>
        ) : (
          <embed
            title={title}
            src={finalUrl}
            type="application/pdf"
            onError={() => setHasPreviewError(true)}
            onErrorCapture={() => setHasPreviewError(true)}
            data-testid="pdf-preview-embed"
            className="min-h-100 w-full rounded-2xl border border-design-border bg-white lg:h-136"
          />
        )}
    </div>
  );
}
