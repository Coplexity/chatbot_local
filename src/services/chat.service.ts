import { api } from "./api";
import type {
  Conversation,
  CreateConversationRequest,
  Message,
  PaginatedResponse,
  SearchMessageParams,
  SendMessageRequest,
  SendMessageResponse,
} from "@/types/api-types";

export const chatService = {
  /**
   * Get all conversations for current user
   */
  async getConversations(
    page: number = 1,
    limit: number = 20,
    search?: string
  ): Promise<PaginatedResponse<Conversation>> {
    return api.get<PaginatedResponse<Conversation>>("/chat/conversations", {
      params: { page, limit, search },
    });
  },

  /**
   * Get a specific conversation with messages
   */
  async getConversation(id: string): Promise<Conversation> {
    return api.get<Conversation>(`/chat/conversations/${id}`);
  },

  /**
   * Create a new conversation
   */
  async createConversation(
    data: CreateConversationRequest = {}
  ): Promise<Conversation> {
    return api.post<Conversation>("/chat/conversations", data);
  },

  /**
   * Delete a conversation (soft delete)
   */
  async deleteConversation(id: string): Promise<void> {
    return api.delete<void>(`/chat/conversations/${id}`);
  },

  /**
   * Get all messages in a conversation
   */
  async getMessages(
    conversationId: string
  ): Promise<{ conversation: Conversation; messages: Message[] }> {
    return api.get<{ conversation: Conversation; messages: Message[] }>(
      `/chat/conversations/${conversationId}/messages`
    );
  },

  /**
   * Send a message in a conversation
   */
  async sendMessage(
    conversationId: string,
    data: SendMessageRequest
  ): Promise<SendMessageResponse> {
    return api.post<SendMessageResponse>(
      `/chat/conversations/${conversationId}/messages`,
      data
    );
  },

  /**
   * Send a message with streaming response (SSE)
   * Returns EventSource for listening to streaming chunks
   */
  createMessageStream(
    conversationId: string,
    content: string
  ): EventSource {
    return api.createEventSource(
      `/chat/conversations/${conversationId}/messages/stream`,
      { content }
    );
  },

  /**
   * Search messages across conversations
   */
  async searchMessages(
    params: SearchMessageParams
  ): Promise<PaginatedResponse<Message>> {
    return api.get<PaginatedResponse<Message>>("/chat/search/messages", {
      params: params as any,
    });
  },
};
