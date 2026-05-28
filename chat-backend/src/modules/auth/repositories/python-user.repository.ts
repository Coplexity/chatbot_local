import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { DocumentUserEntity } from "../entities/document-user.entity";

@Injectable()
export class DocumentUserRepository extends Repository<DocumentUserEntity> {
  constructor(private dataSource: DataSource) {
    super(DocumentUserEntity, dataSource.createEntityManager());
  }

  async findByEmail(email: string): Promise<DocumentUserEntity | null> {
    return this.findOne({ where: { email } });
  }

  async findAncestors(userId: string): Promise<DocumentUserEntity[]> {
    return this.query(`
      WITH RECURSIVE ancestors AS (
        SELECT user_id, full_name, email, role, is_active, parent_id
        FROM users
        WHERE user_id = $1
        UNION ALL
        SELECT u.user_id, u.full_name, u.email, u.role, u.is_active, u.parent_id
        FROM users u
        INNER JOIN ancestors a ON u.user_id = a.parent_id
      )
      SELECT
        user_id::text AS id,
        full_name AS "fullName",
        email,
        role,
        is_active AS "isActive",
        parent_id::text AS "parentId"
      FROM ancestors
      WHERE user_id != $1
    `, [userId]);
  }
}
