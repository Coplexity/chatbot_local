import { Column, Entity, Index, JoinColumn, OneToOne } from "typeorm";
import { BaseEntity } from "../../../common/entities/base-entity";
import { DocumentUserEntity } from "./document-user.entity";

export enum UserRole {
  ADMIN = "admin",
  EDITOR = "editor",
  VIEWER = "viewer",
}

@Entity("chat_users")
@Index(["email"], { unique: true })
@Index(["documentUserId"], { unique: true, where: "document_user_id IS NOT NULL" })
export class UserEntity extends BaseEntity {
  @Column({ name: "document_user_id", type: "bigint", nullable: true })
  documentUserId: string | null;

  @OneToOne(() => DocumentUserEntity, (documentUser: DocumentUserEntity) => documentUser.systemUser, {
    nullable: true,
  })
  @JoinColumn({ name: "document_user_id", referencedColumnName: "id" })
  documentUser: DocumentUserEntity | null;

  @Column({ name: "full_name", type: "varchar", length: 255, nullable: true })
  fullName: string | null;

  @Column({ type: "varchar", length: 255, unique: true })
  email: string;

  @Column({ type: "varchar", length: 20, default: UserRole.VIEWER })
  role: UserRole;

  @Column({ name: "chat_role", type: "varchar", length: 255, nullable: true })
  chatRole: string | null;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;
}
