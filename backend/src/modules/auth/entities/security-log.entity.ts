import { Column, Entity, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base-entity";
import { UserEntity } from "./user.entity";

export enum SecurityAction {
  LOGIN = "login",
  LOGOUT = "logout",
  LOGIN_FAILED = "login_failed",
  PASSWORD_CHANGE = "password_change",
  PASSWORD_RESET = "password_reset",
  PASSWORD_RESET_REQUEST = "password_reset_request",
  EMAIL_VERIFICATION = "email_verification",
  EMAIL_CHANGE = "email_change",
  OAUTH_CONNECT = "oauth_connect",
  OAUTH_DISCONNECT = "oauth_disconnect",
  TOKEN_REFRESH = "token_refresh",
  CONSENT_GRANTED = "consent_granted",
  CONSENT_REVOKED = "consent_revoked",
  MFA_ENABLED = "mfa_enabled",
  MFA_DISABLED = "mfa_disabled",
  SESSION_REVOKED = "session_revoked",
}

@Entity()
@Index(["userId", "createdAt"])
@Index(["action", "createdAt"])
export class SecurityLogEntity extends BaseEntity {
  @Column({ nullable: true })
  userId: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn()
  user: UserEntity;

  @Column({ type: "enum", enum: SecurityAction })
  action: SecurityAction;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ type: "text", nullable: true })
  userAgent: string;

  @Column({ type: "json", nullable: true })
  metadata: Record<string, any>; // Additional context

  @Column({ default: true })
  success: boolean;

  @Column({ nullable: true })
  failureReason: string;

  @Column({ nullable: true })
  location: string; // Geolocation data

  @Column({ nullable: true })
  serviceId: string; // If action related to a specific service
}
