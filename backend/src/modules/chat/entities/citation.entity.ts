import { Column, Entity, Index, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../common/entities/base-entity";
import { MessageEntity } from "./message.entity";

@Entity("citations")
@Index(["messageId", "createdAt"])
export class CitationEntity extends BaseEntity {
  @Column({ type: "uuid" })
  messageId: string;

  @ManyToOne(() => MessageEntity, (message: MessageEntity) => message.citations, {
    onDelete: "CASCADE",
  })
  @JoinColumn()
  message: MessageEntity;

  @Column({ type: "int", nullable: true })
  chuong: number | null;

  @Column({ type: "int", nullable: true })
  dieu: number | null;

  @Column({ type: "int", nullable: true })
  khoan: number | null;

  @Column({ type: "int", nullable: true })
  phu_luc: number | null;

  @Column({ type: "text", nullable: true })
  noi_dung_da_su_dung: string | null;

  @Column({ type: "int" })
  start_char: number;

  @Column({ type: "int" })
  end_char: number;

  @Column({ type: "varchar", length: 50, nullable: true })
  resource_type: string | null;

  @Column({ type: "text", nullable: true })
  resource_content: string | null;
}
