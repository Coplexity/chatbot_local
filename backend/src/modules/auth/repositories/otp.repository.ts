import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { OtpEntity } from "../entities/otp.entity";

@Injectable()
export class OtpRepository {
  constructor(
    @InjectRepository(OtpEntity)
    private readonly repository: Repository<OtpEntity>,
  ) {}

  async create(data: Partial<OtpEntity>): Promise<OtpEntity> {
    const otp = this.repository.create(data);
    return this.repository.save(otp);
  }

  async findById(id: string): Promise<OtpEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByUserId(userId: string): Promise<OtpEntity[]> {
    return this.repository.find({
      where: { userId, active: true },
      order: { createdAt: "DESC" },
    });
  }

  async findActiveByUserIdAndMethod(
    userId: string,
    otpMethod: string,
  ): Promise<OtpEntity | null> {
    return this.repository.findOne({
      where: { userId, otpMethod: otpMethod as any, active: true },
    });
  }

  async update(id: string, data: Partial<OtpEntity>): Promise<OtpEntity | null> {
    await this.repository.update(id, data);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async markAsVerified(id: string): Promise<OtpEntity | null> {
    return this.update(id, {
      verified: true,
      lastUsedAt: new Date(),
    });
  }

  async deactivate(id: string): Promise<OtpEntity | null> {
    return this.update(id, { active: false });
  }
}
