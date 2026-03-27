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
});
