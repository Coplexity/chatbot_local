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
 * Parse text and extract fenced JSON citations.
 * Citation blocks look like ```json {"chunk_id": "123", "used_text": "quoted text"} ```
 * Returns text with markers appended to visible quoted text.
 */
export function parseTextAndCitations(text: string): ParsedTextWithCitations {
  const citations: Citation[] = [];
  const markerByChunkId = new Map<number, number>();
  const fencedJsonRegex = /```json\s*([\s\S]*?)\s*```/g;

  const textWithMarkers = text.replace(fencedJsonRegex, (block: string, jsonContent: string) => {
    const parsedCitation = parseCitationBlock(jsonContent);

    if (!parsedCitation) {
      return block;
    }

    let markerIndex = markerByChunkId.get(parsedCitation.chunkId);

    if (!markerIndex) {
      markerIndex = citations.length + 1;
      markerByChunkId.set(parsedCitation.chunkId, markerIndex);
      citations.push(parsedCitation);
    }

    return `${parsedCitation.excerpt}[${markerIndex}]`;
  });

  const cleanedText = text.replace(fencedJsonRegex, (block: string, jsonContent: string) => {
    const parsedCitation = parseCitationBlock(jsonContent);
    return parsedCitation ? parsedCitation.excerpt : block;
  });

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
