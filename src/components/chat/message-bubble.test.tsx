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
});
