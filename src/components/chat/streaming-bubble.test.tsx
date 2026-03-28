import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StreamingBubble } from "./streaming-bubble";

describe("StreamingBubble", () => {
  it("shows a collapsed Thinking panel, dedupes steps, and resets on remount", () => {
    const { rerender } = render(
      <StreamingBubble
        streamingText="Answer"
        streamingTrace={["Step 1", "Step 1", "Step 2"]}
        citations={[]}
        onCitationClick={vi.fn()}
      />
    );

    expect(
      screen.getByRole("button", { name: /thinking.*2 steps/i })
    ).toBeInTheDocument();
    expect(screen.queryByText("Step 1")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /thinking.*2 steps/i }));

    expect(screen.getByText("Step 1")).toBeInTheDocument();
    expect(screen.getByText("Step 2")).toBeInTheDocument();

    rerender(
      <StreamingBubble
        key="stream-2"
        streamingText="Answer"
        streamingTrace={["New step"]}
        citations={[]}
        onCitationClick={vi.fn()}
      />
    );

    expect(
      screen.getByRole("button", { name: /thinking.*1 step/i })
    ).toBeInTheDocument();
    expect(screen.queryByText("New step")).not.toBeInTheDocument();
  });

  it("keeps appending trace updates while closed and while open", () => {
    const { rerender } = render(
      <StreamingBubble
        streamingText="Answer"
        streamingTrace={["Step 1"]}
        citations={[]}
        onCitationClick={vi.fn()}
      />
    );

    expect(screen.queryByText("Step 1")).not.toBeInTheDocument();

    rerender(
      <StreamingBubble
        streamingText="Answer"
        streamingTrace={["Step 1", "Step 2"]}
        citations={[]}
        onCitationClick={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /thinking.*2 steps/i }));

    expect(screen.getByText("Step 1")).toBeInTheDocument();
    expect(screen.getByText("Step 2")).toBeInTheDocument();

    rerender(
      <StreamingBubble
        streamingText="Answer"
        streamingTrace={["Step 1", "Step 2", "Step 3"]}
        citations={[]}
        onCitationClick={vi.fn()}
      />
    );

    expect(screen.getByText("Step 3")).toBeInTheDocument();
  });
});
