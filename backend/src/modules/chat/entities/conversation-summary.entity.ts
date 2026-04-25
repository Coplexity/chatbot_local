import { Column, Entity, Index, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../common/entities/base-entity";
import { ConversationEntity } from "./conversation.entity";

@Entity("conversation_summaries")
@Index(["conversationId", "createdAt"])
export class ConversationSummaryEntity extends BaseEntity {
  @Column({ type: "uuid" })
  conversationId: string;

  @ManyToOne(() => ConversationEntity, conversation => conversation.summaries, {
    onDelete: "CASCADE",
  })
  @JoinColumn()
  conversation: ConversationEntity;

  @Column({ type: "text" })
  summary: string;

  @Column({ type: "int" })
  summarizedMessagesCount: number;

  @Column({ type: "int" })
  tokenCount: number;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>;
}
