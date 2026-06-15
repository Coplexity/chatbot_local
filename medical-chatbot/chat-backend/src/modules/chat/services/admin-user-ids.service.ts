import { CACHE_MANAGER, Cache } from "@nestjs/cache-manager";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { DataSource } from "typeorm";
import { DocumentUserEntity, DocumentUserRole } from "../../auth/entities/document-user.entity";

const ADMIN_USER_IDS_CACHE_KEY = "chat:admin-document-user-ids";
const ADMIN_USER_IDS_CACHE_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class AdminUserIdsService {
  private readonly logger = new Logger(AdminUserIdsService.name);
  private pendingRefresh: Promise<string[]> | null = null;

  constructor(
    private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async getAdminUserIds(): Promise<string[]> {
    const cachedAdminUserIds = await this.cacheManager.get<string[]>(ADMIN_USER_IDS_CACHE_KEY);
    if (cachedAdminUserIds) {
      return cachedAdminUserIds;
    }

    if (!this.pendingRefresh) {
      this.pendingRefresh = this.loadAdminUserIds();
    }

    try {
      return await this.pendingRefresh;
    }
    finally {
      this.pendingRefresh = null;
    }
  }

  async invalidateAdminUserIdsCache(): Promise<void> {
    await this.cacheManager.del(ADMIN_USER_IDS_CACHE_KEY);
  }

  private async loadAdminUserIds(): Promise<string[]> {
    const adminUsers = await this.dataSource.getRepository(DocumentUserEntity).find({
      select: {
        id: true,
      },
      where: {
        role: DocumentUserRole.ADMIN,
        isActive: true,
      },
      order: {
        id: "ASC",
      },
    });

    const adminUserIds = adminUsers.map(user => user.id).filter(Boolean);
    await this.cacheManager.set(ADMIN_USER_IDS_CACHE_KEY, adminUserIds, ADMIN_USER_IDS_CACHE_TTL_MS);

    if (adminUserIds.length === 0) {
      this.logger.warn("No active admin document users found for chat-api user_ids fallback");
    }

    return adminUserIds;
  }
}
