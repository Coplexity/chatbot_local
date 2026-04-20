import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan } from "typeorm";
import { MagicLinkEntity } from "../entities/magic-link.entity";

@Injectable()
export class MagicLinkRepository {
  constructor(
    @InjectRepository(MagicLinkEntity)
    private readonly repository: Repository<MagicLinkEntity>,
  ) {}

  async create(data: Partial<MagicLinkEntity>): Promise<MagicLinkEntity> {
    const magicLink = this.repository.create(data);
    return this.repository.save(magicLink);
  }

  async findById(id: string): Promise<MagicLinkEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByToken(token: string): Promise<MagicLinkEntity | null> {
    return this.repository.findOne({ where: { token } });
  }

  async findByEmail(email: string): Promise<MagicLinkEntity[]> {
    return this.repository.find({
      where: { email },
      order: { createdAt: "DESC" },
    });
  }

  async findValidByToken(token: string): Promise<MagicLinkEntity | null> {
    return this.repository.findOne({
      where: {
        token,
        used: false,
        expiresAt: LessThan(new Date()),
      },
    });
  }

  async markAsUsed(
    id: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<MagicLinkEntity | null> {
    await this.repository.update(id, {
      used: true,
      usedAt: new Date(),
      ipAddress,
      userAgent,
    });
    return this.findById(id);
  }

  async deleteExpired(): Promise<number> {
    const result = await this.repository.delete({
      expiresAt: LessThan(new Date()),
    });
    return result.affected || 0;
  }

  async deleteByUserId(userId: string): Promise<number> {
    const result = await this.repository.delete({ userId });
    return result.affected || 0;
  }
}
