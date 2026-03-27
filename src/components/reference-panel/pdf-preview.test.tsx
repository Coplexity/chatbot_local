import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PdfPreview } from "./pdf-preview";

describe("PdfPreview", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders an embed preview and open-link action when pdf config is available", () => {
    vi.stubEnv("VITE_DOCUMENT_FILE_URL_TEMPLATE", "https://ai-documents-management.devt.vn/api/v1/documents/{documentId}/file");

    render(
      <PdfPreview
        title="Guideline"
        documentId={55}
        pdfPage={12}
      />
    );

    expect(screen.getByTestId("pdf-preview-embed")).toHaveAttribute(
      "src",
      "https://ai-documents-management.devt.vn/api/v1/documents/55/file#page=12"
    );
    expect(screen.getByRole("link", { name: /mở tab mới/i })).toHaveAttribute(
      "href",
      "https://ai-documents-management.devt.vn/api/v1/documents/55/file#page=12"
    );
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

    expect(screen.getByTestId("pdf-preview-embed")).toHaveAttribute(
      "src",
      "https://docs.example.com/api/v1/documents/99/file#page=12"
    );
  });

  it("omits the page anchor when both pdfPage and fallbackPage are missing", () => {
    vi.stubEnv("VITE_DOCUMENT_FILE_URL_TEMPLATE", "https://docs.example.com/api/v1/documents/{documentId}/file");

    render(
      <PdfPreview
        title="Guideline"
        documentId={77}
      />
    );

    expect(screen.getByTestId("pdf-preview-embed")).toHaveAttribute(
      "src",
      "https://docs.example.com/api/v1/documents/77/file"
    );
  });

  it("shows empty state when documentId is missing", () => {
    render(<PdfPreview title="Guideline" />);

    expect(screen.getByText(/pdf chưa sẵn sàng/i)).toBeInTheDocument();
  });

  it("shows a load failure state while keeping the open link when the preview fails", async () => {
    vi.stubEnv("VITE_DOCUMENT_FILE_URL_TEMPLATE", "https://docs.example.com/api/v1/documents/{documentId}/file");

    render(
      <PdfPreview
        title="Guideline"
        documentId={55}
        pdfPage={12}
      />
    );

    fireEvent(screen.getByTestId("pdf-preview-embed"), new Event("error"));

    expect(await screen.findByText(/không thể tải pdf/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /mở tab mới/i })).toBeInTheDocument();
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
