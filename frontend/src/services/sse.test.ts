import { describe, expect, it } from "vitest";

import {
  SSE_ERROR_FALLBACK_MESSAGE,
  getCompleteSseBlocks,
  parseSseBlock,
  resolveSseErrorMessage,
} from "./sse";

describe("getCompleteSseBlocks", () => {
  it("returns parsed blocks and preserves trailing partial content", () => {
    expect(
      getCompleteSseBlocks('data: {"text":"Hello"}\n\nevent: err')
    ).toEqual({
      blocks: ['data: {"text":"Hello"}'],
      remainder: "event: err",
    });
  });
});

describe("parseSseBlock", () => {
  it("parses a default message block", () => {
    expect(parseSseBlock('data: {"text":"Hello"}')).toEqual({
      event: "message",
      data: '{"text":"Hello"}',
    });
  });

  it("parses an error event block", () => {
    expect(
      parseSseBlock(
        "id: 1\nevent: error\ndata: AI4Life API error: Unprocessable Entity"
      )
    ).toEqual({
      event: "error",
      data: "AI4Life API error: Unprocessable Entity",
    });
  });
});

describe("resolveSseErrorMessage", () => {
  it("returns the server message when present", () => {
    expect(resolveSseErrorMessage("AI4Life API error: Unprocessable Entity")).toBe(
      "AI4Life API error: Unprocessable Entity"
    );
  });

  it("falls back when the payload is empty", () => {
    expect(resolveSseErrorMessage("   ")).toBe(SSE_ERROR_FALLBACK_MESSAGE);
  });
});
