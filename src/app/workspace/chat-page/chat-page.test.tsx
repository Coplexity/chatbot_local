import { render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ChatPage } from "./chat-page";

const messageBubbleMock = vi.fn((_: unknown) => <div>Message</div>);

const sendMessageStreamMock = vi.fn();
const startConversationStreamMock = vi.fn();
const getReferenceMetadataMock = vi.fn();
const getMessagesMock = vi.fn();
const messageErrorMock = vi.fn();

vi.mock("antd", () => ({
  App: {
    useApp: () => ({
      message: {
        error: messageErrorMock,
      },
    }),
  },
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  useSearch: () => ({ chatId: "12345678901234567890123456789012" }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: { enabled?: boolean }) => ({
    data: options.enabled === false
      ? { conversation: null, messages: [] }
      : { conversation: null, messages: getMessagesMock() },
    isLoading: false,
  }),
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

vi.mock("@/hooks/useGuestChat", () => ({
  useGuestChat: () => ({
    isGuest: true,
    getMessages: getMessagesMock,
    sendMessageStream: sendMessageStreamMock,
    startConversationStream: startConversationStreamMock,
    getReferenceMetadata: getReferenceMetadataMock,
  }),
}));

vi.mock("@/utils/citation-parser", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/utils/citation-parser")>();

  return {
    ...actual,
    citationToReference: vi.fn((citation, index) => ({
      ...citation,
      id: `citation-${index}`,
      number: index + 1,
    })),
  };
});

vi.mock("@/components/chat", () => ({
  ChatInput: ({ onSend, onChange }: { onSend: () => void; onChange: (value: string) => void }) => (
    <div>
      <button type="button" data-testid="fill-input" onClick={() => onChange("Question")}>Fill</button>
      <button type="button" data-testid="chat-input" onClick={onSend}>Send</button>
    </div>
  ),
  MessageBubble: (props: unknown) => messageBubbleMock(props),
  OptimisticBubble: () => <div>Optimistic</div>,
  StreamingBubble: ({ streamingText }: { streamingText: string }) => <div>{streamingText}</div>,
}));

vi.mock("@/components/reference-panel/reference-panel", () => ({
  ReferencePanel: () => <div>Reference panel</div>,
}));

describe("ChatPage", () => {
  beforeEach(() => {
    getMessagesMock.mockReset();
    getMessagesMock.mockReturnValue([]);
    messageBubbleMock.mockClear();
    messageErrorMock.mockReset();
    sendMessageStreamMock.mockReset();
    startConversationStreamMock.mockReset();
    getReferenceMetadataMock.mockReset();
  });

  beforeAll(() => {
    Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
      value: vi.fn(),
      writable: true,
    });
  });

  it("hydrates source tags during streaming as soon as a tag closes", async () => {
    async function* stream() {
      yield { text: '```json\n{"chunk_id": "12", "used_text": "A' };
      yield { text: ' text"}\n```' };
    }

    sendMessageStreamMock.mockReturnValue(stream());
    getReferenceMetadataMock.mockResolvedValue([
      {
        chunkId: 12,
        guidelineTitle: "Guideline",
        headings: [],
      },
    ]);

    render(<ChatPage />);

    await act(async () => {
      screen.getByTestId("fill-input").click();
    });

    await act(async () => {
      screen.getByTestId("chat-input").click();
    });

    await waitFor(() => {
      expect(getReferenceMetadataMock).toHaveBeenCalledWith([12]);
    });
  });

  it("shows a friendly empty-state text on a new chat before any messages exist", () => {
    render(<ChatPage />);

    expect(screen.getByText(/xin chào! tôi có thể giúp gì cho bạn/i)).toBeInTheDocument();
    expect(screen.getByText(/nhập nội dung tra cứu vào ô dưới đây/i)).toBeInTheDocument();
  });

  it("fetches metadata for stored assistant citations", async () => {
    getMessagesMock.mockReturnValue([
      {
        id: "m1",
        conversationId: "c1",
        role: "assistant",
        content: '```json\n{"chunk_id": "12", "used_text": "A text"}\n```',
        tokenCount: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    getReferenceMetadataMock.mockResolvedValue([
      {
        chunkId: 12,
        guidelineTitle: "Heart failure guideline",
        guidelineId: 8,
        versionId: 3,
        startPage: 22,
        documentId: 55,
        pdfPage: 22,
        headings: [
          {
            sectionId: 1,
            heading: "Điều trị nội khoa",
            sectionPath: "1.2",
            startPage: 22,
            level: 2,
          },
        ],
      },
    ]);

    render(<ChatPage />);

    await waitFor(() => {
      expect(getReferenceMetadataMock).toHaveBeenCalledWith([12]);
    });

    await waitFor(() => {
      expect(messageBubbleMock).toHaveBeenCalledWith(
        expect.objectContaining({
          hydratedCitations: [
            expect.objectContaining({
              chunkId: 12,
              reference: expect.objectContaining({
                guidelineTitle: "Heart failure guideline",
                documentId: 55,
              }),
            }),
          ],
        })
      );
    });
  });

  it("does not refetch the same stored metadata repeatedly across rerenders", async () => {
    getMessagesMock.mockReturnValue([
      {
        id: "m1",
        conversationId: "c1",
        role: "assistant",
        content: '```json\n{"chunk_id": "12", "used_text": "A text"}\n```',
        tokenCount: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    getReferenceMetadataMock.mockResolvedValue([
      {
        chunkId: 12,
        guidelineTitle: "Heart failure guideline",
        headings: [],
      },
    ]);

    const { rerender } = render(<ChatPage />);

    await waitFor(() => {
      expect(getReferenceMetadataMock).toHaveBeenCalledTimes(1);
      expect(getReferenceMetadataMock).toHaveBeenCalledWith([12]);
    });

    rerender(<ChatPage />);

    await waitFor(() => {
      expect(getReferenceMetadataMock).toHaveBeenCalledTimes(1);
    });
  });

  it("shows an error toast and clears partial streaming text when the stream fails", async () => {
    async function* stream() {
      yield { text: "Partial answer" };
      throw new Error("AI4Life API error: Unprocessable Entity");
    }

    sendMessageStreamMock.mockReturnValue(stream());

    render(<ChatPage />);

    await act(async () => {
      screen.getByTestId("fill-input").click();
    });

    await act(async () => {
      screen.getByTestId("chat-input").click();
    });

    await waitFor(() => {
      expect(messageErrorMock).toHaveBeenCalledWith(
        "AI4Life API error: Unprocessable Entity"
      );
    });

    expect(screen.queryByText("Partial answer")).not.toBeInTheDocument();
  });
});
