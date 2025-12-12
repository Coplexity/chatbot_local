import { api } from "./api";
import type {
  Conversation,
  CreateConversationRequest,
  Message,
  PaginatedResponse,
  SearchMessageParams,
  SendMessageRequest,
  SendMessageResponse,
  StreamChunk,
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
   * Send a message with streaming response
   * Yields text chunks and citations as they arrive from SSE stream
   */
  async *sendMessageStream(
    conversationId: string,
    content: string
  ): AsyncGenerator<StreamChunk> {
    const response = await api.fetchStream(
      `/chat/conversations/${conversationId}/messages/stream`,
      { content }
    );

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body reader available");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        // Keep the last incomplete line in buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;
          if (trimmedLine === "data: [DONE]") return;

          if (trimmedLine.startsWith("data: ")) {
            try {
              const jsonStr = trimmedLine.substring(6);
              const data = JSON.parse(jsonStr) as StreamChunk;

              if ((data.text && data.text.length > 0) || data.citation) {
                yield { text: data.text, citation: data.citation};
              }
            } catch {
              // Skip invalid JSON lines
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
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
   * Start a new conversation with streaming first response
   * Yields conversation info first, then text chunks
   */
  async *startConversationStream(
    content: string
  ): AsyncGenerator<{ type: "conversation"; conversationId: string } | { type: "text"; text: string }> {
    const response = await api.fetchStream(
      "/chat/conversations/start/stream",
      { content }
    );

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body reader available");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        // Keep the last incomplete line in buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;
          if (trimmedLine === "data: [DONE]") return;

          if (trimmedLine.startsWith("data: ")) {
            try {
              const jsonStr = trimmedLine.substring(6);
              const data = JSON.parse(jsonStr);

              if (data.type === "conversation") {
                yield { type: "conversation", conversationId: data.conversationId };
              } else if (data.type === "text" && data.text && data.text.length > 0) {
                yield { type: "text", text: data.text };
              }
            } catch {
              // Skip invalid JSON lines
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
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

