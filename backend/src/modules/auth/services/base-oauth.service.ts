import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Buffer } from "node:buffer";
import { DataSource } from "typeorm";
import { AccountEntity, AccountProvider } from "../entities/account.entity";
import { DocumentUserEntity } from "../entities/document-user.entity";
import { UserEntity, UserRole } from "../entities/user.entity";
import { UserRepository } from "../repositories/user.repository";

export interface OAuthTokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  tokenType?: string;
  idToken?: string;
  scope?: string[];
}

export interface OAuthUserInfo {
  providerId: string;
  email: string;
  name: string;
  username?: string;
  picture?: string;
  [key: string]: any;
}

export interface OAuthMetadata {
  redirectUrl?: string;
  clientName?: string;
  userAgent?: string;
  ipAddress?: string;
  timestamp?: string;
  [key: string]: any;
}

@Injectable()
export abstract class BaseOAuthService {
  protected readonly logger: Logger;
  protected abstract readonly provider: AccountProvider;

  constructor(
    protected configService: ConfigService,
    protected dataSource: DataSource,
    protected userRepository: UserRepository,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  abstract getTokens(code: string, redirectUri?: string): Promise<OAuthTokenResponse>;
  abstract getUserInfo(tokenData: OAuthTokenResponse): Promise<OAuthUserInfo>;
  abstract getAuthorizationUrl(metadata?: OAuthMetadata): string;

  protected mapPythonRoleToSystemRole(role: string): UserRole {
    if (role === UserRole.ADMIN || role === UserRole.EDITOR || role === UserRole.VIEWER) {
      return role;
    }
    return UserRole.VIEWER;
  }

  protected async findDocumentUserOrThrow(
    manager: any,
    email: string,
  ): Promise<DocumentUserEntity> {
    const documentUser = await manager.findOne(DocumentUserEntity, {
      where: { email },
    });

    if (!documentUser) {
      throw new UnauthorizedException("Python user not found");
    }

    return documentUser;
  }

  protected async ensureSystemUserFromPython(
    manager: any,
    documentUser: DocumentUserEntity,
  ): Promise<UserEntity> {
    let systemUser = await manager.findOne(UserEntity, {
      where: { documentUserId: documentUser.id },
    });

    if (!systemUser) {
      systemUser = manager.create(UserEntity, {
        documentUserId: documentUser.id,
        email: documentUser.email,
        fullName: documentUser.fullName,
        role: this.mapPythonRoleToSystemRole(documentUser.role),
        chatRole: documentUser.chatRole,
        isActive: documentUser.isActive,
      });
      return manager.save(systemUser);
    }

    systemUser.email = documentUser.email;
    systemUser.fullName = documentUser.fullName;
    systemUser.role = this.mapPythonRoleToSystemRole(documentUser.role);
    systemUser.chatRole = documentUser.chatRole;
    systemUser.isActive = documentUser.isActive;

    return manager.save(systemUser);
  }

  async authenticateWithOAuth(
    code: string,
    state?: string,
  ): Promise<{ user: UserEntity; metadata: OAuthMetadata }> {
    const tokenData = await this.getTokens(code);
    const oauthUser = await this.getUserInfo(tokenData);

    let metadata: OAuthMetadata = {};
    if (state) {
      try {
        metadata = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
      }
      catch {
        metadata = {};
      }
    }

    const user = await this.dataSource.transaction(async (manager) => {
      const documentUser = await this.findDocumentUserOrThrow(manager, oauthUser.email);
      const systemUser = await this.ensureSystemUserFromPython(manager, documentUser);
      await this.upsertOAuthAccount(manager, systemUser, oauthUser, tokenData);
      return systemUser;
    });

    return { user, metadata };
  }

  protected async upsertOAuthAccount(
    manager: any,
    user: UserEntity,
    oauthUser: OAuthUserInfo,
    tokenData: OAuthTokenResponse,
  ): Promise<AccountEntity> {
    let account = await manager.findOne(AccountEntity, {
      where: {
        providerAccountId: oauthUser.providerId,
        provider: this.provider,
      },
    });

    if (!account) {
      account = manager.create(AccountEntity, {
        user,
        userId: user.id,
        provider: this.provider,
        providerAccountId: oauthUser.providerId,
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        expiresAt: tokenData.expiresAt,
        idToken: tokenData.idToken,
        tokenType: tokenData.tokenType,
        scope: tokenData.scope,
      });
    }
    else {
      account.user = user;
      account.userId = user.id;
      account.accessToken = tokenData.accessToken;
      if (tokenData.refreshToken) {
        account.refreshToken = tokenData.refreshToken;
      }
      if (tokenData.expiresAt) {
        account.expiresAt = tokenData.expiresAt;
      }
      if (tokenData.idToken) {
        account.idToken = tokenData.idToken;
      }
      if (tokenData.tokenType) {
        account.tokenType = tokenData.tokenType;
      }
      if (tokenData.scope) {
        account.scope = tokenData.scope;
      }
    }

    return manager.save(account);
  }

  protected encodeState(metadata: OAuthMetadata): string | undefined {
    if (!metadata || Object.keys(metadata).length === 0) {
      return undefined;
    }

    try {
      return Buffer.from(JSON.stringify(metadata)).toString("base64");
    }
    catch {
      return undefined;
    }
  }

  protected validateConfig(configKeys: string[]): void {
    const missingKeys = configKeys.filter(key => !this.configService.get<string>(key));
    if (missingKeys.length > 0) {
      throw new UnauthorizedException(`${this.provider} OAuth is not configured`);
    }
  }
}
