import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useEffect } from "react";

import { pdfWorkerSrc, PdfPreview } from "./pdf-preview";

const resizeObserverMock = vi.hoisted(() => ({
  width: 320,
}));

const reactPdfMock = vi.hoisted(() => ({
  documentShouldFail: false,
  totalPages: 3,
  lastFile: undefined as string | undefined,
  lastPage: undefined as number | undefined,
  lastWidth: undefined as number | undefined,
  renderedPages: [] as number[],
  scrollCalls: [] as number[],
}));

vi.mock("react-pdf", () => ({
  pdfjs: {
    GlobalWorkerOptions: {
      workerSrc: "",
    },
  },
  Document: ({ file, onLoadError, onLoadSuccess, children }: {
    file?: string;
    onLoadError?: () => void;
    onLoadSuccess?: ({ numPages }: { numPages: number }) => void;
    children?: React.ReactNode;
  }) => {
    reactPdfMock.lastFile = file;

    useEffect(() => {
      if (reactPdfMock.documentShouldFail) {
        onLoadError?.();
        return;
      }

      onLoadSuccess?.({ numPages: reactPdfMock.totalPages });
    }, [onLoadError, onLoadSuccess]);

    if (reactPdfMock.documentShouldFail) {
      return <div data-testid="pdf-preview-error-trigger" />;
    }

    return <div data-testid="pdf-preview-document">{children}</div>;
  },
  Page: ({ pageNumber, width }: { pageNumber?: number; width?: number }) => {
    reactPdfMock.lastPage = pageNumber;
    reactPdfMock.lastWidth = width;
    if (pageNumber !== undefined) {
      reactPdfMock.renderedPages.push(pageNumber);
    }

    return (
      <div data-testid={`pdf-preview-page-wrapper-${pageNumber}`}>
        <div
          data-testid="pdf-preview-page"
          data-page-number={pageNumber}
          data-page-width={width}
        />
      </div>
    );
  },
}));

