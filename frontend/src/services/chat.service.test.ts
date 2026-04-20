import { beforeEach, describe, expect, it, vi } from "vitest";

import { chatService } from "./chat.service";

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

describe("chatService streaming", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("throws the server error message for authenticated SSE error events", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createStreamingResponse(
        "event: error\ndata: AI4Life API error: Unprocessable Entity\n\n"
      )
    );

    const stream = chatService.sendMessageStream("conversation-1", "Hello");

    await expect(stream.next()).rejects.toThrow(
      "AI4Life API error: Unprocessable Entity"
    );
  });

  it("emits trace chunks separately from answer chunks in order", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createStreamingResponse(
        "event: trace\ndata: Routing: analyzing intent\n\n",
        'data: {"text":"Answer part 1"}\n\n',
        "event: trace\ndata: Retrieval: searching references\n\n",
        'data: {"text":"Answer part 2"}\n\n',
        "data: [DONE]\n\n"
      )
    );

    const stream = chatService.sendMessageStream("conversation-1", "Hello");

    await expect(readAll(stream)).resolves.toEqual([
      { type: "trace", trace: "Routing: analyzing intent" },
      { type: "text", text: "Answer part 1" },
      { type: "trace", trace: "Retrieval: searching references" },
      { type: "text", text: "Answer part 2" },
    ]);
  });

  it("parses JSON trace chunks forwarded as normal SSE message data", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createStreamingResponse(
        'data: {"type":"trace","trace":"Xac nhan: Dang kiem tra cau hoi"}\n\n',
        'data: {"type":"text","text":"Final answer"}\n\n',
        "data: [DONE]\n\n"
      )
    );

    const stream = chatService.sendMessageStream("conversation-1", "Hello");

    await expect(readAll(stream)).resolves.toEqual([
      { type: "trace", trace: "Xac nhan: Dang kiem tra cau hoi" },
      { type: "text", text: "Final answer" },
    ]);
  });

  it("preserves citation-bearing answer text while adding trace support", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createStreamingResponse(
        "event: trace\ndata: Routing: analyzing intent\n\n",
        'data: {"text":"Answer ```json\\n{\\"chunk_id\\": \\\"12\\\", \\\"used_text\\\": \\\"A text\\\"}\\n```"}\n\n',
        "data: [DONE]\n\n"
      )
    );

    const stream = chatService.sendMessageStream("conversation-1", "Hello");

    await expect(readAll(stream)).resolves.toEqual([
      { type: "trace", trace: "Routing: analyzing intent" },
      {
        type: "text",
        text: 'Answer ```json\n{"chunk_id": "12", "used_text": "A text"}\n```',
      },
    ]);
  });

  it("preserves conversation, trace, and text chunks for new chat startup", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createStreamingResponse(
        'data: {"type":"conversation","conversationId":"conversation-1"}\n\n',
        "event: trace\ndata: Routing: analyzing intent\n\n",
        'data: {"type":"text","text":"Final answer"}\n\n',
        "data: [DONE]\n\n"
      )
    );

    const stream = chatService.startConversationStream("Hello");

    await expect(readAll(stream)).resolves.toEqual([
      { type: "conversation", conversationId: "conversation-1" },
      { type: "trace", trace: "Routing: analyzing intent" },
      { type: "text", text: "Final answer" },
    ]);
  });
});
