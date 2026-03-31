import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ChatPage } from "./chat-page";

const messageBubbleMock = vi.fn((_: unknown) => <div>Message</div>);
const referencePanelMock = vi.fn((_: unknown) => <div>Reference panel</div>);

const sendMessageStreamMock = vi.fn();
const startConversationStreamMock = vi.fn();
const getReferenceMetadataMock = vi.fn();
const getMessagesMock = vi.fn();
const messageErrorMock = vi.fn();
const scrollIntoViewMock = vi.fn();
const scrollToMock = vi.fn();
const invalidateQueriesMock = vi.fn();
const setQueryDataMock = vi.fn();
let searchChatId = "12345678901234567890123456789012";

function setScrollMetrics(
  element: HTMLElement,
  metrics: { scrollTop: number; scrollHeight: number; clientHeight: number }
) {
  Object.defineProperty(element, "scrollTop", {
    configurable: true,
    value: metrics.scrollTop,
    writable: true,
  });
  Object.defineProperty(element, "scrollHeight", {
    configurable: true,
    value: metrics.scrollHeight,
  });
  Object.defineProperty(element, "clientHeight", {
    configurable: true,
    value: metrics.clientHeight,
  });
}

function createControlledStream() {
  let pushChunk:
    | ((value: { type: string; text?: string; trace?: string }) => void)
    | undefined;
  let finishStream: (() => void) | undefined;

  async function* stream() {
    const queue: Array<{ type: string; text?: string; trace?: string }> = [];
    let done = false;
    let resume: (() => void) | null = null;

    pushChunk = (value) => {
      queue.push(value);
      resume?.();
      resume = null;
    };

    finishStream = () => {
      done = true;
      resume?.();
      resume = null;
    };

    while (!done || queue.length > 0) {
      if (queue.length === 0) {
        await new Promise<void>((resolve) => {
          resume = resolve;
        });
        continue;
      }

      const next = queue.shift();
      if (next) {
        yield next;
      }
    }
  }

  return {
    stream,
    pushChunk: (value: { type: string; text?: string; trace?: string }) => {
      pushChunk?.(value);
    },
    finishStream: () => {
      finishStream?.();
    },
  };
}

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
  useSearch: () => ({ chatId: searchChatId }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: { enabled?: boolean }) => ({
    data: options.enabled === false
      ? { conversation: null, messages: [] }
      : { conversation: null, messages: getMessagesMock() },
    isLoading: false,
  }),
  useQueryClient: () => ({
    invalidateQueries: invalidateQueriesMock,
    setQueryData: setQueryDataMock,
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
      id: `citation-${index}`,
      number: index + 1,
      chunkId: citation.chunkId,
      excerpt: citation.excerpt ?? citation.used_text ?? "",
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
  MessageBubble: (props: unknown) => {
    messageBubbleMock(props);
    const {
      message,
      streamingState,
    } = props as {
      message: { content: string; metadata?: { thinking?: string[] } };
      streamingState?: { isStreaming?: boolean };
    };
    const visibleTrace = [...new Set(message.metadata?.thinking ?? [])];

    return (
      <div>
        {visibleTrace.length > 0 && (
          <details>
            <summary>{`Thinking (${visibleTrace.length} step${visibleTrace.length === 1 ? "" : "s"})`}</summary>
            <div>
              {visibleTrace.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
          </details>
        )}
        <div>{streamingState?.isStreaming && !message.content ? "Typing" : message.content}</div>
      </div>
    );
  },
}));

vi.mock("@/components/reference-panel/reference-panel", () => ({
  ReferencePanel: (props: unknown) => referencePanelMock(props),
}));

