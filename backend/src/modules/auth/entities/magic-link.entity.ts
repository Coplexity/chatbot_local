import { Column, Entity, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../common/entities/base-entity";
import { UserEntity } from "./user.entity";

@Entity()
export class MagicLinkEntity extends BaseEntity {
  @Column()
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn()
  user: UserEntity;

  @Column({ unique: true })
  token: string; // Should be hashed before storing

  @Column()
  email: string;

  @Column()
  expiresAt: Date;

  @Column({ default: false })
  used: boolean;

  @Column({ nullable: true })
  usedAt: Date;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;
}
