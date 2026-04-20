import { Injectable } from "@nestjs/common";
import { DataSource, Repository, IsNull } from "typeorm";
import { ConversationEntity } from "../entities/conversation.entity";

@Injectable()
export class ConversationRepository extends Repository<ConversationEntity> {
  constructor(private dataSource: DataSource) {
    super(ConversationEntity, dataSource.createEntityManager());
  }

  async findByUserId(
    userId: string,
    page: number,
    limit: number,
    search?: string,
  ) {
    const queryBuilder = this.createQueryBuilder("conversation")
      .where("conversation.userId = :userId", { userId })
      .andWhere("conversation.deletedAt IS NULL")
      .orderBy("conversation.updatedAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      queryBuilder.andWhere("conversation.title ILIKE :search", {
        search: `%${search}%`,
      });
    }

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
    };
  }

  async findByIdAndUserId(id: string, userId: string) {
    return this.findOne({
      where: { id, userId, deletedAt: IsNull() },
      relations: ["messages"],
      order: {
        messages: {
          createdAt: "ASC",
        },
      },
    });
  }

  async softDeleteByIdAndUserId(id: string, userId: string) {
    return this.softDelete({ id, userId });
  }
}
