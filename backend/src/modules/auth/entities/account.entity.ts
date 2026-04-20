import { Column, Entity, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base-entity";
import { UserEntity } from "./user.entity";

export enum AccountProvider {
  GOOGLE = "google",
  GITHUB = "github",
  // FACEBOOK = "facebook",
  // APPLE = "apple",
  // MICROSOFT = "microsoft",
  // TWITTER = "twitter",
  // LINKEDIN = "linkedin",
  // LOCAL = "local",
}

@Entity()
@Index(["provider", "providerAccountId"], { unique: true })
@Index(["userId"])
export class AccountEntity extends BaseEntity {
  @Column()
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn()
  user: UserEntity;

  @Column({ type: "enum", enum: AccountProvider })
  provider: AccountProvider;

  @Column({ nullable: true })
  providerAccountId: string;

  @Column({ type: "text", nullable: true })
  accessToken: string; // Should be encrypted

  @Column({ type: "text", nullable: true })
  refreshToken: string; // Should be encrypted

  @Column({ nullable: true })
  expiresAt: Date; // Renamed from expiryAt for consistency

  @Column({ type: "text", nullable: true })
  idToken: string; // For OpenID Connect

  @Column({ nullable: true })
  tokenType: string; // e.g., 'Bearer'

  @Column({ type: "simple-array", nullable: true })
  scope: string[]; // OAuth scopes granted

  @Column({ type: "json", nullable: true })
  profile: Record<string, any>; // Store provider profile data

  @Column({ type: "json", nullable: true })
  metadata: Record<string, any>; // Additional provider-specific data
}
