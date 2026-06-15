import { Exclude } from "class-transformer";
import { Check, Column, CreateDateColumn, Entity, Index, ManyToOne, OneToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { UserEntity } from "./user.entity";

export enum DocumentUserRole {
  ADMIN = "admin",
  EDITOR = "editor",
  VIEWER = "viewer",
}

@Entity("users", { synchronize: false })
@Check(`role IN ('admin', 'editor', 'viewer')`)
@Index(["email"], { unique: true })
export class DocumentUserEntity {
  @PrimaryGeneratedColumn({ type: "bigint", name: "user_id" })
  id: string;

  @Column({ name: "full_name", type: "varchar", length: 255, nullable: true })
  fullName: string | null;

  @Column({ type: "varchar", length: 255, unique: true })
  email: string;

  @Exclude()
  @Column({ name: "password_hash", type: "varchar", length: 255 })
  passwordHash: string;

  @Column({ type: "varchar", length: 20, default: DocumentUserRole.VIEWER })
  role: DocumentUserRole;

  @Column({ name: "parent_id", type: "bigint", nullable: true })
  parentId: string | null;

  @ManyToOne(() => DocumentUserEntity, (user) => user.children, { nullable: true })
  parent: DocumentUserEntity | null;

  @OneToMany(() => DocumentUserEntity, (user) => user.parent)
  children: DocumentUserEntity[];

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;

  @OneToOne(() => UserEntity, (systemUser: UserEntity) => systemUser.documentUser)
  systemUser?: UserEntity;
}
