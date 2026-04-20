import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React, { useEffect } from "react";

import { getCachedPdfFile, loadPdfSource, pdfWorkerSrc, PdfPreview } from "./pdf-preview";

const resizeObserverMock = vi.hoisted(() => ({
  width: 320,
}));

const reactPdfMock = vi.hoisted(() => ({
  documentShouldFail: false,
  totalPages: 3,
  lastFile: undefined as string | { url: string } | undefined,
  lastPage: undefined as number | undefined,
  lastWidth: undefined as number | undefined,
  renderedPages: [] as number[],
  scrollCalls: [] as number[],
  documentLoads: [] as Array<string | undefined>,
  delayedPageRender: false,
  delayRenderSuccess: false,
  renderSuccessOnlyOnMount: false,
}));

const cacheStorageMock = vi.hoisted(() => {
  const entries = new Map<string, Response>();

  return {
    entries,
    open: vi.fn(async () => ({
      match: vi.fn(async (request: string) => entries.get(request)),
      put: vi.fn(async (request: string, response: Response) => {
        entries.set(request, response);
      }),
    })),
    reset() {
      entries.clear();
      this.open.mockClear();
    },
  };
});

vi.mock("react-pdf", () => ({
  pdfjs: {
    GlobalWorkerOptions: {
      workerSrc: "",
    },
  },
  Document: ({ file, onLoadError, onLoadSuccess, children }: {
    file?: string | { url: string };
    onLoadError?: () => void;
    onLoadSuccess?: ({ numPages }: { numPages: number }) => void;
    children?: React.ReactNode;
  }) => {
    reactPdfMock.lastFile = file;

    useEffect(() => {
      const nextUrl = typeof file === "string" ? file : file?.url;
      reactPdfMock.documentLoads.push(nextUrl);

      if (reactPdfMock.documentShouldFail) {
        onLoadError?.();
        return;
      }

      onLoadSuccess?.({ numPages: reactPdfMock.totalPages });
    }, [file, onLoadError, onLoadSuccess]);

    if (reactPdfMock.documentShouldFail) {
      return <div data-testid="pdf-preview-error-trigger" />;
    }

    return <div data-testid="pdf-preview-document">{children}</div>;
  },
  Page: ({ pageNumber, width, onRenderSuccess }: { pageNumber?: number; width?: number; onRenderSuccess?: () => void }) => {
    reactPdfMock.lastPage = pageNumber;
    reactPdfMock.lastWidth = width;
    const [isVisible, setIsVisible] = React.useState(!reactPdfMock.delayedPageRender);

    useEffect(() => {
      if (!reactPdfMock.delayedPageRender) {
        return;
      }

      const timeoutId = window.setTimeout(() => {
        setIsVisible(true);
      }, 0);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }, []);

    useEffect(() => {
      if (isVisible && pageNumber !== undefined) {
        reactPdfMock.renderedPages.push(pageNumber);
      }
    }, [isVisible, pageNumber]);

    useEffect(() => {
      if (!isVisible) {
        return;
      }

      if (reactPdfMock.renderSuccessOnlyOnMount) {
        onRenderSuccess?.();
        return;
      }

      if (reactPdfMock.delayRenderSuccess) {
        const timeoutId = window.setTimeout(() => {
          onRenderSuccess?.();
        }, 0);

        return () => {
          window.clearTimeout(timeoutId);
        };
      }

      onRenderSuccess?.();
    }, reactPdfMock.renderSuccessOnlyOnMount ? [isVisible] : [isVisible, onRenderSuccess]);

    if (!isVisible) {
      return null;
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
  const fetchMock = vi.fn();
  const createObjectURLMock = vi.fn((blob: Blob) => `blob:${blob.size}`);
  const revokeObjectURLMock = vi.fn();

  afterEach(() => {
    vi.unstubAllEnvs();
    reactPdfMock.documentShouldFail = false;
    reactPdfMock.totalPages = 3;
    reactPdfMock.lastFile = undefined;
    reactPdfMock.lastPage = undefined;
    reactPdfMock.lastWidth = undefined;
    reactPdfMock.renderedPages = [];
    reactPdfMock.scrollCalls = [];
    reactPdfMock.documentLoads = [];
    reactPdfMock.delayedPageRender = false;
    reactPdfMock.delayRenderSuccess = false;
    reactPdfMock.renderSuccessOnlyOnMount = false;
    cacheStorageMock.reset();
    fetchMock.mockReset();
    createObjectURLMock.mockClear();
    revokeObjectURLMock.mockClear();
    scrollIntoViewMock.mockReset();
  });

  beforeEach(() => {
    fetchMock.mockResolvedValue(
      new Response(new Blob(["default pdf bytes"], { type: "application/pdf" }))
    );
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
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("caches", { open: cacheStorageMock.open });
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: createObjectURLMock,
    revokeObjectURL: revokeObjectURLMock,
  });

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

    expect(await screen.findByTestId("pdf-preview-document")).toBeInTheDocument();
    expect(await screen.findAllByTestId("pdf-preview-page")).toHaveLength(3);
    expect(screen.getAllByTestId("pdf-preview-page")[1]).toHaveAttribute("data-page-number", "2");
    expect(reactPdfMock.lastFile).toEqual({ url: "blob:17" });
  });

  it("loads a cached pdf source without fetching again", async () => {
    const cachedBlob = new Blob(["cached pdf"], { type: "application/pdf" });
    cacheStorageMock.entries.set(
      "https://docs.example.com/api/v1/documents/55/file",
      new Response(cachedBlob)
    );

    const source = await loadPdfSource("https://docs.example.com/api/v1/documents/55/file");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(cacheStorageMock.open).toHaveBeenCalledWith("pdf-preview-v1");
    expect(source.objectUrl).toBe("blob:13");
    expect(source.documentFile).toEqual({ url: source.objectUrl });
  });

  it("fetches and stores the pdf in CacheStorage on cache miss", async () => {
    fetchMock.mockResolvedValue(
      new Response(new Blob(["network pdf"], { type: "application/pdf" }))
    );

    const source = await loadPdfSource("https://docs.example.com/api/v1/documents/77/file");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://docs.example.com/api/v1/documents/77/file"
    );
    expect(cacheStorageMock.entries.has("https://docs.example.com/api/v1/documents/77/file")).toBe(true);
    expect(source.objectUrl).toBe("blob:13");
    expect(source.documentFile).toEqual({ url: source.objectUrl });
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

    await waitFor(() => {
      expect(reactPdfMock.lastWidth).toBe(296);
    });
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

  it("scrolls again when the scroll request key changes for the same page", async () => {
    vi.stubEnv("VITE_DOCUMENT_FILE_URL_TEMPLATE", "https://docs.example.com/api/v1/documents/{documentId}/file");
    reactPdfMock.totalPages = 5;

    const { rerender } = render(
      <PdfPreview
        title="Guideline"
        documentId={55}
        pdfPage={4}
        scrollRequestKey={1}
      />
    );

    await screen.findAllByTestId("pdf-preview-page");

    await waitFor(() => {
      expect(reactPdfMock.scrollCalls).toEqual([4]);
    });

    rerender(
      <PdfPreview
        title="Guideline"
        documentId={55}
        pdfPage={4}
        scrollRequestKey={2}
      />
    );

    await waitFor(() => {
      expect(reactPdfMock.scrollCalls).toEqual([4, 4]);
    });
  });

  it("scrolls to the target page after delayed page rendering on the first open", async () => {
    vi.stubEnv("VITE_DOCUMENT_FILE_URL_TEMPLATE", "https://docs.example.com/api/v1/documents/{documentId}/file");
    reactPdfMock.totalPages = 5;
    reactPdfMock.delayedPageRender = true;

    render(
      <PdfPreview
        title="Guideline"
        documentId={55}
        pdfPage={4}
        scrollRequestKey={1}
      />
    );

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });

    await screen.findAllByTestId("pdf-preview-page");

    await waitFor(() => {
      expect(reactPdfMock.scrollCalls).toContain(4);
    });
  });

  it("waits for the target page render success before scrolling on first open", async () => {
    vi.stubEnv("VITE_DOCUMENT_FILE_URL_TEMPLATE", "https://docs.example.com/api/v1/documents/{documentId}/file");
    reactPdfMock.totalPages = 5;
    reactPdfMock.delayRenderSuccess = true;

    render(
      <PdfPreview
        title="Guideline"
        documentId={55}
        pdfPage={4}
        scrollRequestKey={1}
      />
    );

    await screen.findAllByTestId("pdf-preview-page");

    expect(reactPdfMock.scrollCalls).toEqual([]);

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });

    await waitFor(() => {
      expect(reactPdfMock.scrollCalls).toContain(4);
    });
  });

  it("does not reload the document when only page and scroll request change within the same pdf", async () => {
    vi.stubEnv("VITE_DOCUMENT_FILE_URL_TEMPLATE", "https://docs.example.com/api/v1/documents/{documentId}/file");
    reactPdfMock.totalPages = 5;

    const { rerender } = render(
      <PdfPreview
        title="Guideline"
        documentId={55}
        pdfPage={2}
        scrollRequestKey={1}
      />
    );

    await screen.findAllByTestId("pdf-preview-page");

    rerender(
      <PdfPreview
        title="Guideline"
        documentId={55}
        pdfPage={4}
        scrollRequestKey={2}
      />
    );

    await waitFor(() => {
      expect(reactPdfMock.documentLoads).toEqual([
        "blob:13",
      ]);
    });
  });

  it("does not reload the document when switching to a different citation in the same pdf", async () => {
    vi.stubEnv("VITE_DOCUMENT_FILE_URL_TEMPLATE", "https://docs.example.com/api/v1/documents/{documentId}/file");
    reactPdfMock.totalPages = 5;

    const { rerender } = render(
      <PdfPreview
        title="Guideline"
        documentId={55}
        pdfPage={2}
        scrollRequestKey={1}
      />
    );

    await screen.findAllByTestId("pdf-preview-page");

    rerender(
      <PdfPreview
        title="Guideline"
        documentId={55}
        pdfPage={4}
        scrollRequestKey={2}
      />
    );

    await waitFor(() => {
      expect(reactPdfMock.documentLoads).toEqual([
        "blob:13",
      ]);
    });
  });

  it("reuses the resolved pdf source when only page and scroll request change in the same document", async () => {
    vi.stubEnv("VITE_DOCUMENT_FILE_URL_TEMPLATE", "https://docs.example.com/api/v1/documents/{documentId}/file");
    fetchMock.mockResolvedValue(
      new Response(new Blob(["same document pdf"], { type: "application/pdf" }))
    );

    const { rerender } = render(
      <PdfPreview title="Guideline" documentId={55} pdfPage={2} scrollRequestKey={1} />
    );

    await screen.findAllByTestId("pdf-preview-page");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(createObjectURLMock).toHaveBeenCalledTimes(1);

    rerender(
      <PdfPreview title="Guideline" documentId={55} pdfPage={4} scrollRequestKey={2} />
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(createObjectURLMock).toHaveBeenCalledTimes(1);
      expect(reactPdfMock.documentLoads).toEqual(["blob:13"]);
    });
  });

  it("revokes the previous blob url when switching to a different document", async () => {
    vi.stubEnv("VITE_DOCUMENT_FILE_URL_TEMPLATE", "https://docs.example.com/api/v1/documents/{documentId}/file");
    fetchMock
      .mockResolvedValueOnce(new Response(new Blob(["doc55 pdf"], { type: "application/pdf" })))
      .mockResolvedValueOnce(new Response(new Blob(["doc77 pdf"], { type: "application/pdf" })));

    const { rerender } = render(
      <PdfPreview title="Guideline" documentId={55} pdfPage={2} scrollRequestKey={1} />
    );

    await screen.findAllByTestId("pdf-preview-page");

    rerender(
      <PdfPreview title="Guideline" documentId={77} pdfPage={4} scrollRequestKey={2} />
    );

    await waitFor(() => {
      expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:13");
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  it("scrolls to a new page in the same document even when pages were already rendered", async () => {
    vi.stubEnv("VITE_DOCUMENT_FILE_URL_TEMPLATE", "https://docs.example.com/api/v1/documents/{documentId}/file");
    reactPdfMock.totalPages = 5;
    reactPdfMock.renderSuccessOnlyOnMount = true;

    const { rerender } = render(
      <PdfPreview
        title="Guideline"
        documentId={55}
        pdfPage={2}
        scrollRequestKey={1}
      />
    );

    await screen.findAllByTestId("pdf-preview-page");

    await waitFor(() => {
      expect(reactPdfMock.scrollCalls).toEqual([2]);
    });

    rerender(
      <PdfPreview
        title="Guideline"
        documentId={55}
        pdfPage={4}
        scrollRequestKey={2}
      />
    );

    await waitFor(() => {
      expect(reactPdfMock.scrollCalls).toEqual([2, 4]);
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

    expect(screen.getByText("Đang tải PDF...")).toBeInTheDocument();
  });

  it("reuses the same cached file descriptor for the same url", () => {
    const first = getCachedPdfFile("https://docs.example.com/api/v1/documents/55/file");
    const second = getCachedPdfFile("https://docs.example.com/api/v1/documents/55/file");
    const third = getCachedPdfFile("https://docs.example.com/api/v1/documents/99/file");

    expect(first).toBe(second);
    expect(first).toEqual({ url: "https://docs.example.com/api/v1/documents/55/file" });
    expect(third).toEqual({ url: "https://docs.example.com/api/v1/documents/99/file" });
    expect(third).not.toBe(first);
  });

  it("renders the first page when both pdfPage and fallbackPage are missing", async () => {
    vi.stubEnv("VITE_DOCUMENT_FILE_URL_TEMPLATE", "https://docs.example.com/api/v1/documents/{documentId}/file");

    render(
      <PdfPreview
        title="Guideline"
        documentId={77}
      />
    );

    expect(await screen.findByTestId("pdf-preview-document")).toBeInTheDocument();
    expect(reactPdfMock.lastFile).toEqual({ url: "blob:17" });
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
