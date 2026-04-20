import { Injectable } from "@nestjs/common";
import { Repository, DataSource } from "typeorm";
import { PasswordEntity } from "../entities/password.entity";

@Injectable()
export class PasswordRepository extends Repository<PasswordEntity> {
  constructor(private dataSource: DataSource) {
    super(PasswordEntity, dataSource.createEntityManager());
  }
}
