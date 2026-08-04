export const SSE_ERROR_FALLBACK_MESSAGE = "Khong the xu ly yeu cau luc nay";

export interface SseEventBlock {
  event: string;
  data: string;
}

export function resolveSseErrorMessage(data: string): string {
  const message = data.trim();
  return message || SSE_ERROR_FALLBACK_MESSAGE;
}

export function getCompleteSseBlocks(buffer: string): {
  blocks: string[];
  remainder: string;
} {
  const normalized = buffer.replace(/\r\n/g, "\n");
  const segments = normalized.split("\n\n");

  return {
    blocks: segments.slice(0, -1).filter(Boolean),
    remainder: segments.at(-1) ?? "",
  };
}

export function parseSseBlock(block: string): SseEventBlock {
  let event = "message";
  const dataLines: string[] = [];

  for (const rawLine of block.split("\n")) {
    const line = rawLine.trim();

    if (!line || line.startsWith(":")) {
      continue;
    }

    if (line.startsWith("event:")) {
      event = line.slice(6).trim() || "message";
      continue;
    }

    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  return {
    event,
    data: dataLines.join("\n"),
  };
}
