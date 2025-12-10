import type { Citation } from "@/types/api-types";

/**
 * Parsed result containing text with citation markers and citation data
 */
export interface ParsedTextWithCitations {
  /** Text with JSON replaced by [1], [2] markers */
  textWithMarkers: string;
  /** Original text with JSON removed (for display without markers) */
  cleanedText: string;
  /** Extracted citations in order they appear */
  citations: Citation[];
}

/**
 * Parse text and extract inline JSON citations
 * Citations appear as JSON objects in the text with start_char/end_char fields
 * Returns text with markers [1], [2] replacing JSON, and array of extracted citations
 */
export function parseTextAndCitations(text: string): ParsedTextWithCitations {
  const citations: Citation[] = [];
  let textWithMarkers = text;
  let cleanedText = text;

  // Regular expression to match JSON objects that look like citations
  const jsonRegex = /\{(?:[^{}]|"(?:\\.|[^"\\])*")*\}/g;

  const matches = Array.from(text.matchAll(jsonRegex));

  // Sort matches by position to ensure consistent numbering
  matches.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

  for (const match of matches) {
    try {
      const citationJson = match[0];
      const citation = JSON.parse(citationJson) as Citation;
      citations.push(citation);
      const markerIndex = citations.length;
      // Replace the citation JSON with numbered marker [n]
      textWithMarkers = textWithMarkers.replace(citationJson, `[${markerIndex}]`);
      
      // Remove the citation JSON from clean text
      cleanedText = cleanedText.replace(citationJson, "");
    } catch {
      // Not a valid citation JSON, skip
    }
  }

  // Clean up extra whitespace but preserve newlines for proper formatting
  cleanedText = cleanedText
    .split('\n')
    .map(line => line.replace(/  +/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');

  textWithMarkers = textWithMarkers
    .split('\n')
    .map(line => line.replace(/  +/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');

  return {
    textWithMarkers,
    cleanedText,
    citations,
  };
}

/**
 * Format citation for display as inline marker
 * Returns string like "Điều 1, Khoản 2" or "Phụ lục 9"
 */
export function formatCitationLabel(citation: Citation): string {
  const parts: string[] = [];

  if (citation.chuong !== undefined && citation.chuong !== null) {
    parts.push(`Chương ${citation.chuong}`);
  }
  if (citation.dieu !== undefined && citation.dieu !== null) {
    parts.push(`Điều ${citation.dieu}`);
  }
  if (citation.khoan !== undefined && citation.khoan !== null) {
    parts.push(`Khoản ${citation.khoan}`);
  }
  if (citation.phu_luc !== undefined && citation.phu_luc !== null) {
    parts.push(`Phụ lục ${citation.phu_luc}`);
  }

  return parts.length > 0 ? parts.join(", ") : "Tham chiếu";
}

/**
 * Create Reference from Citation with display properties
 */
export function citationToReference(
  citation: Citation,
  index: number
): { id: string; number: number } & Citation {
  return {
    id: `citation-${index}-${citation.start_char}`,
    number: index + 1,
    ...citation,
  };
}
