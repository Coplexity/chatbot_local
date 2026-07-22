import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { MessageEntity } from "../entities/message.entity";

@Injectable()
export class MessageRepository extends Repository<MessageEntity> {
  constructor(private dataSource: DataSource) {
    super(MessageEntity, dataSource.createEntityManager());
  }

  async findByConversationId(conversationId: string, limit?: number) {
    const queryBuilder = this.createQueryBuilder("message")
      .where("message.conversationId = :conversationId", { conversationId })
      .orderBy("message.createdAt", "DESC");

    if (limit) {
      queryBuilder.take(limit);
    }

    const messages = await queryBuilder.getMany();
    return messages.reverse(); // Return in ascending order
  }

  async searchMessages(
    userId: string,
    keyword: string,
    filters: {
      conversationId?: string;
      startDate?: string;
      endDate?: string;
    },
    page: number,
    limit: number,
  ) {
    const queryBuilder = this.createQueryBuilder("message")
      .innerJoin("message.conversation", "conversation")
      .where("conversation.userId = :userId", { userId })
      .andWhere("conversation.deletedAt IS NULL")
      .andWhere("message.content ILIKE :keyword", { keyword: `%${keyword}%` });

    if (filters.conversationId) {
      queryBuilder.andWhere("message.conversationId = :conversationId", {
        conversationId: filters.conversationId,
      });
    }

    if (filters.startDate) {
      queryBuilder.andWhere("message.createdAt >= :startDate", {
        startDate: filters.startDate,
      });
    }

    if (filters.endDate) {
      queryBuilder.andWhere("message.createdAt <= :endDate", {
        endDate: filters.endDate,
      });
    }

    queryBuilder
      .orderBy("message.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
    };
  }

  async getTotalTokensByConversationId(conversationId: string): Promise<number> {
    const result = await this.createQueryBuilder("message")
      .select("SUM(message.tokenCount)", "total")
      .where("message.conversationId = :conversationId", { conversationId })
      .getRawOne();

    return Number.parseInt(result?.total || "0", 10);
  }
}
