import { describe, expect, it } from "vitest";

import { parseTextAndCitations } from "./citation-parser";

describe("parseTextAndCitations", () => {
  it("removes a single inline citation object and appends a marker to prior text", () => {
    expect(
      parseTextAndCitations(
        'abc {"chunk_id": "123", "used_text": "quoted text"} xyz'
      )
    ).toEqual({
      textWithMarkers: "abc[1] xyz",
      cleanedText: "abc xyz",
      citations: [
        {
          chunkId: 123,
          excerpt: "quoted text",
        },
      ],
    });
  });

  it("keeps repeated inline chunk ids as distinct citations when excerpts differ", () => {
    expect(
      parseTextAndCitations(
        [
          'Alpha {"chunk_id": "123", "used_text": "Text A"}',
          'and Beta {"chunk_id": "123", "used_text": "Text B"}',
        ].join(" ")
      )
    ).toEqual({
      textWithMarkers: "Alpha[1] and Beta[2]",
      cleanedText: "Alpha and Beta",
      citations: [
        {
          chunkId: 123,
          excerpt: "Text A",
        },
        {
          chunkId: 123,
          excerpt: "Text B",
        },
      ],
    });
  });

  it("numbers multiple inline citations by first appearance order", () => {
    expect(
      parseTextAndCitations(
        'Alpha {"chunk_id": "123", "used_text": "Text A"} Beta {"chunk_id": "456", "used_text": "Text B"}'
      )
    ).toEqual({
      textWithMarkers: "Alpha[1] Beta[2]",
      cleanedText: "Alpha Beta",
      citations: [
        {
          chunkId: 123,
          excerpt: "Text A",
        },
        {
          chunkId: 456,
          excerpt: "Text B",
        },
      ],
    });
  });

  it("appends consecutive inline citations to the same visible text segment", () => {
    expect(
      parseTextAndCitations(
        'Alpha {"chunk_id": "123", "used_text": "Text A"}{"chunk_id": "456", "used_text": "Text B"}'
      )
    ).toEqual({
      textWithMarkers: "Alpha[1][2]",
      cleanedText: "Alpha",
      citations: [
        {
          chunkId: 123,
          excerpt: "Text A",
        },
        {
          chunkId: 456,
          excerpt: "Text B",
        },
      ],
    });
  });

  it("leaves invalid inline JSON unchanged", () => {
    expect(
      parseTextAndCitations('abc {"chunk_id": "123", "used_text": } xyz')
    ).toEqual({
      textWithMarkers: 'abc {"chunk_id": "123", "used_text": } xyz',
      cleanedText: 'abc {"chunk_id": "123", "used_text": } xyz',
      citations: [],
    });
  });

  it("does not attach a marker to earlier lines when the citation starts on a new line", () => {
    expect(
      parseTextAndCitations(
        'Alpha line\n{"chunk_id": "123", "used_text": "Text A"}'
      )
    ).toEqual({
      textWithMarkers: "Alpha line",
      cleanedText: "Alpha line",
      citations: [
        {
          chunkId: 123,
          excerpt: "Text A",
        },
      ],
    });
  });

  it("parses inline citations with escaped characters inside used_text", () => {
    expect(
      parseTextAndCitations(
        String.raw`Alpha {"chunk_id": "123", "used_text": "quoted \"text\" with braces {x}"}`
      )
    ).toEqual({
      textWithMarkers: "Alpha[1]",
      cleanedText: "Alpha",
      citations: [
        {
          chunkId: 123,
          excerpt: 'quoted "text" with braces {x}',
        },
      ],
    });
  });

  it("removes an inline citation at the start of a message without adding a body marker", () => {
    expect(
      parseTextAndCitations('{"chunk_id": "123", "used_text": "Text A"} Alpha')
    ).toEqual({
      textWithMarkers: "Alpha",
      cleanedText: "Alpha",
      citations: [
        {
          chunkId: 123,
          excerpt: "Text A",
        },
      ],
    });
  });

  it("leaves fenced JSON as plain text and does not produce citations", () => {
    expect(
      parseTextAndCitations('```json\n{"chunk_id": "123", "used_text": "quoted text"}\n```')
    ).toEqual({
      textWithMarkers: '```json\n{"chunk_id": "123", "used_text": "quoted text"}\n```',
      cleanedText: '```json\n{"chunk_id": "123", "used_text": "quoted text"}\n```',
      citations: [],
    });
  });

  it("leaves citation-like JSON inside fenced code blocks unchanged", () => {
    expect(
      parseTextAndCitations(
        '```text\n{"chunk_id": "123", "used_text": "quoted text"}\n```'
      )
    ).toEqual({
      textWithMarkers: '```text\n{"chunk_id": "123", "used_text": "quoted text"}\n```',
      cleanedText: '```text\n{"chunk_id": "123", "used_text": "quoted text"}\n```',
      citations: [],
    });
  });

  it("leaves citation-like JSON inside inline code spans unchanged", () => {
    expect(
      parseTextAndCitations(
        '`{"chunk_id": "123", "used_text": "quoted text"}`'
      )
    ).toEqual({
      textWithMarkers: '`{"chunk_id": "123", "used_text": "quoted text"}`',
      cleanedText: '`{"chunk_id": "123", "used_text": "quoted text"}`',
      citations: [],
    });
  });

  it("leaves plain text unchanged when there are no citations", () => {
    expect(parseTextAndCitations("plain text only")).toEqual({
      textWithMarkers: "plain text only",
      cleanedText: "plain text only",
      citations: [],
    });
  });
});
