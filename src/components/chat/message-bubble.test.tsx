import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MessageBubble } from "./message-bubble";
import { MessageRole, type Message } from "@/types/api-types";

function createAssistantMessage(overrides?: Partial<Message>): Message {
  return {
    id: "message-1",
    conversationId: "conversation-1",
    role: MessageRole.ASSISTANT,
    content: "Final answer",
    tokenCount: 12,
    createdAt: "2026-03-28T10:00:00.000Z",
    updatedAt: "2026-03-28T10:00:00.000Z",
    ...overrides,
  };
}

describe("MessageBubble", () => {
  it("shows persisted thinking in a collapsed panel by default", () => {
    render(
      <MessageBubble
        message={createAssistantMessage({
          metadata: {
            thinking: ["Routing: analyzing intent", "Retrieval: searching references"],
          },
        })}
        onCitationClick={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /thinking.*2 steps/i })).toBeInTheDocument();
    expect(screen.queryByText("Routing: analyzing intent")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /thinking.*2 steps/i }));

    expect(screen.getByText("Routing: analyzing intent")).toBeInTheDocument();
    expect(screen.getByText("Retrieval: searching references")).toBeInTheDocument();
  });

  it("does not render a thinking panel for assistant messages without persisted thinking", () => {
    render(
      <MessageBubble
        message={createAssistantMessage()}
        onCitationClick={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: /thinking/i })).not.toBeInTheDocument();
    expect(screen.getByText("Final answer")).toBeInTheDocument();
  });

  it("shows a typing indicator for an empty streaming assistant message", () => {
    render(
      <MessageBubble
        message={createAssistantMessage({
          id: "stream-a1",
          content: "",
          tokenCount: 0,
          createdAt: "2026-03-31T10:00:00.000Z",
          updatedAt: "2026-03-31T10:00:00.000Z",
        })}
        streamingState={{ isStreaming: true, citations: [] }}
        onCitationClick={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/assistant is typing/i)).toBeInTheDocument();
  });

  it("renders streaming thinking steps and citations through the shared assistant layout", () => {
    render(
      <MessageBubble
        message={createAssistantMessage({
          id: "stream-a2",
          content: 'Answer {"chunk_id":"12","used_text":"A text"}',
          tokenCount: 0,
          metadata: { thinking: ["Routing: analyzing intent"] },
          createdAt: "2026-03-31T10:00:00.000Z",
          updatedAt: "2026-03-31T10:00:00.000Z",
        })}
        streamingState={{
          isStreaming: true,
          citations: [{ chunkId: 12, excerpt: "A text" }],
        }}
        onCitationClick={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /thinking.*1 step/i })).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === "P" && element.textContent === "Answer[1]"
      )
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /\[1\]/i })).toHaveLength(2);
  });

  it("keeps inline citation markers clickable while streaming after content is already normalized", () => {
    render(
      <MessageBubble
        message={createAssistantMessage({
          id: "stream-a3",
          content: "Answer [1]",
          tokenCount: 0,
          createdAt: "2026-03-31T10:00:00.000Z",
          updatedAt: "2026-03-31T10:00:00.000Z",
        })}
        streamingState={{
          isStreaming: true,
          citations: [{ chunkId: 12, excerpt: "A text" }],
        }}
        onCitationClick={vi.fn()}
      />
    );

    expect(screen.getAllByRole("button", { name: /\[1\]/i })).toHaveLength(2);
  });

  it("preserves the spacing before inline citation markers", () => {
    render(
      <MessageBubble
        message={createAssistantMessage({
          id: "stream-a4",
          content: "Answer [1] more text",
          tokenCount: 0,
          createdAt: "2026-03-31T10:00:00.000Z",
          updatedAt: "2026-03-31T10:00:00.000Z",
        })}
        streamingState={{
          isStreaming: true,
          citations: [{ chunkId: 12, excerpt: "A text" }],
        }}
        onCitationClick={vi.fn()}
      />
    );

    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === "P" && element.textContent === "Answer [1] more text"
      )
    ).toBeInTheDocument();
  });

  it("keeps distinct hydrated labels when citations share a chunkId", () => {
    render(
      <MessageBubble
        message={createAssistantMessage({
          id: "stream-a4b",
          content: "Answer [1] and [2]",
          tokenCount: 0,
          createdAt: "2026-03-31T10:00:00.000Z",
          updatedAt: "2026-03-31T10:00:00.000Z",
        })}
        hydratedCitations={[
          {
            chunkId: 12,
            excerpt: "Text A",
            reference: {
              chunkId: 12,
              headings: [],
              deepestHeading: "Section A",
            },
          },
          {
            chunkId: 12,
            excerpt: "Text B",
            reference: {
              chunkId: 12,
              headings: [],
              deepestHeading: "Section B",
            },
          },
        ]}
        streamingState={{
          isStreaming: true,
          citations: [
            {
              chunkId: 12,
              excerpt: "Text A",
              reference: {
                chunkId: 12,
                headings: [],
                deepestHeading: "Section A",
              },
            },
            {
              chunkId: 12,
              excerpt: "Text B",
              reference: {
                chunkId: 12,
                headings: [],
                deepestHeading: "Section B",
              },
            },
          ],
        }}
        onCitationClick={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /\[1\].*Section A/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /\[2\].*Section B/i })).toBeInTheDocument();
  });

  it("does not force pre-wrap styling on assistant markdown content", () => {
    render(
      <MessageBubble
        message={createAssistantMessage({
          id: "stream-a5",
          content: "First line\nSecond line",
          tokenCount: 0,
          createdAt: "2026-03-31T10:00:00.000Z",
          updatedAt: "2026-03-31T10:00:00.000Z",
        })}
        onCitationClick={vi.fn()}
      />
    );

    expect(
      screen.getByText("First line", { exact: false }).closest("div")
    ).not.toHaveClass("whitespace-pre-wrap");
  });

  it("uses roomier paragraph spacing for assistant markdown content", () => {
    render(
      <MessageBubble
        message={createAssistantMessage({
          id: "stream-a6",
          content: "First paragraph\n\nSecond paragraph",
          tokenCount: 0,
          createdAt: "2026-03-31T10:00:00.000Z",
          updatedAt: "2026-03-31T10:00:00.000Z",
        })}
        onCitationClick={vi.fn()}
      />
    );

    expect(
      screen.getByText("First paragraph", { exact: false }).closest("div")
    ).toHaveClass("prose-p:my-2");
  });
});
