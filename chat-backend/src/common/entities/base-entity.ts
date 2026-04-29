import { CreateDateColumn, PrimaryColumn, BaseEntity as TypeOrmBaseEntity, UpdateDateColumn } from "typeorm";

export abstract class BaseEntity extends TypeOrmBaseEntity {
  @PrimaryColumn("uuid", {
    primary: true,
    default: () => "uuidv7()", // Requires PostgreSQL 18+
  })
  id: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
