import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect } from "react";

import type { Reference } from "@/types/chat-types";

import { ReferencePanel } from "./reference-panel";

const getReferenceMetadataMock = vi.fn();

vi.mock("react-pdf", () => ({
  pdfjs: {
    GlobalWorkerOptions: {
      workerSrc: "",
    },
  },
  Document: ({ children, onLoadSuccess }: {
    children?: React.ReactNode;
    onLoadSuccess?: ({ numPages }: { numPages: number }) => void;
  }) => {
    useEffect(() => {
      onLoadSuccess?.({ numPages: 3 });
    }, [onLoadSuccess]);

    return <div data-testid="pdf-preview-document">{children}</div>;
  },
  Page: ({ pageNumber }: { pageNumber?: number }) => (
    <div data-testid="pdf-preview-page" data-page-number={pageNumber} />
  ),
}));

class MockResizeObserver {
  constructor(private readonly callback: ResizeObserverCallback) {}

  observe(target: Element) {
    this.callback(
      [
        {
          target,
          contentRect: {
            width: 320,
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

vi.mock("@/hooks/useGuestChat", () => ({
  useGuestChat: () => ({
    getReferenceMetadata: getReferenceMetadataMock,
  }),
}));

vi.mock("@/components/icons/icons", () => ({
  default: {
    XIcon: (props: any) => <svg {...props} />,
  },
}));

const referenceWithPdf: Reference = {
  id: "citation-1-123",
  number: 1,
  chunkId: 123,
  excerpt: "Noi dung trich dan",
  reference: {
    chunkId: 123,
    guidelineId: 9,
    guidelineTitle: "Guideline title",
    versionId: 7,
    versionLabel: "v1",
    sectionId: 30,
    headings: [
      {
        sectionId: 20,
        heading: "Root",
        sectionPath: "1",
        startPage: 10,
        level: 1,
      },
      {
        sectionId: 30,
        heading: "Leaf",
        sectionPath: "1.2",
        startPage: 12,
        level: 2,
      },
    ],
    deepestHeading: "Leaf",
    sectionPath: "1.2",
    startPage: 12,
    documentId: 55,
    pdfPage: 12,
  },
};

describe("ReferencePanel", () => {
  beforeEach(() => {
    getReferenceMetadataMock.mockReset();
    getReferenceMetadataMock.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("shows preview section with an open link beside the section title", async () => {
    vi.stubEnv("VITE_DOCUMENT_FILE_URL_TEMPLATE", "https://ai-documents-management.devt.vn/api/v1/documents/{documentId}/file");

    render(<ReferencePanel reference={referenceWithPdf} onClose={vi.fn()} />);

    expect(screen.getByText(/xem trong tài liệu/i)).toBeInTheDocument();
    expect(screen.getByText(/trang 12/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open/i })).toHaveAttribute(
      "href",
      "https://ai-documents-management.devt.vn/api/v1/documents/55/file#page=12"
    );
    await waitFor(() => {
      expect(screen.getAllByTestId("pdf-preview-page")).toHaveLength(3);
    });
  });

  it("fetches latest metadata for the selected reference chunk", async () => {
    getReferenceMetadataMock.mockResolvedValue([
      {
        chunkId: 123,
        guidelineTitle: "Fetched guideline title",
        headings: [],
      },
    ]);

    render(<ReferencePanel reference={referenceWithPdf} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(getReferenceMetadataMock).toHaveBeenCalledWith([123]);
    });

    await waitFor(() => {
      expect(screen.getByText("Fetched guideline title")).toBeInTheDocument();
    });
  });

  it("refetches when the selected reference chunk changes", async () => {
    getReferenceMetadataMock
      .mockResolvedValueOnce([
        {
          chunkId: 123,
          guidelineTitle: "Guideline 123",
          headings: [],
        },
      ])
      .mockResolvedValueOnce([
        {
          chunkId: 456,
          guidelineTitle: "Guideline 456",
          headings: [],
        },
      ]);

    const nextReference: Reference = {
      ...referenceWithPdf,
      id: "citation-2-456",
      chunkId: 456,
      reference: {
        ...referenceWithPdf.reference!,
        chunkId: 456,
        guidelineTitle: "Fallback 456",
      },
    };

    const { rerender } = render(<ReferencePanel reference={referenceWithPdf} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(getReferenceMetadataMock).toHaveBeenNthCalledWith(1, [123]);
    });

    rerender(<ReferencePanel reference={nextReference} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(getReferenceMetadataMock).toHaveBeenNthCalledWith(2, [456]);
    });

    await waitFor(() => {
      expect(screen.getByText("Guideline 456")).toBeInTheDocument();
    });
  });
});