describe("ChatPage", () => {
  beforeEach(() => {
    searchChatId = "12345678901234567890123456789012";
    getMessagesMock.mockReset();
    getMessagesMock.mockReturnValue([]);
    messageBubbleMock.mockClear();
    messageErrorMock.mockReset();
    sendMessageStreamMock.mockReset();
    startConversationStreamMock.mockReset();
    getReferenceMetadataMock.mockReset();
    scrollIntoViewMock.mockReset();
    scrollToMock.mockReset();
    invalidateQueriesMock.mockReset();
    setQueryDataMock.mockReset();
    referencePanelMock.mockReset();
  });

  beforeAll(() => {
    Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
      value: function scrollIntoView() {
        scrollIntoViewMock();
      },
      writable: true,
    });

    Object.defineProperty(window.HTMLElement.prototype, "scrollTo", {
      value: function scrollTo() {
        scrollToMock();
      },
      writable: true,
    });
  });

  it("keeps auto-scroll active while the user remains near the bottom", async () => {
    const controlled = createControlledStream();
    sendMessageStreamMock.mockReturnValue(controlled.stream());

    render(<ChatPage />);

    await act(async () => {
      screen.getByTestId("fill-input").click();
    });

    await act(async () => {
      screen.getByTestId("chat-input").click();
    });

    const scrollContainer = document.querySelector(".overflow-y-auto") as HTMLElement;

    setScrollMetrics(scrollContainer, {
      scrollTop: 600,
      scrollHeight: 1000,
      clientHeight: 400,
    });

    scrollIntoViewMock.mockClear();
    scrollToMock.mockClear();

    await act(async () => {
      controlled.pushChunk({ type: "text", text: "Chunk near bottom" });
    });

    await waitFor(() => {
      expect(scrollToMock).toHaveBeenCalled();
    });

    await act(async () => {
      controlled.finishStream();
    });
  });

  it("stops auto-scrolling as soon as the user scrolls upward during streaming", async () => {
    const controlled = createControlledStream();
    sendMessageStreamMock.mockReturnValue(controlled.stream());

    render(<ChatPage />);

    await act(async () => {
      screen.getByTestId("fill-input").click();
    });

    await act(async () => {
      screen.getByTestId("chat-input").click();
    });

    const scrollContainer = document.querySelector(".overflow-y-auto") as HTMLElement;

    setScrollMetrics(scrollContainer, {
      scrollTop: 570,
      scrollHeight: 1000,
      clientHeight: 400,
    });

    fireEvent.scroll(scrollContainer);
    scrollIntoViewMock.mockClear();
    scrollToMock.mockClear();

    await act(async () => {
      controlled.pushChunk({
        type: "text",
        text: "Chunk while reading older messages",
      });
    });

    await waitFor(() => {
      expect(
        screen.getByText("Chunk while reading older messages")
      ).toBeInTheDocument();
    });

    expect(scrollToMock).not.toHaveBeenCalled();

    await act(async () => {
      controlled.finishStream();
    });
  });

  it("keeps streaming citations local to the chat page without fetching metadata", async () => {
    async function* stream() {
      yield { text: '```json\n{"chunk_id": "12", "used_text": "A' };
      yield { text: ' text"}\n```' };
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
      expect(getReferenceMetadataMock).not.toHaveBeenCalled();
    });
  });

  it("shows a friendly empty-state text on a new chat before any messages exist", () => {
    searchChatId = undefined as unknown as string;

    render(<ChatPage />);

    expect(screen.getByText(/xin chào! tôi có thể giúp gì cho bạn/i)).toBeInTheDocument();
    expect(screen.getByText(/nhập nội dung tra cứu vào ô dưới đây/i)).toBeInTheDocument();
  });

  it("treats guest conversation ids as valid existing chats", () => {
    searchChatId = "guest-1711665000000-abc1234";
    getMessagesMock.mockReturnValue([
      {
        id: "m1",
        conversationId: searchChatId,
        role: "assistant",
        content: "Guest answer",
        tokenCount: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    render(<ChatPage />);

    expect(screen.queryByText(/xin chào! tôi có thể giúp gì cho bạn/i)).not.toBeInTheDocument();
    expect(messageBubbleMock).toHaveBeenCalled();
  });

  it("passes parsed citations to message bubbles without page-level metadata fetch", async () => {
    getMessagesMock.mockReturnValue([
      {
        id: "m1",
        conversationId: "c1",
        role: "assistant",
        content: 'Answer {"chunk_id": "12", "used_text": "A text"}',
        tokenCount: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    render(<ChatPage />);

    await waitFor(() => {
      expect(messageBubbleMock).toHaveBeenCalledWith(
        expect.objectContaining({
          hydratedCitations: [
            expect.objectContaining({
              chunkId: 12,
            }),
          ],
        })
      );
    });

    expect(getReferenceMetadataMock).not.toHaveBeenCalled();
  });

  it("bumps the reference scroll request key on every citation click", async () => {
    let onCitationClick: ((citation: { chunkId: number; used_text?: string }, index: number) => void) | undefined;

    messageBubbleMock.mockImplementation((props: unknown) => {
      const { onCitationClick: nextOnCitationClick } = props as {
        onCitationClick: (citation: { chunkId: number; used_text?: string }, index: number) => void;
      };

      onCitationClick = nextOnCitationClick;
      return <button type="button">Message</button>;
    });

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

    render(<ChatPage />);

    await waitFor(() => {
      expect(onCitationClick).toBeTypeOf("function");
    });

    await act(async () => {
      onCitationClick?.({ chunkId: 12, used_text: "A text" }, 0);
    });

    await waitFor(() => {
      expect(referencePanelMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          scrollRequestKey: 1,
          reference: expect.objectContaining({ chunkId: 12 }),
        })
      );
    });

    await act(async () => {
      onCitationClick?.({ chunkId: 12, used_text: "A text" }, 0);
    });

    await waitFor(() => {
      expect(referencePanelMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          scrollRequestKey: 2,
          reference: expect.objectContaining({ chunkId: 12, excerpt: "A text" }),
        })
      );
    });
  });

  it("passes the latest citation excerpt to the reference panel even when chunkId stays the same", async () => {
    let onCitationClick: ((citation: { chunkId: number; used_text?: string }, index: number) => void) | undefined;

    messageBubbleMock.mockImplementation((props: unknown) => {
      const { onCitationClick: nextOnCitationClick } = props as {
        onCitationClick: (citation: { chunkId: number; used_text?: string }, index: number) => void;
      };

      onCitationClick = nextOnCitationClick;
      return <button type="button">Message</button>;
    });

    getMessagesMock.mockReturnValue([
      {
        id: "m1",
        conversationId: "c1",
        role: "assistant",
        content: 'Answer {"chunk_id": "12", "used_text": "A text"}',
        tokenCount: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    render(<ChatPage />);

    await waitFor(() => {
      expect(onCitationClick).toBeTypeOf("function");
    });

    await act(async () => {
      onCitationClick?.({ chunkId: 12, used_text: "A text" }, 0);
    });

    await waitFor(() => {
      expect(referencePanelMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          reference: expect.objectContaining({ chunkId: 12, excerpt: "A text" }),
        })
      );
    });

    await act(async () => {
      onCitationClick?.({ chunkId: 12, used_text: "B text" }, 0);
    });

    await waitFor(() => {
      expect(referencePanelMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          reference: expect.objectContaining({ chunkId: 12, excerpt: "B text" }),
        })
      );
    });
  });

  it("does not trigger reference metadata fetches across rerenders", async () => {
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

    const { rerender } = render(<ChatPage />);

    await waitFor(() => {
      expect(getReferenceMetadataMock).not.toHaveBeenCalled();
    });

    rerender(<ChatPage />);

    await waitFor(() => {
      expect(getReferenceMetadataMock).not.toHaveBeenCalled();
    });
  });

  it("shows an error toast and clears partial streaming text when the stream fails", async () => {
    async function* stream() {
      yield { type: "trace", trace: "Routing: analyzing intent" };
      yield { type: "text", text: "Partial answer" };
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
    expect(screen.queryByText("Routing: analyzing intent")).not.toBeInTheDocument();
    expect(screen.queryByText(/Thinking/i)).not.toBeInTheDocument();
  });

  it("shows a collapsed Thinking panel and keeps duplicate trace lines deduped", async () => {
    let finishStream: (() => void) | undefined;

    async function* stream() {
      yield { type: "trace", trace: "Routing: analyzing intent" };
      yield { type: "trace", trace: "Routing: analyzing intent" };
      yield { type: "text", text: "Final answer" };

      await new Promise<void>((resolve) => {
        finishStream = resolve;
      });
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
      expect(screen.getByText("Thinking (1 step)")).toBeInTheDocument();
    });
    expect(screen.getByText("Final answer")).toBeInTheDocument();
    expect(screen.getByText("Routing: analyzing intent")).not.toBeVisible();

    await act(async () => {
      finishStream?.();
    });
  });

  it("continues appending trace updates while the Thinking panel is open", async () => {
    let pushChunk: ((value: { type: string; text?: string; trace?: string }) => void) | undefined;
    let finishStream: (() => void) | undefined;

    async function* stream() {
      const queue: Array<{ type: string; text?: string; trace?: string }> = [];
      let done = false;
      let resume: (() => void) | null = null;

      pushChunk = (value) => {
        queue.push(value);
        resume?.();
        resume = null;
      };

      finishStream = () => {
        done = true;
        resume?.();
        resume = null;
      };

      while (!done || queue.length > 0) {
        if (queue.length === 0) {
          await new Promise<void>((resolve) => {
            resume = resolve;
          });
          continue;
        }

        const next = queue.shift();
        if (next) {
          yield next;
        }
      }
    }

    sendMessageStreamMock.mockReturnValue(stream());

    render(<ChatPage />);

    await act(async () => {
      screen.getByTestId("fill-input").click();
    });

    await act(async () => {
      screen.getByTestId("chat-input").click();
    });

    await act(async () => {
      pushChunk?.({ type: "trace", trace: "Routing: analyzing intent" });
    });

    await waitFor(() => {
      expect(screen.getByText("Thinking (1 step)")).toBeInTheDocument();
    });
    expect(screen.getByText("Routing: analyzing intent")).not.toBeVisible();

    fireEvent.click(screen.getByText("Thinking (1 step)"));

    await waitFor(() => {
      expect(screen.getByText("Routing: analyzing intent")).toBeInTheDocument();
    });

    await act(async () => {
      pushChunk?.({ type: "trace", trace: "Retrieval: searching references" });
    });

    await waitFor(() => {
      expect(screen.getByText("Retrieval: searching references")).toBeInTheDocument();
    });

    await act(async () => {
      finishStream?.();
    });
  });

  it("updates a single assistant message in place during streaming and completion", async () => {
    const controlled = createControlledStream();
    sendMessageStreamMock.mockReturnValue(controlled.stream());

    render(<ChatPage />);

    await act(async () => {
      screen.getByTestId("fill-input").click();
    });

    await act(async () => {
      screen.getByTestId("chat-input").click();
    });

    await act(async () => {
      controlled.pushChunk({ type: "text", text: "Partial" });
    });

    await waitFor(() => {
      expect(messageBubbleMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.objectContaining({ content: "Partial" }),
          streamingState: expect.objectContaining({ isStreaming: true }),
        })
      );
    });

    await act(async () => {
      controlled.pushChunk({ type: "text", text: " answer" });
      controlled.finishStream();
    });

    await waitFor(() => {
      expect(setQueryDataMock).toHaveBeenCalledWith(
        ["messages", searchChatId, true],
        expect.any(Function)
      );
    });

    const finalUpdater = setQueryDataMock.mock.calls.at(-1)?.[1] as (
      current: { conversation: null; messages: Array<{ content: string }> }
    ) => { conversation: null; messages: Array<{ content: string }> };

    expect(
      finalUpdater({ conversation: null, messages: [] }).messages.map((message) => message.content)
    ).toEqual(["Question", "Partial answer"]);

    expect(messageBubbleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.objectContaining({ content: "Partial" }),
        streamingState: expect.objectContaining({ isStreaming: true }),
      })
    );

    expect(messageBubbleMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.objectContaining({ content: "Partial answer" }),
        streamingState: expect.objectContaining({ isStreaming: true }),
      })
    );
  });

  it("keeps raw citation payload in the finalized assistant message after streaming completes", async () => {
    const controlled = createControlledStream();
    sendMessageStreamMock.mockReturnValue(controlled.stream());

    render(<ChatPage />);

    await act(async () => {
      screen.getByTestId("fill-input").click();
    });

    await act(async () => {
      screen.getByTestId("chat-input").click();
    });

    await act(async () => {
      controlled.pushChunk({ type: "text", text: 'Answer {"chunk_id": "12", ' });
      controlled.pushChunk({ type: "text", text: '"used_text": "A text"}' });
      controlled.finishStream();
    });

    await waitFor(() => {
      expect(setQueryDataMock).toHaveBeenCalledWith(
        ["messages", searchChatId, true],
        expect.any(Function)
      );
    });

    const finalUpdater = setQueryDataMock.mock.calls.at(-1)?.[1] as (
      current: { conversation: null; messages: Array<{ content: string }> }
    ) => { conversation: null; messages: Array<{ content: string }> };

    expect(finalUpdater({ conversation: null, messages: [] }).messages).toEqual([
      expect.objectContaining({ content: "Question" }),
      expect.objectContaining({
        content: 'Answer {"chunk_id": "12", "used_text": "A text"}',
      }),
    ]);
  });

  it("does not invalidate the messages query after a successful stream", async () => {
    const controlled = createControlledStream();
    sendMessageStreamMock.mockReturnValue(controlled.stream());

    render(<ChatPage />);

    await act(async () => {
      screen.getByTestId("fill-input").click();
    });

    await act(async () => {
      screen.getByTestId("chat-input").click();
    });

    await act(async () => {
      controlled.pushChunk({ type: "text", text: "Done" });
      controlled.finishStream();
    });

    await waitFor(() => {
      expect(invalidateQueriesMock).not.toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ["messages", searchChatId, true],
        })
      );
    });
  });
});
