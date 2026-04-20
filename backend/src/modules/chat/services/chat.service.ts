import { Injectable, NotFoundException } from "@nestjs/common";
import { ConversationRepository } from "../repositories/conversation.repository";
import { MessageRepository } from "../repositories/message.repository";
import { CreateConversationDto } from "../dtos/create-conversation.dto";
import { ConversationEntity } from "../entities/conversation.entity";
import { DataSource } from "typeorm";

@Injectable()
export class ChatService {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly messageRepository: MessageRepository,
    private readonly dataSource: DataSource,
  ) {}

  async createConversation(
    userId: string,
    dto: CreateConversationDto,
  ): Promise<ConversationEntity> {
    const conversation = this.conversationRepository.create({
      userId,
      title: dto.title || "New Conversation",
      totalTokens: 0,
      maxTokens: 4000,
    });

    return this.conversationRepository.save(conversation);
  }

  async getConversations(userId: string, page: number, limit: number, search?: string) {
    const { items, total } = await this.conversationRepository.findByUserId(
      userId,
      page,
      limit,
      search,
    );

    return {
      items,
      pagination: {
        page,
        pageSize: limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getConversationById(id: string, userId: string): Promise<ConversationEntity> {
    const conversation = await this.conversationRepository.findByIdAndUserId(
      id,
      userId,
    );

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    return conversation;
  }

  async deleteConversation(id: string, userId: string): Promise<void> {
    const conversation = await this.conversationRepository.findByIdAndUserId(
      id,
      userId,
    );

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    await this.conversationRepository.softDeleteByIdAndUserId(id, userId);
  }

  async getConversationMessages(conversationId: string, userId: string) {
    const conversation = await this.getConversationById(conversationId, userId);
    const messages = await this.messageRepository.findByConversationId(
      conversationId,
    );

    return {
      conversation,
      messages,
    };
  }

  async updateConversationTokens(conversationId: string): Promise<void> {
    const totalTokens
      = await this.messageRepository.getTotalTokensByConversationId(conversationId);

    await this.conversationRepository.update(conversationId, { totalTokens });
  }

  async getRecentMessagesForContext(
    conversationId: string,
    maxTokens: number,
  ): Promise<Array<{ role: "user" | "assistant" | "system"; content: string }>> {
    const messages = await this.messageRepository.findByConversationId(
      conversationId,
    );

    const contextMessages: Array<{
      role: "user" | "assistant" | "system";
      content: string;
    }> = [];
    let currentTokens = 0;

    // Include messages from most recent, staying within token limit
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (currentTokens + msg.tokenCount > maxTokens) {
        break;
      }
      contextMessages.unshift({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
      });
      currentTokens += msg.tokenCount;
    }

    return contextMessages;
  }
}
