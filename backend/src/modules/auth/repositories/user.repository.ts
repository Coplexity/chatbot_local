import { Injectable } from "@nestjs/common";
import { Repository, DataSource } from "typeorm";
import { UserEntity } from "../entities/user.entity";

@Injectable()
export class UserRepository extends Repository<UserEntity> {
  constructor(private dataSource: DataSource) {
    super(UserEntity, dataSource.createEntityManager());
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.findOne({ where: { email } });
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    return this.findOne({ where: { username } });
  }
}
