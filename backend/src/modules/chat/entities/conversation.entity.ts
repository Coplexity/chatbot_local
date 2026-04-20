import { Column, Entity, Index, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import { SoftDeleteEntity } from "../../../common/entities/soft-delete-entity";
import { UserEntity } from "../../auth/entities/user.entity";
import { MessageEntity } from "./message.entity";
import { ConversationSummaryEntity } from "./conversation-summary.entity";

@Entity("conversations")
@Index(["userId", "createdAt"])
@Index(["userId", "deletedAt"])
export class ConversationEntity extends SoftDeleteEntity {
  @Column({ type: "varchar", length: 255, nullable: true })
  title: string;

  @Column({ type: "uuid" })
  userId: string;

  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn()
  user: UserEntity;

  @OneToMany(() => MessageEntity, (message: MessageEntity) => message.conversation, {
    cascade: true,
  })
  messages: MessageEntity[];

  @OneToMany(() => ConversationSummaryEntity, (summary: ConversationSummaryEntity) => summary.conversation, {
    cascade: true,
  })
  summaries: ConversationSummaryEntity[];

  @Column({ type: "int", default: 0 })
  totalTokens: number;

  @Column({ type: "int", default: 4000 })
  maxTokens: number;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>;
}
