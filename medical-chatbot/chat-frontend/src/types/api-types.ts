// API Response Types matching backend DTOs

export enum UserRole {
  NONE = "",
  NHAN_VIEN_Y_TE = "nhan_vien_y_te",
  BAC_SI_TRAM_Y_TE = "bac_si_tram_y_te",
  BAC_SI_BENH_VIEN_CHUYEN_SAU = "bac_si_benh_vien_chuyen_sau",
}

export interface User {
  id: string;
  documentUserId: string | null;
  fullName: string | null;
  email: string;
  role: UserRole;
  isActive: boolean;
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
  fullName: string;
  email: string;
  password: string;
}

export enum MessageRole {
  USER = "user",
  ASSISTANT = "assistant",
  SYSTEM = "system",
}

export interface MessageMetadata {
  thinking?: string[];
  [key: string]: unknown;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  tokenCount: number;
  metadata?: MessageMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  title?: string;
  userId: string;
  totalTokens: number;
  maxTokens: number;
  metadata?: Record<string, unknown>;
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
  mode?: "basic" | "deep";
  role?: UserRole;
  user_ids?: string[];
}

export interface UserAncestor {
  id: string;
  fullName: string | null;
  email: string;
  role: UserRole;
  isActive: boolean;
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

// Streaming chunks from SSE response
export type StreamChunk =
  | { type: "text"; text: string }
  | { type: "trace"; trace: string };
