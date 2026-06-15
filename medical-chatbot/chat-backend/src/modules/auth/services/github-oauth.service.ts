import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { GithubConfig } from "../../../configs/root-config";
import { AccountProvider } from "../entities/account.entity";
import { UserEntity } from "../entities/user.entity";
import { UserRepository } from "../repositories/user.repository";
import { BaseOAuthService, OAuthMetadata, OAuthTokenResponse, OAuthUserInfo } from "./base-oauth.service";

export interface GitHubUserData {
  githubId: string;
  email: string;
  name: string;
  username: string;
  avatarUrl?: string;
  accessToken: string;
}

@Injectable()
export class GitHubOAuthService extends BaseOAuthService {
  protected readonly provider = AccountProvider.GITHUB;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly callbackURL: string;
  private readonly scope: string;

  constructor(
    githubConfig: GithubConfig,
    dataSource: DataSource,
    userRepository: UserRepository,
  ) {
    super(dataSource, userRepository);

    this.clientId = githubConfig.clientID || "";
    this.clientSecret = githubConfig.clientSecret || "";
    this.callbackURL = githubConfig.callbackURL || "";
    this.scope = githubConfig.scope || "user:email";

    if (!this.clientId || !this.clientSecret) {
      this.logger.warn("GitHub OAuth configuration is missing. GitHub authentication will be unavailable.");
    }
  }

  async getTokens(code: string): Promise<OAuthTokenResponse> {
    if (!this.clientId || !this.clientSecret) {
      throw new UnauthorizedException("GitHub OAuth is not configured");
    }

    try {
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
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException("Failed to exchange authorization code");
    }
  }

  async getUserInfo(tokenData: OAuthTokenResponse): Promise<OAuthUserInfo> {
    if (!tokenData.accessToken) {
      throw new UnauthorizedException("Access token is required for GitHub OAuth");
    }

    try {
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
      let email: string | undefined;

      if (!email) {
        const emailResponse = await fetch("https://api.github.com/user/emails", {
          headers: {
            Authorization: `Bearer ${tokenData.accessToken}`,
            Accept: "application/json",
          },
        });

        if (emailResponse.ok) {
          const emails = await emailResponse.json() as any[];
          const primaryEmail = emails.find((e: any) => e.primary && e.verified);
          const verifiedEmail = emails.find((e: any) => e.verified);
          email = primaryEmail?.email || verifiedEmail?.email;
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
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException("Failed to fetch GitHub user information");
    }
  }

  async authenticateWithGitHub(
    code: string,
    state?: string,
  ): Promise<{ user: UserEntity; metadata: any }> {
    return this.authenticateWithOAuth(code, state);
  }

  async validateGitHubUser(githubData: GitHubUserData): Promise<UserEntity> {
    return this.dataSource.transaction(async (manager) => {
      const oauthUser = {
        providerId: githubData.githubId,
        email: githubData.email,
        name: githubData.name,
        username: githubData.username,
        picture: githubData.avatarUrl,
      };
      return this.authenticateOAuthUser(manager, oauthUser, {
        accessToken: githubData.accessToken,
      });
    });
  }

  getAuthorizationUrl(metadata?: OAuthMetadata): string {
    if (!this.clientId) {
      throw new BadRequestException("GitHub OAuth is not configured");
    }

    const state = this.encodeState(metadata || {});
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.callbackURL,
      scope: this.scope,
      ...(state && { state }),
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }
}
