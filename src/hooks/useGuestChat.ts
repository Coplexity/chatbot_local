import { useAuth } from "@/contexts/AuthContext";
import { chatService } from "@/services/chat.service";
import { guestStorageService } from "@/services/guest-storage.service";
import { Conversation, Message, ReferenceMetadata, StreamChunk, MessageRole } from "@/types/api-types";
import { api } from "@/services/api";
import {
  getCompleteSseBlocks,
  parseSseBlock,
  resolveSseErrorMessage,
} from "@/services/sse";

type GuestStartConversationChunk =
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

export function useGuestChat() {
  const { isGuest, isAuthenticated } = useAuth();

  const getConversations = async (
    page: number = 1,
    limit: number = 20,
    search?: string
  ) => {
    if (isGuest) {
      const conversations = guestStorageService.getConversations();
      const filtered = search
        ? conversations.filter((c) =>
            c.title?.toLowerCase().includes(search.toLowerCase())
          )
        : conversations;
      return {
        items: filtered.slice((page - 1) * limit, page * limit) as Conversation[],
        pagination: {
          page,
          limit,
          total: filtered.length,
          totalPages: Math.ceil(filtered.length / limit),
        },
      };
    }
    return chatService.getConversations(page, limit, search);
  };

  const getMessages = async (conversationId: string) => {
    if (isGuest) {
      const conversation = guestStorageService.getConversation(conversationId);
      const messages = guestStorageService.getMessages(conversationId);
      return {
        conversation: conversation as Conversation | null,
        messages: messages as Message[],
      };
    }
    return chatService.getMessages(conversationId);
  };

  const createConversation = async (title?: string) => {
    if (isGuest) {
      return guestStorageService.createConversation(title) as Conversation;
    }
    return chatService.createConversation({ title });
  };

  const deleteConversation = async (id: string) => {
    if (isGuest) {
      guestStorageService.deleteConversation(id);
      return;
    }
    return chatService.deleteConversation(id);
  };

  // Guest streaming - calls API directly without auth, stores locally
  async function* sendMessageStreamGuest(
    conversationId: string,
    content: string
  ): AsyncGenerator<StreamChunk> {
    // Get existing messages for context
    const existingMessages = guestStorageService.getMessages(conversationId);
    const context = existingMessages.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

    // Add user message to local storage
    guestStorageService.addMessage(conversationId, MessageRole.USER, content);

    // Call guest API with context
    const response = await api.fetchStream("/chat/guest/stream/with-context", {
      content,
      context,
    });

    let fullResponse = "";

    for await (const chunk of readSseStream<StreamChunk>(response, ({ data }) => {
      try {
        const parsed = JSON.parse(data) as StreamChunk;

        if (parsed.text) {
          fullResponse += parsed.text;
        }

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

    if (fullResponse) {
      guestStorageService.addMessage(
        conversationId,
        MessageRole.ASSISTANT,
        fullResponse
      );
    }
  }

  // Guest start conversation streaming
  async function* startConversationStreamGuest(
    content: string
  ): AsyncGenerator<GuestStartConversationChunk> {
    // Create local conversation first
    const conversation = guestStorageService.createConversation();

    // Add user message
    guestStorageService.addMessage(conversation.id, MessageRole.USER, content);

    // Yield conversation ID
    yield { type: "conversation", conversationId: conversation.id };

    // Call API for AI response
    const response = await api.fetchStream("/chat/guest/stream", { content });

    let fullResponse = "";

    for await (const chunk of readSseStream<GuestStartConversationChunk>(response, ({ data }) => {
      try {
        const parsed = JSON.parse(data);

        if (parsed.type === "text" && parsed.text && parsed.text.length > 0) {
          fullResponse += parsed.text;
          return { type: "text", text: parsed.text };
        }

        if (parsed.text) {
          fullResponse += parsed.text;
          return { type: "text", text: parsed.text };
        }
      } catch {
        // Skip invalid JSON payloads
      }

      return null;
    })) {
      yield chunk;
    }

    if (fullResponse) {
      guestStorageService.addMessage(
        conversation.id,
        MessageRole.ASSISTANT,
        fullResponse
      );
      const title = content.slice(0, 50) + (content.length > 50 ? "..." : "");
      guestStorageService.updateConversationTitle(conversation.id, title);
    }
  }

  const sendMessageStream = (conversationId: string, content: string) => {
    if (isGuest) {
      return sendMessageStreamGuest(conversationId, content);
    }
    return chatService.sendMessageStream(conversationId, content);
  };

  const startConversationStream = (content: string) => {
    if (isGuest) {
      return startConversationStreamGuest(content);
    }
    return chatService.startConversationStream(content);
  };

  const getReferenceMetadata = async (chunkIds: number[]): Promise<ReferenceMetadata[]> => {
    return chatService.getReferenceMetadata(chunkIds);
  };

  return {
    isGuest,
    isAuthenticated,
    getConversations,
    getMessages,
    createConversation,
    deleteConversation,
    sendMessageStream,
    startConversationStream,
    getReferenceMetadata,
  };
}
