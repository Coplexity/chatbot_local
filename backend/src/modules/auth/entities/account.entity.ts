import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/entities/base-entity";
import { UserEntity } from "./user.entity";

export enum AccountProvider {
  GOOGLE = "google",
  GITHUB = "github",
}

@Entity("accounts")
@Index(["provider", "providerAccountId"], { unique: true })
@Index(["userId"])
export class AccountEntity extends BaseEntity {
  @Column({ name: "user_id", type: "uuid" })
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "user_id", referencedColumnName: "id" })
  user: UserEntity;

  @Column({ type: "enum", enum: AccountProvider })
  provider: AccountProvider;

  @Column({ nullable: true })
  providerAccountId: string;

  @Column({ type: "text", nullable: true })
  accessToken: string;

  @Column({ type: "text", nullable: true })
  refreshToken: string;

  @Column({ nullable: true })
  expiresAt: Date;

  @Column({ type: "text", nullable: true })
  idToken: string;

  @Column({ nullable: true })
  tokenType: string;

  @Column({ type: "simple-array", nullable: true })
  scope: string[];

  @Column({ type: "json", nullable: true })
  profile: Record<string, any>;

  @Column({ type: "json", nullable: true })
  metadata: Record<string, any>;
}
