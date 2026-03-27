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

export interface ReferenceHeading {
  sectionId: number;
  heading: string;
  sectionPath: string | null;
  startPage: number | null;
  level: number | null;
}

export interface ReferenceMetadata {
  chunkId: number;
  guidelineId?: number;
  guidelineTitle?: string;
  versionId?: number;
  versionLabel?: string;
  sectionId?: number;
  headings: ReferenceHeading[];
  deepestHeading?: string;
  sectionPath?: string;
  startPage?: number;
  documentId?: number;
  pdfPage?: number;
}

// Citation parsed from assistant output and optionally hydrated with backend metadata
export interface Citation {
  chunkId: number;
  excerpt: string;
  reference?: ReferenceMetadata;
}

// Streaming chunk from SSE response
export interface StreamChunk {
  text?: string;
}
