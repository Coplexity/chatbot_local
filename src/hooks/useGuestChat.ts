import { useAuth } from "@/contexts/AuthContext";
import { chatService } from "@/services/chat.service";
import { guestStorageService } from "@/services/guest-storage.service";
import { Conversation, Message, StreamChunk, MessageRole } from "@/types/api-types";
import { api } from "@/services/api";

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

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body reader available");
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let fullResponse = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;
          if (trimmedLine === "data: [DONE]") {
            // Save assistant response to local storage
            if (fullResponse) {
              guestStorageService.addMessage(
                conversationId,
                MessageRole.ASSISTANT,
                fullResponse
              );
            }
            return;
          }

          if (trimmedLine.startsWith("data: ")) {
            try {
              const jsonStr = trimmedLine.substring(6);
              const data = JSON.parse(jsonStr) as StreamChunk;

              if (data.text) {
                fullResponse += data.text;
              }

              if ((data.text && data.text.length > 0) || data.citation) {
                yield { text: data.text, citation: data.citation };
              }
            } catch {
              // Skip invalid JSON lines
            }
          }
        }
      }

      // Save any remaining response
      if (fullResponse) {
        guestStorageService.addMessage(
          conversationId,
          MessageRole.ASSISTANT,
          fullResponse
        );
      }
    } finally {
      reader.releaseLock();
    }
  }

  // Guest start conversation streaming
  async function* startConversationStreamGuest(
    content: string
  ): AsyncGenerator<
    { type: "conversation"; conversationId: string } | { type: "text"; text: string }
  > {
    // Create local conversation first
    const conversation = guestStorageService.createConversation();

    // Add user message
    guestStorageService.addMessage(conversation.id, MessageRole.USER, content);

    // Yield conversation ID
    yield { type: "conversation", conversationId: conversation.id };

    // Call API for AI response
    const response = await api.fetchStream("/chat/guest/stream", { content });

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body reader available");
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let fullResponse = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;
          if (trimmedLine === "data: [DONE]") {
            if (fullResponse) {
              guestStorageService.addMessage(
                conversation.id,
                MessageRole.ASSISTANT,
                fullResponse
              );
              // Update title based on first message
              const title = content.slice(0, 50) + (content.length > 50 ? "..." : "");
              guestStorageService.updateConversationTitle(conversation.id, title);
            }
            return;
          }

          if (trimmedLine.startsWith("data: ")) {
            try {
              const jsonStr = trimmedLine.substring(6);
              const data = JSON.parse(jsonStr);

              if (data.type === "text" && data.text && data.text.length > 0) {
                fullResponse += data.text;
                yield { type: "text", text: data.text };
              } else if (data.text) {
                fullResponse += data.text;
                yield { type: "text", text: data.text };
              }
            } catch {
              // Skip invalid JSON lines
            }
          }
        }
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
    } finally {
      reader.releaseLock();
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

  return {
    isGuest,
    isAuthenticated,
    getConversations,
    getMessages,
    createConversation,
    deleteConversation,
    sendMessageStream,
    startConversationStream,
  };
}
