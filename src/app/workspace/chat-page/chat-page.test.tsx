import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { ChatPage } from "./chat-page";

vi.mock("antd", () => ({
  App: {
    useApp: () => ({
      message: {
        error: vi.fn(),
      },
    }),
  },
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  useSearch: () => ({ chatId: undefined }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: { conversation: null, messages: [] },
    isLoading: false,
  }),
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

vi.mock("@/hooks/useGuestChat", () => ({
  useGuestChat: () => ({
    isGuest: true,
    getMessages: vi.fn(),
    sendMessageStream: vi.fn(),
    startConversationStream: vi.fn(),
  }),
}));

vi.mock("@/utils/citation-parser", () => ({
  citationToReference: vi.fn(),
}));

vi.mock("@/components/chat", () => ({
  ChatInput: () => <div data-testid="chat-input">Chat input</div>,
  MessageBubble: () => <div>Message</div>,
  OptimisticBubble: () => <div>Optimistic</div>,
  StreamingBubble: () => <div>Streaming</div>,
}));

vi.mock("@/components/reference-panel/reference-panel", () => ({
  ReferencePanel: () => <div>Reference panel</div>,
}));

describe("ChatPage", () => {
  beforeAll(() => {
    Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
      value: vi.fn(),
      writable: true,
    });
  });

  it("shows a friendly empty-state text on a new chat before any messages exist", () => {
    render(<ChatPage />);

    expect(screen.getByText(/bạn cần tra cứu gì|nhập nội dung cần tra cứu|cần hỗ trợ chuyên môn gì/i)).toBeInTheDocument();
    expect(screen.getByText(/tra cứu triệu chứng, chẩn đoán phân biệt hoặc hướng xử trí/i)).toBeInTheDocument();
  });
});
