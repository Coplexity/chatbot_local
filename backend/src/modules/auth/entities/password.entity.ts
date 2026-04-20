import { Column, Entity, JoinColumn, OneToOne, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base-entity";
import { UserEntity } from "./user.entity";

@Entity()
@Index(["userId"], { unique: true })
export class PasswordEntity extends BaseEntity {
  @Column()
  userId: string;

  @OneToOne(() => UserEntity)
  @JoinColumn()
  user: UserEntity;

  @Column()
  password: string; // Hashed password

  @Column({ nullable: true })
  salt: string; // Optional: some hashing algorithms use separate salt

  @Column({ nullable: true })
  passwordChangedAt: Date;

  @Column({ type: "json", nullable: true })
  passwordHistory: string[]; // Store hashed previous passwords to prevent reuse
}
