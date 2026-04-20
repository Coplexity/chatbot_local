import type { Conversation, Message, Citation, MessageMetadata } from "@/types/api-types";
import { MessageRole } from "@/types/api-types";

const GUEST_CONVERSATIONS_KEY = "guest_conversations";
const GUEST_MESSAGES_KEY = "guest_messages";

export interface GuestConversation extends Omit<Conversation, "userId" | "totalTokens" | "maxTokens"> {
  userId: "guest";
  totalTokens: number;
  maxTokens: number;
}

export interface GuestMessage extends Omit<Message, "tokenCount"> {
  tokenCount: number;
  citations?: Citation[];
}

function generateId(): string {
  return `guest-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function getConversations(): GuestConversation[] {
  const stored = localStorage.getItem(GUEST_CONVERSATIONS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

function saveConversations(conversations: GuestConversation[]): void {
  localStorage.setItem(GUEST_CONVERSATIONS_KEY, JSON.stringify(conversations));
}

function getMessages(): Record<string, GuestMessage[]> {
  const stored = localStorage.getItem(GUEST_MESSAGES_KEY);
  if (!stored) return {};
  try {
    return JSON.parse(stored);
  } catch {
    return {};
  }
}

function saveMessages(messages: Record<string, GuestMessage[]>): void {
  localStorage.setItem(GUEST_MESSAGES_KEY, JSON.stringify(messages));
}

export const guestStorageService = {
  getConversations(): GuestConversation[] {
    return getConversations().sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  },

  getConversation(id: string): GuestConversation | null {
    const conversations = getConversations();
    return conversations.find((c) => c.id === id) || null;
  },

  createConversation(title?: string): GuestConversation {
    const now = new Date().toISOString();
    const conversation: GuestConversation = {
      id: generateId(),
      title,
      userId: "guest",
      totalTokens: 0,
      maxTokens: 4096,
      createdAt: now,
      updatedAt: now,
    };

    const conversations = getConversations();
    conversations.push(conversation);
    saveConversations(conversations);

    // Initialize empty messages array for this conversation
    const allMessages = getMessages();
    allMessages[conversation.id] = [];
    saveMessages(allMessages);

    return conversation;
  },

  updateConversationTitle(id: string, title: string): void {
    const conversations = getConversations();
    const index = conversations.findIndex((c) => c.id === id);
    if (index !== -1) {
      conversations[index].title = title;
      conversations[index].updatedAt = new Date().toISOString();
      saveConversations(conversations);
    }
  },

  deleteConversation(id: string): void {
    const conversations = getConversations().filter((c) => c.id !== id);
    saveConversations(conversations);

    const allMessages = getMessages();
    delete allMessages[id];
    saveMessages(allMessages);
  },

  getMessages(conversationId: string): GuestMessage[] {
    const allMessages = getMessages();
    return allMessages[conversationId] || [];
  },

  addMessage(
    conversationId: string,
    role: MessageRole,
    content: string,
    citations?: Citation[],
    metadata?: MessageMetadata
  ): GuestMessage {
    const now = new Date().toISOString();
    const message: GuestMessage = {
      id: generateId(),
      conversationId,
      role,
      content,
      tokenCount: Math.ceil(content.length / 4), // Rough estimate
      createdAt: now,
      updatedAt: now,
      citations,
      metadata,
    };

    const allMessages = getMessages();
    if (!allMessages[conversationId]) {
      allMessages[conversationId] = [];
    }
    allMessages[conversationId].push(message);
    saveMessages(allMessages);

    // Update conversation timestamp
    const conversations = getConversations();
    const convIndex = conversations.findIndex((c) => c.id === conversationId);
    if (convIndex !== -1) {
      conversations[convIndex].updatedAt = now;
      saveConversations(conversations);
    }

    return message;
  },

  // Get all data for migration to user account
  getAllGuestData(): {
    conversations: GuestConversation[];
    messages: Record<string, GuestMessage[]>;
  } {
    return {
      conversations: getConversations(),
      messages: getMessages(),
    };
  },

  // Clear all guest data after migration
  clearAllGuestData(): void {
    localStorage.removeItem(GUEST_CONVERSATIONS_KEY);
    localStorage.removeItem(GUEST_MESSAGES_KEY);
  },

  // Check if there is any guest data to migrate
  hasGuestData(): boolean {
    const conversations = getConversations();
    return conversations.length > 0;
  },
};
