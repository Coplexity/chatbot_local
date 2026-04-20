import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DataSource } from "typeorm";
import { AccountProvider } from "../entities/account.entity";
import { UserEntity } from "../entities/user.entity";
import { BaseOAuthService, OAuthMetadata, OAuthTokenResponse, OAuthUserInfo } from "./base-oauth.service";

export interface GitHubUserData {
  githubId: string;
  email: string;
  name: string;
  username: string;
  avatarUrl?: string;
  accessToken: string;
}

/**
 * GitHub OAuth Service
 * Handles GitHub authentication using OAuth 2.0
 */
@Injectable()
export class GitHubOAuthService extends BaseOAuthService {
  protected readonly provider = AccountProvider.GITHUB;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly callbackURL: string;
  private readonly scope: string;

  constructor(
    configService: ConfigService,
    dataSource: DataSource,
  ) {
    super(configService, dataSource);

    this.clientId = this.configService.get<string>("github.clientID") || "";
    this.clientSecret = this.configService.get<string>("github.clientSecret") || "";
    this.callbackURL = this.configService.get<string>("github.callbackURL") || "";
    this.scope = this.configService.get<string>("github.scope") || "user:email";

    if (!this.clientId || !this.clientSecret) {
      this.logger.warn(
        "GitHub OAuth configuration is missing. GitHub authentication will be unavailable.",
      );
    }
  }

  /**
   * Exchange authorization code for tokens (implements BaseOAuthService)
   */
  async getTokens(code: string): Promise<OAuthTokenResponse> {
    if (!this.clientId || !this.clientSecret) {
      throw new UnauthorizedException("GitHub OAuth is not configured");
    }

    try {
      // GitHub token exchange endpoint
      const response = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          redirect_uri: this.callbackURL,
        }),
      });

      const data = await response.json() as any;

      if (!response.ok || data.error) {
        this.logger.error(`GitHub token exchange failed: ${data.error_description || data.error}`);
        throw new UnauthorizedException(data.error_description || "Failed to exchange authorization code");
      }

      if (!data.access_token) {
        throw new UnauthorizedException("Invalid tokens received from GitHub");
      }

      return {
        accessToken: data.access_token,
        tokenType: data.token_type || "bearer",
        scope: data.scope ? data.scope.split(",") : undefined,
      };
    }
    catch (error) {
      this.logger.error("GitHub token exchange failed", error instanceof Error ? error.stack : error);

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException("Failed to exchange authorization code");
    }
  }

  /**
   * Get GitHub user info using access token (implements BaseOAuthService)
   */
  async getUserInfo(tokenData: OAuthTokenResponse): Promise<OAuthUserInfo> {
    if (!tokenData.accessToken) {
      throw new UnauthorizedException("Access token is required for GitHub OAuth");
    }

    try {
      // Fetch user profile
      const userResponse = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${tokenData.accessToken}`,
          Accept: "application/json",
        },
      });

      if (!userResponse.ok) {
        throw new UnauthorizedException("Failed to fetch GitHub user profile");
      }

      const userData = await userResponse.json() as any;

      // Fetch user emails (if not public)
      let email = userData.email;

      if (!email) {
        const emailResponse = await fetch("https://api.github.com/user/emails", {
          headers: {
            Authorization: `Bearer ${tokenData.accessToken}`,
            Accept: "application/json",
          },
        });

        if (emailResponse.ok) {
          const emails = await emailResponse.json() as any[];
          // Find primary email or first verified email
          const primaryEmail = emails.find((e: any) => e.primary && e.verified);
          const verifiedEmail = emails.find((e: any) => e.verified);
          email = primaryEmail?.email || verifiedEmail?.email || emails[0]?.email;
        }
      }

      if (!email) {
        throw new UnauthorizedException("GitHub account does not have a verified email address");
      }

      return {
        providerId: userData.id.toString(),
        email,
        name: userData.name || userData.login,
        username: userData.login,
        picture: userData.avatar_url,
      };
    }
    catch (error) {
      this.logger.error("GitHub user info fetch failed", error instanceof Error ? error.stack : error);

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException("Failed to fetch GitHub user information");
    }
  }

  /**
   * Authenticate user with GitHub (wrapper using base class method)
   */
  async authenticateWithGitHub(
    code: string,
    state?: string,
  ): Promise<{ user: UserEntity; metadata: any }> {
    return this.authenticateWithOAuth(code, state);
  }

  /**
   * Validate GitHub user data (legacy compatibility method)
   */
  async validateGitHubUser(githubData: GitHubUserData): Promise<UserEntity> {
    return this.dataSource.transaction(async (manager) => {
      let user = await manager.findOne(UserEntity, {
        where: { email: githubData.email },
      });

      if (!user) {
        user = manager.create(UserEntity, {
          email: githubData.email,
          name: githubData.name,
          username: githubData.username,
          image: githubData.avatarUrl,
        });
        user = await manager.save(user);
        this.logger.log(`New user created via GitHub OAuth: ${githubData.email}`);
      }

      await this.upsertOAuthAccount(manager, user, {
        providerId: githubData.githubId,
        email: githubData.email,
        name: githubData.name,
        username: githubData.username,
        picture: githubData.avatarUrl,
      }, {
        accessToken: githubData.accessToken,
      });

      return user;
    });
  }

  /**
   * Get authorization URL for GitHub OAuth (implements BaseOAuthService)
   */
  getAuthorizationUrl(metadata?: OAuthMetadata): string {
    if (!this.clientId) {
      throw new BadRequestException("GitHub OAuth is not configured");
    }

    const uri = this.callbackURL;
    const state = this.encodeState(metadata || {});

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: uri,
      scope: this.scope,
      ...(state && { state }),
    });

    const url = `https://github.com/login/oauth/authorize?${params.toString()}`;

    this.logger.debug(`Generated GitHub auth URL with redirect_uri: ${uri}`);

    return url;
  }
}
