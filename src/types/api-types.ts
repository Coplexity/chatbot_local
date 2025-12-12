// API Response Types matching backend DTOs

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface SignInRequest {
  username: string;
  password: string;
}

export interface SignUpRequest {
  name: string;
  email: string;
  username: string;
  password: string;
}

export enum MessageRole {
  USER = "user",
  ASSISTANT = "assistant",
  SYSTEM = "system",
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  tokenCount: number;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  title?: string;
  userId: string;
  totalTokens: number;
  maxTokens: number;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface CreateConversationRequest {
  title?: string;
}

export interface SendMessageRequest {
  content: string;
}

export interface SendMessageResponse {
  userMessage: Message;
  assistantMessage: Message;
}

export interface SearchMessageParams {
  keyword: string;
  conversationId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// Citation from AI response (matches backend Citation interface)
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

// Streaming chunk from SSE response
export interface StreamChunk {
  text?: string;
  citation?: Citation;
}

