import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DataSource } from "typeorm";
import { Buffer } from "node:buffer";
import { UserEntity } from "../entities/user.entity";
import { AccountEntity, AccountProvider } from "../entities/account.entity";

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
  [key: string]: any; // Allow additional provider-specific fields
}

export interface OAuthMetadata {
  redirectUrl?: string;
  clientName?: string;
  userAgent?: string;
  ipAddress?: string;
  timestamp?: string;
  [key: string]: any; // Allow additional metadata fields
}

/**
 * Base OAuth Service
 * Abstract class providing common OAuth functionality
 * All OAuth providers (Google, GitHub, etc.) should extend this class
 */
@Injectable()
export abstract class BaseOAuthService {
  protected readonly logger: Logger;
  protected abstract readonly provider: AccountProvider;

  constructor(
    protected configService: ConfigService,
    protected dataSource: DataSource,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Abstract methods to be implemented by each OAuth provider
   */

  /**
   * Exchange authorization code for access tokens
   */
  abstract getTokens(code: string, redirectUri?: string): Promise<OAuthTokenResponse>;

  /**
   * Verify and extract user info from token/code
   */
  abstract getUserInfo(tokenData: OAuthTokenResponse): Promise<OAuthUserInfo>;

  /**
   * Generate OAuth authorization URL
   */
  abstract getAuthorizationUrl(metadata?: OAuthMetadata): string;

  /**
   * Main authentication flow - common logic for all providers
   */
  async authenticateWithOAuth(
    code: string,
    state?: string,
  ): Promise<{ user: UserEntity; metadata: OAuthMetadata }> {
    // Exchange code for tokens
    const tokenData = await this.getTokens(code);

    // Get user info from provider
    const oauthUser = await this.getUserInfo(tokenData);

    // Decode metadata from state parameter
    let metadata: OAuthMetadata = {};
    if (state) {
      try {
        metadata = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
        this.logger.debug(`Decoded metadata from state: ${JSON.stringify(metadata)}`);
      }
      catch (error) {
        this.logger.warn(`Failed to decode state parameter: ${error instanceof Error ? error.message : error}`);
      }
    }

    // Find or create user in database
    const user = await this.dataSource.transaction(async (manager) => {
      let user = await manager.findOne(UserEntity, {
        where: { email: oauthUser.email },
      });

      if (!user) {
        user = await this.createUserFromOAuth(manager, oauthUser);
        this.logger.log(`New user created via ${this.provider} OAuth: ${oauthUser.email}`);
      }

      await this.upsertOAuthAccount(manager, user, oauthUser, tokenData);

      return user;
    });

    return { user, metadata };
  }

  /**
   * Create new user from OAuth profile
   */
  protected async createUserFromOAuth(
    manager: any,
    oauthUser: OAuthUserInfo,
  ): Promise<UserEntity> {
    const user = manager.create(UserEntity, {
      email: oauthUser.email,
      name: oauthUser.name,
      image: oauthUser.picture,
      username: oauthUser.username,
    });
    return manager.save(user);
  }

  /**
   * Create or update OAuth account link
   */
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
      // Update existing account
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

  /**
   * Encode metadata into base64 state parameter
   */
  protected encodeState(metadata: OAuthMetadata): string | undefined {
    if (!metadata || Object.keys(metadata).length === 0) {
      return undefined;
    }

    try {
      const state = Buffer.from(JSON.stringify(metadata)).toString("base64");
      this.logger.debug(`Encoded metadata into state: ${JSON.stringify(metadata)}`);
      return state;
    }
    catch (error) {
      this.logger.warn(`Failed to encode metadata: ${error instanceof Error ? error.message : error}`);
      return undefined;
    }
  }

  /**
   * Decode state parameter to extract metadata
   */
  protected decodeState(state: string): OAuthMetadata {
    if (!state) {
      return {};
    }

    try {
      const metadata = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
      this.logger.debug(`Decoded metadata from state: ${JSON.stringify(metadata)}`);
      return metadata;
    }
    catch (error) {
      this.logger.warn(`Failed to decode state parameter: ${error instanceof Error ? error.message : error}`);
      return {};
    }
  }

  /**
   * Validate OAuth configuration
   */
  protected validateConfig(configKeys: string[]): void {
    const missingKeys = configKeys.filter(key => !this.configService.get<string>(key));

    if (missingKeys.length > 0) {
      this.logger.warn(
        `${this.provider} OAuth configuration is missing keys: ${missingKeys.join(", ")}. `
        + `${this.provider} authentication will be unavailable.`,
      );
      throw new UnauthorizedException(`${this.provider} OAuth is not configured`);
    }
  }
}
