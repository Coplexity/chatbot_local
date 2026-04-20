import { Injectable } from "@nestjs/common";
import { Repository, DataSource } from "typeorm";
import { TokenEntity } from "../entities/token.entity";

@Injectable()
export class TokenRepository extends Repository<TokenEntity> {
  constructor(private dataSource: DataSource) {
    super(TokenEntity, dataSource.createEntityManager());
  }
}
