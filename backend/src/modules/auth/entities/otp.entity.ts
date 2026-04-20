import { Column, Entity, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../common/entities/base-entity";
import { UserEntity } from "./user.entity";

export enum OtpMethod {
  SMS = "sms",
  EMAIL = "email",
  TOTP = "totp", // Time-based OTP (Authenticator apps)
}

@Entity()
export class OtpEntity extends BaseEntity {
  @Column()
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn()
  user: UserEntity;

  @Column({ type: "enum", enum: OtpMethod })
  otpMethod: OtpMethod;

  @Column({ nullable: true })
  otpSecret: string; // For TOTP, encrypted

  @Column({ nullable: true })
  phoneNumber: string; // For SMS OTP

  @Column({ nullable: true })
  email: string; // For Email OTP

  @Column({ default: false })
  verified: boolean;

  @Column()
  expiresAt: Date;

  @Column({ type: "json", nullable: true })
  backupCodes: string[]; // Encrypted backup codes

  @Column({ nullable: true })
  lastUsedAt: Date;

  @Column({ default: true })
  active: boolean;
}
