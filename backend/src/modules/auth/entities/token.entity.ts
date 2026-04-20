import { Column, Entity, JoinColumn, ManyToOne, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base-entity";
import { UserEntity } from "./user.entity";

export enum TokenType {
  EMAIL_VERIFICATION = "email_verification",
  PHONE_VERIFICATION = "phone_verification",
  PASSWORD_RESET = "password_reset",
  MAGIC_LINK = "magic_link",
  API_KEY = "api_key",
  INVITATION = "invitation",
}

@Entity()
@Index(["token"], { unique: true })
@Index(["userId", "tokenType"])
export class TokenEntity extends BaseEntity {
  @Column()
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn()
  user: UserEntity;

  @Column({ unique: true })
  token: string; // Should be hashed before storing

  @Column({ type: "enum", enum: TokenType })
  tokenType: TokenType;

  @Column({ default: false })
  revoked: boolean;

  @Column({ nullable: true })
  revokedAt: Date;

  @Column()
  expiresAt: Date;

  @Column({ nullable: true })
  usedAt: Date;

  @Column({ type: "json", nullable: true })
  metadata: Record<string, any>; // Additional token data (e.g., IP, user agent)
}
