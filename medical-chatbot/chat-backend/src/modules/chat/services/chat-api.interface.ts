export interface ChatApiMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface Citation {
  chuong?: number;
  dieu?: number;
  khoan?: number;
  phu_luc?: number;
  noi_dung_da_su_dung?: string;
  start_char: number;
  end_char: number;
  resource_type?: string;
  resource_content?: string;
}

export interface ChatApiResponse {
  content: string;
  tokenCount: number;
}

export type ChatApiStreamChunk
  = | { type: "text"; text: string }
    | { type: "trace"; trace: string };

export interface ChatApiStreamResponse {
  stream: AsyncIterable<ChatApiStreamChunk>;
  totalTokens: number;
}
