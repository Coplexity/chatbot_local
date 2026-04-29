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
}
