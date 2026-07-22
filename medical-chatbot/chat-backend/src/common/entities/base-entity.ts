import { CreateDateColumn, PrimaryColumn, BaseEntity as TypeOrmBaseEntity, UpdateDateColumn } from "typeorm";

export abstract class BaseEntity extends TypeOrmBaseEntity {
  @PrimaryColumn("uuid", {
    primary: true,
    default: () => "gen_random_uuid()", // Built-in since PostgreSQL 13
  })
  id: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
