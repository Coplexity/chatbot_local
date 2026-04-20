import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ChatInput } from "./chat-input";

vi.mock("@/components/icons/icons", () => ({
  default: {
    SendIcon: (props: any) => <svg {...props} />,
  },
}));

describe("ChatInput", () => {
  it("renders the large rounded composer with the prompt placeholder", () => {
    const { container } = render(
      <ChatInput
        value=""
        onChange={vi.fn()}
        onSend={vi.fn()}
        disabled={false}
      />
    );

    const textarea = screen.getByPlaceholderText(/bạn cần hỏi gì/i);
    const sendButton = container.querySelector("button");

    expect(textarea).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("bg-transparent");
    expect(textarea).toHaveClass("text-base");
    expect(sendButton).toHaveClass("bg-transparent");
  });

  it("submits on enter without shift", () => {
    const onSend = vi.fn();

    render(
      <ChatInput value="Xin chao" onChange={vi.fn()} onSend={onSend} disabled={false} />
    );

    fireEvent.keyDown(screen.getByPlaceholderText(/bạn cần hỏi gì/i), {
      key: "Enter",
      shiftKey: false,
    });

    expect(onSend).toHaveBeenCalledTimes(1);
  });
});
