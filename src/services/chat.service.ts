import { api } from "./api";
import type {
  Conversation,
  CreateConversationRequest,
  Message,
  PaginatedResponse,
  ReferenceMetadata,
  SearchMessageParams,
  SendMessageRequest,
  SendMessageResponse,
  StreamChunk,
} from "@/types/api-types";
import {
  getCompleteSseBlocks,
  parseSseBlock,
  resolveSseErrorMessage,
} from "./sse";

type StartConversationChunk =
  | { type: "conversation"; conversationId: string }
  | { type: "text"; text: string };

async function* readSseStream<T>(
  response: Response,
  mapEvent: (event: { event: string; data: string }) => T | null
): AsyncGenerator<T> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body reader available");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      const { blocks, remainder } = getCompleteSseBlocks(buffer);
      buffer = remainder;

      for (const block of blocks) {
        const event = parseSseBlock(block);

        if (event.data === "[DONE]") {
          return;
        }

        if (event.event === "error") {
          throw new Error(resolveSseErrorMessage(event.data));
        }

        const mapped = mapEvent(event);
        if (mapped !== null) {
          yield mapped;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

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

    for await (const chunk of readSseStream<StreamChunk>(response, ({ data }) => {
      try {
        const parsed = JSON.parse(data) as StreamChunk;

        if (parsed.text && parsed.text.length > 0) {
          return { text: parsed.text };
        }
      } catch {
        // Skip invalid JSON payloads
      }

      return null;
    })) {
      yield chunk;
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
  ): AsyncGenerator<StartConversationChunk> {
    const response = await api.fetchStream(
      "/chat/conversations/start/stream",
      { content }
    );

    for await (const chunk of readSseStream<StartConversationChunk>(response, ({ data }) => {
      try {
        const parsed = JSON.parse(data);

        if (parsed.type === "conversation") {
          return { type: "conversation", conversationId: parsed.conversationId };
        }

        if (parsed.type === "text" && parsed.text && parsed.text.length > 0) {
          return { type: "text", text: parsed.text };
        }
      } catch {
        // Skip invalid JSON payloads
      }

      return null;
    })) {
      yield chunk;
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

  async getReferenceMetadata(chunkIds: number[]): Promise<ReferenceMetadata[]> {
    if (chunkIds.length === 0) {
      return [];
    }

    return api.get<ReferenceMetadata[]>("/chat/references", {
      params: {
        chunkIds: chunkIds.join(","),
      },
    });
  },
};
