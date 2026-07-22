import type { Citation } from "@/types/api-types";

/**
 * Parsed result containing text with citation markers and citation data
 */
export interface ParsedTextWithCitations {
  /** Text with source tags rendered as visible text plus [n] markers */
  textWithMarkers: string;
  /** Text with source tags stripped but without inline markers */
  cleanedText: string;
  /** Extracted citations in order they appear */
  citations: Citation[];
}

/**
 * Parse text and extract inline JSON citations.
 * Citation objects look like {"chunk_id": "123", "used_text": "quoted text"}.
 */
export function parseTextAndCitations(text: string): ParsedTextWithCitations {
  const citations: Citation[] = [];
  const markerByCitation = new Map<string, number>();
  let textWithMarkers = "";
  let cleanedText = "";
  let index = 0;

  while (index < text.length) {
    const codeFenceRange = getCodeFenceRange(text, index);

    if (codeFenceRange) {
      const content = text.slice(index, codeFenceRange.end);
      textWithMarkers += content;
      cleanedText += content;
      index = codeFenceRange.end;
      continue;
    }

    const inlineCodeRange = getInlineCodeRange(text, index);

    if (inlineCodeRange) {
      const content = text.slice(index, inlineCodeRange.end);
      textWithMarkers += content;
      cleanedText += content;
      index = inlineCodeRange.end;
      continue;
    }

    const citationMatch = getInlineCitationMatch(text, index);

    if (citationMatch) {
      const markerIndex = getMarkerIndex(citationMatch.citation, citations, markerByCitation);
      cleanedText = stripTrailingCitationSpacing(cleanedText);
      textWithMarkers = attachMarker(textWithMarkers, markerIndex);
      index = citationMatch.end;
      continue;
    }

    const character = text[index];
    textWithMarkers += character;
    cleanedText += character;
    index += 1;
  }

  return {
    textWithMarkers: normalizeSpacing(textWithMarkers),
    cleanedText: normalizeSpacing(cleanedText),
    citations,
  };
}

function parseCitationBlock(jsonContent: string): Citation | null {
  try {
    const parsed = JSON.parse(jsonContent) as {
      chunk_id?: string | number;
      used_text?: string;
    };

    const chunkId = Number.parseInt(String(parsed.chunk_id ?? ""), 10);
    const excerpt = parsed.used_text?.trim();

    if (!Number.isFinite(chunkId) || !excerpt) {
      return null;
    }

    return {
      chunkId,
      excerpt,
    };
  } catch {
    return null;
  }
}

function getInlineCitationMatch(
  text: string,
  start: number
): { end: number; citation: Citation } | null {
  if (text[start] !== "{") {
    return null;
  }

  const end = findJsonObjectEnd(text, start);

  if (end === null) {
    return null;
  }

  const candidate = text.slice(start, end);

  if (!candidate.includes('"chunk_id"') || !candidate.includes('"used_text"')) {
    return null;
  }

  const citation = parseCitationBlock(candidate);

  if (!citation) {
    return null;
  }

  return {
    end,
    citation,
  };
}

function findJsonObjectEnd(text: string, start: number): number | null {
  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let index = start; index < text.length; index += 1) {
    const character = text[index];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
        continue;
      }

      if (character === "\\") {
        isEscaped = true;
        continue;
      }

      if (character === '"') {
        inString = false;
      }

      continue;
    }

    if (character === '"') {
      inString = true;
      continue;
    }

    if (character === "{") {
      depth += 1;
      continue;
    }

    if (character === "}") {
      depth -= 1;

      if (depth === 0) {
        return index + 1;
      }
    }
  }

  return null;
}

function getMarkerIndex(
  citation: Citation,
  citations: Citation[],
  markerByCitation: Map<string, number>
): number {
  const markerKey = `${citation.chunkId}:${citation.excerpt}`;
  let markerIndex = markerByCitation.get(markerKey);

  if (!markerIndex) {
    markerIndex = citations.length + 1;
    markerByCitation.set(markerKey, markerIndex);
    citations.push(citation);
  }

  return markerIndex;
}

function stripTrailingInlineWhitespace(text: string): string {
  return text.replace(/[ \t]+$/u, "");
}

function stripTrailingCitationSpacing(text: string): string {
  return text.replace(/[ \t]*\n[ \t]*$/u, "").replace(/[ \t]+$/u, "");
}

function attachMarker(text: string, markerIndex: number): string {
  const lastNewlineIndex = text.lastIndexOf("\n");
  const lineStart = lastNewlineIndex + 1;
  const currentLine = text.slice(lineStart);

  if (!currentLine.trim()) {
    return stripTrailingCitationSpacing(text);
  }

  return `${stripTrailingInlineWhitespace(text)}[${markerIndex}]`;
}

function getCodeFenceRange(text: string, start: number): { end: number } | null {
  if (!text.startsWith("```", start)) {
    return null;
  }

  const closingIndex = text.indexOf("```", start + 3);

  if (closingIndex === -1) {
    return { end: text.length };
  }

  return { end: closingIndex + 3 };
}

function getInlineCodeRange(text: string, start: number): { end: number } | null {
  if (text[start] !== "`") {
    return null;
  }

  const closingIndex = text.indexOf("`", start + 1);

  if (closingIndex === -1) {
    return { end: text.length };
  }

  return { end: closingIndex + 1 };
}

function normalizeSpacing(text: string): string {
  return text
    .split("\n")
    .map(line => line.replace(/  +/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

/**
 * Format citation for display as inline marker.
 * Prefers the deepest heading, then guideline title, then excerpt.
 */
export function formatCitationLabel(citation: Citation): string {
  return (
    citation.reference?.deepestHeading
    || citation.reference?.guidelineTitle
    || citation.excerpt
    || "Tham chiếu"
  );
}

/**
 * Create Reference from Citation with display properties.
 */
export function citationToReference(
  citation: Citation,
  index: number
): { id: string; number: number } & Citation {
  return {
    id: `citation-${index}-${citation.chunkId}`,
    number: index + 1,
    ...citation,
  };
}
