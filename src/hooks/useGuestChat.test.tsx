import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MessageRole } from "@/types/api-types";

import { useGuestChat } from "./useGuestChat";

const {
  addMessageMock,
  createConversationMock,
} = vi.hoisted(() => ({
  addMessageMock: vi.fn(),
  createConversationMock: vi.fn(() => ({
    id: "guest-conversation-1",
    title: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    isGuest: true,
    isAuthenticated: false,
  }),
}));

vi.mock("@/services/guest-storage.service", () => ({
  guestStorageService: {
    getConversations: vi.fn(() => []),
    getConversation: vi.fn(() => null),
    getMessages: vi.fn(() => []),
    createConversation: createConversationMock,
    deleteConversation: vi.fn(),
    addMessage: addMessageMock,
    updateConversationTitle: vi.fn(),
  },
}));

function createStreamingResponse(...chunks: string[]) {
  const encoder = new TextEncoder();

  return {
    ok: true,
    body: new ReadableStream({
      start(controller) {
        chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
        controller.close();
      },
    }),
  } as Response;
}

async function readAll<T>(stream: AsyncGenerator<T>) {
  const values: T[] = [];

  for await (const value of stream) {
    values.push(value);
  }

  return values;
}

describe("useGuestChat streaming", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    addMessageMock.mockReset();
    createConversationMock.mockClear();
  });

  it("does not persist a guest assistant reply when the SSE stream ends with an error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createStreamingResponse(
        'data: {"text":"Partial answer"}\n\n',
        "event: error\ndata: AI4Life API error: Unprocessable Entity\n\n"
      )
    );

    const { result } = renderHook(() => useGuestChat());
    const stream = result.current.startConversationStream("Hello");

    await expect(readAll(stream)).rejects.toThrow(
      "AI4Life API error: Unprocessable Entity"
    );

    expect(addMessageMock).not.toHaveBeenCalledWith(
      "guest-conversation-1",
      MessageRole.ASSISTANT,
      "Partial answer"
    );
  });

  it("emits trace chunks separately from answer chunks in guest mode", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createStreamingResponse(
        "event: trace\ndata: Truy xuat: dang tim tai lieu\n\n",
        'data: {"text":"Noi dung tra loi"}\n\n',
        "data: [DONE]\n\n"
      )
    );

    const { result } = renderHook(() => useGuestChat());
    const stream = result.current.startConversationStream("Hello");

    await expect(readAll(stream)).resolves.toEqual([
      { type: "conversation", conversationId: "guest-conversation-1" },
      { type: "trace", trace: "Truy xuat: dang tim tai lieu" },
      { type: "text", text: "Noi dung tra loi" },
    ]);
  });

  it("parses JSON trace chunks forwarded as default SSE messages in guest mode", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createStreamingResponse(
        'data: {"type":"trace","trace":"Xac nhan: Dang kiem tra cau hoi"}\n\n',
        'data: {"type":"text","text":"Noi dung tra loi"}\n\n',
        "data: [DONE]\n\n"
      )
    );

    const { result } = renderHook(() => useGuestChat());
    const stream = result.current.startConversationStream("Hello");

    await expect(readAll(stream)).resolves.toEqual([
      { type: "conversation", conversationId: "guest-conversation-1" },
      { type: "trace", trace: "Xac nhan: Dang kiem tra cau hoi" },
      { type: "text", text: "Noi dung tra loi" },
    ]);

    expect(addMessageMock).toHaveBeenNthCalledWith(
      2,
      "guest-conversation-1",
      MessageRole.ASSISTANT,
      "Noi dung tra loi",
      undefined,
      { thinking: ["Xac nhan: Dang kiem tra cau hoi"] }
    );
  });
});
