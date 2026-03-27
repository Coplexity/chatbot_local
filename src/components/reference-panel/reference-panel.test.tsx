import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Reference } from "@/types/chat-types";

import { ReferencePanel } from "./reference-panel";

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
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("shows preview section inside the reference panel", () => {
    vi.stubEnv("VITE_DOCUMENT_FILE_URL_TEMPLATE", "https://ai-documents-management.devt.vn/api/v1/documents/{documentId}/file");

    render(<ReferencePanel reference={referenceWithPdf} onClose={vi.fn()} />);

    expect(screen.getByText(/xem trong tài liệu/i)).toBeInTheDocument();
    expect(screen.getAllByText(/trang 12/i)).toHaveLength(2);
    expect(screen.getByRole("link", { name: /mở tab mới/i })).toBeInTheDocument();
  });
});