describe("PdfPreview", () => {
  const scrollIntoViewMock = vi.fn();

  afterEach(() => {
    vi.unstubAllEnvs();
    reactPdfMock.documentShouldFail = false;
    reactPdfMock.totalPages = 3;
    reactPdfMock.lastFile = undefined;
    reactPdfMock.lastPage = undefined;
    reactPdfMock.lastWidth = undefined;
    reactPdfMock.renderedPages = [];
    reactPdfMock.scrollCalls = [];
    scrollIntoViewMock.mockReset();
  });

  class MockResizeObserver {
    private readonly callback: ResizeObserverCallback;

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }

    observe(target: Element) {
      this.callback(
        [
          {
            target,
            contentRect: {
              width: resizeObserverMock.width,
            } as DOMRectReadOnly,
          } as ResizeObserverEntry,
        ],
        this as unknown as ResizeObserver,
      );
    }

    unobserve() {}

    disconnect() {}
  }

  vi.stubGlobal("ResizeObserver", MockResizeObserver);

  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: function scrollIntoView() {
      const pageNumber = this.getAttribute?.("data-page-wrapper-number");

      if (pageNumber) {
        reactPdfMock.scrollCalls.push(Number(pageNumber));
      }

      scrollIntoViewMock();
    },
  });

  it("renders a react-pdf preview when pdf config is available", async () => {
    vi.stubEnv("VITE_DOCUMENT_FILE_URL_TEMPLATE", "https://ai-documents-management.devt.vn/api/v1/documents/{documentId}/file");

    render(
      <PdfPreview
        title="Guideline"
        documentId={55}
        pdfPage={12}
      />
    );

    expect(screen.getByTestId("pdf-preview-document")).toBeInTheDocument();
    expect(await screen.findAllByTestId("pdf-preview-page")).toHaveLength(3);
    expect(screen.getAllByTestId("pdf-preview-page")[1]).toHaveAttribute("data-page-number", "2");
    expect(reactPdfMock.lastFile).toBe(
      "https://ai-documents-management.devt.vn/api/v1/documents/55/file"
    );
  });

  it("uses a local worker asset url instead of the npm scheme", () => {
    expect(pdfWorkerSrc).toBe("/pdf.worker.min.js");
  });

  it("lets the page fit the preview width while keeping the viewport scrollable", async () => {
    vi.stubEnv("VITE_DOCUMENT_FILE_URL_TEMPLATE", "https://docs.example.com/api/v1/documents/{documentId}/file");

    render(
      <PdfPreview
        title="Guideline"
        documentId={55}
        pdfPage={12}
      />
    );

    await screen.findAllByTestId("pdf-preview-page");

    expect(reactPdfMock.lastWidth).toBe(296);
    expect(screen.getByTestId("pdf-preview-viewport")).toHaveClass("overflow-y-auto", "h-[22rem]", "lg:h-[34rem]");
  });

  it("renders all PDF pages so the viewer can scroll vertically through the full document", async () => {
    vi.stubEnv("VITE_DOCUMENT_FILE_URL_TEMPLATE", "https://docs.example.com/api/v1/documents/{documentId}/file");
    reactPdfMock.totalPages = 4;

    render(
      <PdfPreview
        title="Guideline"
        documentId={55}
        pdfPage={2}
      />
    );

    expect(await screen.findAllByTestId("pdf-preview-page")).toHaveLength(4);
    expect(reactPdfMock.renderedPages).toEqual([1, 2, 3, 4]);
    expect(screen.getByTestId("pdf-preview-pages")).toHaveClass("flex", "flex-col");
  });

  it("scrolls to the referenced PDF page after rendering the document", async () => {
    vi.stubEnv("VITE_DOCUMENT_FILE_URL_TEMPLATE", "https://docs.example.com/api/v1/documents/{documentId}/file");
    reactPdfMock.totalPages = 5;

    render(
      <PdfPreview
        title="Guideline"
        documentId={55}
        pdfPage={4}
      />
    );

    await screen.findAllByTestId("pdf-preview-page");

    await waitFor(() => {
      expect(reactPdfMock.scrollCalls).toContain(4);
    });
  });

  it("substitutes documentId into the configured file url template", () => {
    vi.stubEnv("VITE_DOCUMENT_FILE_URL_TEMPLATE", "https://docs.example.com/api/v1/documents/{documentId}/file");

    render(
      <PdfPreview
        title="Guideline"
        documentId={99}
        pdfPage={12}
      />
    );

    expect(reactPdfMock.lastFile).toBe(
      "https://docs.example.com/api/v1/documents/99/file"
    );
  });

  it("renders the first page when both pdfPage and fallbackPage are missing", async () => {
    vi.stubEnv("VITE_DOCUMENT_FILE_URL_TEMPLATE", "https://docs.example.com/api/v1/documents/{documentId}/file");

    render(
      <PdfPreview
        title="Guideline"
        documentId={77}
      />
    );

    expect(reactPdfMock.lastFile).toBe(
      "https://docs.example.com/api/v1/documents/77/file"
    );
    expect(await screen.findAllByTestId("pdf-preview-page")).toHaveLength(3);
    expect(screen.getAllByTestId("pdf-preview-page")[0]).toHaveAttribute("data-page-number", "1");
  });

  it("shows empty state when documentId is missing", () => {
    render(<PdfPreview title="Guideline" />);

    expect(screen.getByText(/pdf chưa sẵn sàng/i)).toBeInTheDocument();
  });

  it("shows a load failure state when the preview fails", async () => {
    vi.stubEnv("VITE_DOCUMENT_FILE_URL_TEMPLATE", "https://docs.example.com/api/v1/documents/{documentId}/file");
    reactPdfMock.documentShouldFail = true;

    render(
      <PdfPreview
        title="Guideline"
        documentId={55}
        pdfPage={12}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/không thể tải pdf/i)).toBeInTheDocument();
    });
  });

  it("shows a configuration state when VITE_DOCUMENT_FILE_URL_TEMPLATE is missing", () => {
    vi.stubEnv("VITE_DOCUMENT_FILE_URL_TEMPLATE", "");

    render(
      <PdfPreview
        title="Guideline"
        documentId={55}
        pdfPage={12}
      />
    );

    expect(screen.getByText(/thiếu cấu hình vite_document_file_url_template/i)).toBeInTheDocument();
  });
});
