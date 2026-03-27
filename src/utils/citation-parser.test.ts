import { describe, expect, it } from "vitest";

import { parseTextAndCitations } from "./citation-parser";

describe("parseTextAndCitations", () => {
  it("parses a single source tag into visible text plus marker", () => {
    expect(
      parseTextAndCitations(
        'abc ```json\n{"chunk_id": "123", "used_text": "quoted text"}\n``` xyz'
      )
    ).toEqual({
      textWithMarkers: "abc quoted text[1] xyz",
      cleanedText: "abc quoted text xyz",
      citations: [
        {
          chunkId: 123,
          excerpt: "quoted text",
        },
      ],
    });
  });

  it("reuses marker numbers for repeated chunk ids and keeps the first excerpt", () => {
    expect(
      parseTextAndCitations(
        '```json\n{"chunk_id": "123", "used_text": "Text A"}\n``` and ```json\n{"chunk_id": "123", "used_text": "Text B"}\n```'
      )
    ).toEqual({
      textWithMarkers: "Text A[1] and Text B[1]",
      cleanedText: "Text A and Text B",
      citations: [
        {
          chunkId: 123,
          excerpt: "Text A",
        },
      ],
    });
  });

  it("assigns markers by first appearance order for unique chunk ids", () => {
    expect(
      parseTextAndCitations(
        '```json\n{"chunk_id": "123", "used_text": "Alpha"}\n``` ```json\n{"chunk_id": "456", "used_text": "Beta"}\n```'
      )
    ).toEqual({
      textWithMarkers: "Alpha[1] Beta[2]",
      cleanedText: "Alpha Beta",
      citations: [
        {
          chunkId: 123,
          excerpt: "Alpha",
        },
        {
          chunkId: 456,
          excerpt: "Beta",
        },
      ],
    });
  });

  it("leaves plain text unchanged when there are no source tags", () => {
    expect(parseTextAndCitations("plain text only")).toEqual({
      textWithMarkers: "plain text only",
      cleanedText: "plain text only",
      citations: [],
    });
  });

  it("ignores fenced json blocks that are not citation objects", () => {
    expect(
      parseTextAndCitations('```json\n{"foo": "bar"}\n```')
    ).toEqual({
      textWithMarkers: '```json\n{"foo": "bar"}\n```',
      cleanedText: '```json\n{"foo": "bar"}\n```',
      citations: [],
    });
  });
});
