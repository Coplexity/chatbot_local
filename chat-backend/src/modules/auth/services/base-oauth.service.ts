import { Injectable, Logger } from "@nestjs/common";
import { Buffer } from "node:buffer";
import { randomBytes } from "node:crypto";
import { DataSource } from "typeorm";
import { AccountEntity, AccountProvider } from "../entities/account.entity";
import { DocumentUserEntity, DocumentUserRole } from "../entities/document-user.entity";
import { UserEntity, UserRole } from "../entities/user.entity";
import { UserRepository } from "../repositories/user.repository";
import { hashPasslibPbkdf2Sha256 } from "../utils/passlib-pbkdf2-sha256.util";

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
    protected dataSource: DataSource,
    protected userRepository: UserRepository,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  abstract getTokens(code: string, redirectUri?: string): Promise<OAuthTokenResponse>;
  abstract getUserInfo(tokenData: OAuthTokenResponse): Promise<OAuthUserInfo>;
  abstract getAuthorizationUrl(metadata?: OAuthMetadata): string;

  protected async findOrCreateDocumentUser(
    manager: any,
    oauthUser: OAuthUserInfo,
  ): Promise<DocumentUserEntity> {
    const documentUser = await manager.findOne(DocumentUserEntity, {
      where: { email: oauthUser.email },
    });

    if (documentUser) {
      return documentUser;
    }

    const passwordHash = hashPasslibPbkdf2Sha256(randomBytes(32).toString("base64url"));

    const newDocumentUser = manager.create(DocumentUserEntity, {
      email: oauthUser.email,
      fullName: oauthUser.name || oauthUser.email,
      passwordHash,
      role: DocumentUserRole.VIEWER,
      isActive: true,
    });

    return manager.save(newDocumentUser);
  }

  protected async ensureSystemUserFromDocumentUser(
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
        role: UserRole.NONE,
        isActive: documentUser.isActive,
      });
      return manager.save(systemUser);
    }

    systemUser.email = documentUser.email;
    systemUser.fullName = documentUser.fullName;
    systemUser.isActive = documentUser.isActive;

    return manager.save(systemUser);
  }

  private applyTokenData(account: AccountEntity, tokenData: OAuthTokenResponse): AccountEntity {
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

    return account;
  }

  protected async findExistingOAuthAccount(
    manager: any,
    oauthUser: OAuthUserInfo,
  ): Promise<AccountEntity | null> {
    return manager.findOne(AccountEntity, {
      relations: { user: true },
      where: {
        providerAccountId: oauthUser.providerId,
        provider: this.provider,
      },
    });
  }

  protected async authenticateOAuthUser(
    manager: any,
    oauthUser: OAuthUserInfo,
    tokenData: OAuthTokenResponse,
  ): Promise<UserEntity> {
    const existingAccount = await this.findExistingOAuthAccount(manager, oauthUser);

    if (existingAccount?.user) {
      await manager.save(this.applyTokenData(existingAccount, tokenData));
      return existingAccount.user;
    }

    const documentUser = await this.findOrCreateDocumentUser(manager, oauthUser);
    const systemUser = await this.ensureSystemUserFromDocumentUser(manager, documentUser);
    await this.upsertOAuthAccount(manager, systemUser, oauthUser, tokenData);

    return systemUser;
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
      return this.authenticateOAuthUser(manager, oauthUser, tokenData);
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
      this.applyTokenData(account, tokenData);
    }

    return manager.save(account);
  }

  protected encodeState(metadata: OAuthMetadata): string | undefined {
    if (!metadata || Object.keys(metadata).length === 0) {
      return undefined;
    }

    return Buffer.from(JSON.stringify(metadata)).toString("base64");
  }
}
