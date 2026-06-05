/// <reference types="jest" />
import { ChatApiConfig } from "../../../configs/root-config";
import { ChatApiProviderService } from "./chat-api.provider";

function createStreamResponse(chunks: string[]) {
  const encoder = new TextEncoder();

  return {
    ok: true,
    statusText: "OK",
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      },
    }),
  };
}

describe("chatApiProviderService", () => {
  const originalFetch = globalThis.fetch;

  function createProvider(url = "http://example.test") {
    return new ChatApiProviderService({ url } as ChatApiConfig);
  }

  async function collectStreamTexts(provider: ChatApiProviderService) {
    const result = await provider.generateResponse([
      { role: "user", content: "Hi" },
    ], true);

    if (!("stream" in result)) {
      throw new Error("Expected streaming response");
    }

    const chunks: Array<{ type?: string; text?: string; trace?: string; citation?: unknown }> = [];
    for await (const chunk of result.stream) {
      chunks.push(chunk);
    }

    return chunks;
  }

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("returns the final SSE text chunk even when the stream ends without a trailing newline", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(
      createStreamResponse([
        "data: {\"text\":\"Xin chao\"}",
      ]) as unknown as Response,
    );

    const provider = createProvider();

    const result = await provider.generateResponse([
      { role: "user", content: "Hi" },
    ], false);

    expect("content" in result && result.content).toBe("Xin chao");
  });

  it("ignores trace events and joins multi-line answer data in non-streaming mode", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(
      createStreamResponse([
        "event: trace\n",
        "data: Dinh tuyen: Dang phan tich y dinh\n\n",
        "data: ## \n",
        "data: Phan\n",
        "data:  tich\n\n",
      ]) as unknown as Response,
    );

    const provider = createProvider();

    const result = await provider.generateResponse([
      { role: "user", content: "Hi" },
    ], false);

    expect("content" in result && result.content).toBe("## \nPhan\n tich");
  });

  it("emits trace text before answer chunks in streaming mode", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(
      createStreamResponse([
        "event: trace\n",
        "data: Dinh tuyen: Dang phan tich y dinh\n\n",
        "data: ## \n",
        "data: Phan\n",
        "data:  tich\n\n",
      ]) as unknown as Response,
    );

    const provider = createProvider();

    const chunks = await collectStreamTexts(provider);

    expect(chunks).toEqual([
      { type: "trace", trace: "Dinh tuyen: Dang phan tich y dinh" },
      { type: "text", text: "## \nPhan\n tich" },
    ]);
  });

  it("maps new type-based payloads into trace and text chunks", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(
      createStreamResponse([
        "data: {\"type\":\"trace\",\"text\":\" Dang suy luan... \"}\n\n",
        "data: {\"type\":\"text\",\"text\":\"#\"}\n\n",
        "data: {\"type\":\"text\",\"text\":\" Phan tich\"}\n\n",
      ]) as unknown as Response,
    );

    const provider = createProvider();

    const chunks = await collectStreamTexts(provider);

    expect(chunks).toEqual([
      { type: "trace", trace: "Dang suy luan..." },
      { type: "text", text: "#" },
      { type: "text", text: " Phan tich" },
    ]);
  });

  it("ignores new trace payloads and joins new text payloads in non-streaming mode", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(
      createStreamResponse([
        "data: {\"type\":\"trace\",\"text\":\"Dang suy luan\"}\n\n",
        "data: {\"type\":\"text\",\"text\":\"Xin\"}\n\n",
        "data: {\"type\":\"text\",\"text\":\" chao\"}\n\n",
      ]) as unknown as Response,
    );

    const provider = createProvider();

    const result = await provider.generateResponse([
      { role: "user", content: "Hi" },
    ], false);

    expect("content" in result && result.content).toBe("Xin chao");
  });

  it("keeps legacy trace events working when payload JSON says text", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(
      createStreamResponse([
        "event: trace\ndata: {\"type\":\"text\",\"text\":\"partial answer\"}\n\n",
      ]) as unknown as Response,
    );

    const provider = createProvider();

    const chunks = await collectStreamTexts(provider);

    expect(chunks).toEqual([
      { type: "trace", trace: "{\"type\":\"text\",\"text\":\"partial answer\"}" },
    ]);
  });

  it("ignores recognized trace payloads without valid text", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(
      createStreamResponse([
        "data: {\"type\":\"trace\"}\n\n",
        "data: {\"type\":\"trace\",\"text\":123}\n\n",
        "data: {\"type\":\"trace\",\"text\":\"   \"}\n\n",
        "data: {\"type\":\"text\",\"text\":\"Answer\"}\n\n",
      ]) as unknown as Response,
    );

    const provider = createProvider();

    const chunks = await collectStreamTexts(provider);

    expect(chunks).toEqual([
      { type: "text", text: "Answer" },
    ]);
  });

  it("suppresses empty recognized text payloads", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(
      createStreamResponse([
        "data: {\"type\":\"text\",\"text\":\"\"}\n\n",
        "data: {\"type\":\"text\",\"text\":\"Answer\"}\n\n",
      ]) as unknown as Response,
    );

    const provider = createProvider();

    const chunks = await collectStreamTexts(provider);

    expect(chunks).toEqual([
      { type: "text", text: "Answer" },
    ]);
  });

  it("falls back to raw payload for recognized text payloads without string text", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(
      createStreamResponse([
        "data: {\"type\":\"text\"}\n\n",
        "data: {\"type\":\"text\",\"text\":123}\n\n",
      ]) as unknown as Response,
    );

    const provider = createProvider();

    const chunks = await collectStreamTexts(provider);

    expect(chunks).toEqual([
      { type: "text", text: "{\"type\":\"text\"}" },
      { type: "text", text: "{\"type\":\"text\",\"text\":123}" },
    ]);
  });

  it("falls back through legacy extraction for unknown payload types", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(
      createStreamResponse([
        "data: {\"type\":\"status\",\"text\":\"still visible\"}\n\n",
      ]) as unknown as Response,
    );

    const provider = createProvider();

    const chunks = await collectStreamTexts(provider);

    expect(chunks).toEqual([
      { type: "text", text: "still visible" },
    ]);
  });

  it("keeps raw non-JSON payload fallback behavior", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(
      createStreamResponse([
        "data: not-json\n\n",
      ]) as unknown as Response,
    );

    const provider = createProvider();

    const chunks = await collectStreamTexts(provider);

    expect(chunks).toEqual([
      { type: "text", text: "not-json" },
    ]);
  });

  it("stops on upstream done data markers without yielding them", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(
      createStreamResponse([
        "data: {\"type\":\"text\",\"text\":\"Answer before done\"}\n\n",
        "data: [DONE]\n\n",
        "data: {\"type\":\"text\",\"text\":\"Ignored after done\"}\n\n",
      ]) as unknown as Response,
    );

    const provider = createProvider();

    const chunks = await collectStreamTexts(provider);

    expect(chunks).toEqual([
      { type: "text", text: "Answer before done" },
    ]);
  });

  it("does not emit citation chunks in streaming mode", async () => {
    const payload = JSON.stringify({
      text: "Noi dung {\"start_char\":0,\"end_char\":8,\"resource_type\":\"guideline\"}",
    });

    globalThis.fetch = jest.fn().mockResolvedValue(
      createStreamResponse([
        `data: ${payload}\n\n`,
      ]) as unknown as Response,
    );

    const provider = createProvider();

    const chunks = await collectStreamTexts(provider);

    expect(chunks).toEqual([
      {
        type: "text",
        text: "Noi dung {\"start_char\":0,\"end_char\":8,\"resource_type\":\"guideline\"}",
      },
    ]);
  });

  it("keeps citation-like text untouched in non-streaming mode", async () => {
    const payload = JSON.stringify({
      text: "Noi dung {\"start_char\":0,\"end_char\":8,\"resource_type\":\"guideline\"}",
    });

    globalThis.fetch = jest.fn().mockResolvedValue(
      createStreamResponse([
        `data: ${payload}\n\n`,
      ]) as unknown as Response,
    );

    const provider = createProvider();

    const result = await provider.generateResponse([
      { role: "user", content: "Hi" },
    ], false);

    expect("content" in result && result.content).toBe(
      "Noi dung {\"start_char\":0,\"end_char\":8,\"resource_type\":\"guideline\"}",
    );
  });

  it("stops on upstream done events without yielding them", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(
      createStreamResponse([
        "data: {\"text\":\"Answer before done\"}\n\n",
        "event: done\ndata: finished\n\n",
        "data: {\"text\":\"Ignored after done\"}\n\n",
      ]) as unknown as Response,
    );

    const provider = createProvider();

    const chunks = await collectStreamTexts(provider);

    expect(chunks).toEqual([
      { type: "text", text: "Answer before done" },
    ]);
  });
});
