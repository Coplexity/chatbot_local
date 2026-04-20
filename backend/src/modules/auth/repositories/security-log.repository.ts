import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, FindOptionsWhere } from "typeorm";
import { SecurityLogEntity, SecurityAction } from "../entities/security-log.entity";

@Injectable()
export class SecurityLogRepository {
  constructor(
    @InjectRepository(SecurityLogEntity)
    private readonly repository: Repository<SecurityLogEntity>,
  ) {}

  async create(data: Partial<SecurityLogEntity>): Promise<SecurityLogEntity> {
    const log = this.repository.create(data);
    return this.repository.save(log);
  }

  async logAction(
    action: SecurityAction,
    userId?: string,
    metadata?: {
      success?: boolean;
      failureReason?: string;
      ipAddress?: string;
      userAgent?: string;
      location?: string;
      serviceId?: string;
      additionalData?: Record<string, any>;
    },
  ): Promise<SecurityLogEntity> {
    return this.create({
      action,
      userId,
      success: metadata?.success ?? true,
      failureReason: metadata?.failureReason,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      location: metadata?.location,
      serviceId: metadata?.serviceId,
      metadata: metadata?.additionalData,
    });
  }

  async findById(id: string): Promise<SecurityLogEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByUserId(
    userId: string,
    limit: number = 50,
  ): Promise<SecurityLogEntity[]> {
    return this.repository.find({
      where: { userId },
      order: { createdAt: "DESC" },
      take: limit,
    });
  }

  async findByAction(
    action: SecurityAction,
    limit: number = 50,
  ): Promise<SecurityLogEntity[]> {
    return this.repository.find({
      where: { action },
      order: { createdAt: "DESC" },
      take: limit,
    });
  }

  async findFailedLoginAttempts(
    userId?: string,
    ipAddress?: string,
    _since?: Date,
  ): Promise<SecurityLogEntity[]> {
    const where: FindOptionsWhere<SecurityLogEntity> = {
      action: SecurityAction.LOGIN_FAILED,
      success: false,
    };

    if (userId) {
      where.userId = userId;
    }

    if (ipAddress) {
      where.ipAddress = ipAddress;
    }

    const query = this.repository.find({
      where,
      order: { createdAt: "DESC" },
    });

    return query;
  }

  async countFailedLoginAttempts(
    userId: string,
    since: Date,
  ): Promise<number> {
    return this.repository.count({
      where: {
        userId,
        action: SecurityAction.LOGIN_FAILED,
        success: false,
        createdAt: LessThan(since) as any,
      },
    });
  }

  async findRecent(limit: number = 100): Promise<SecurityLogEntity[]> {
    return this.repository.find({
      order: { createdAt: "DESC" },
      take: limit,
    });
  }

  async deleteOlderThan(date: Date): Promise<number> {
    const result = await this.repository.delete({
      createdAt: LessThan(date) as any,
    });
    return result.affected || 0;
  }
}

// Helper function to be used outside repository
function LessThan(date: Date) {
  return date;
}
