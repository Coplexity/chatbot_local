import { Column, Entity, Index, JoinColumn, OneToOne } from "typeorm";
import { BaseEntity } from "../../../common/entities/base-entity";
import { DocumentUserEntity } from "./document-user.entity";

export enum UserRole {
  NONE = "",
  NHAN_VIEN_Y_TE = "nhan_vien_y_te",
  BAC_SI_TRAM_Y_TE = "bac_si_tram_y_te",
  BAC_SI_BENH_VIEN_CHUYEN_SAU = "bac_si_benh_vien_chuyen_sau",
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

  @Column({ type: "varchar", length: 50, default: UserRole.NONE })
  role: UserRole;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;
}
