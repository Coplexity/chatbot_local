import { Column, Entity, Index, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../common/entities/base-entity";
import { ConversationEntity } from "./conversation.entity";
import { CitationEntity } from "./citation.entity";

export enum MessageRole {
  USER = "user",
  ASSISTANT = "assistant",
  SYSTEM = "system",
}

@Entity("messages")
@Index(["conversationId", "createdAt"])
@Index(["role", "createdAt"])
export class MessageEntity extends BaseEntity {
  @Column({ type: "uuid" })
  conversationId: string;

  @ManyToOne(() => ConversationEntity, (conversation: ConversationEntity) => conversation.messages, {
    onDelete: "CASCADE",
  })
  @JoinColumn()
  conversation: ConversationEntity;

  @OneToMany(() => CitationEntity, (citation: CitationEntity) => citation.message, {
    cascade: true,
  })
  citations: CitationEntity[];

  @Column({
    type: "enum",
    enum: MessageRole,
  })
  role: MessageRole;

  @Column({ type: "text" })
  content: string;

  @Column({ type: "int", default: 0 })
  tokenCount: number;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>;
}
