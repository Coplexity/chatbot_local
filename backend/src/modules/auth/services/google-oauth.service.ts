import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OAuth2Client } from "google-auth-library";
import { DataSource } from "typeorm";
import { AccountProvider } from "../entities/account.entity";
import { UserEntity } from "../entities/user.entity";
import { UserRepository } from "../repositories/user.repository";
import { BaseOAuthService, OAuthMetadata, OAuthTokenResponse, OAuthUserInfo } from "./base-oauth.service";

export interface GoogleUserData {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
  accessToken: string;
  refreshToken?: string;
}

@Injectable()
export class GoogleOAuthService extends BaseOAuthService {
  protected readonly provider = AccountProvider.GOOGLE;
  private googleOAuthClient: OAuth2Client;
  private readonly callbackURL: string;
  private readonly scope: string;

  constructor(
    configService: ConfigService,
    dataSource: DataSource,
    userRepository: UserRepository,
  ) {
    super(configService, dataSource, userRepository);

    const clientId = this.configService.get<string>("google.clientID");
    const clientSecret = this.configService.get<string>("google.clientSecret");
    this.callbackURL = this.configService.get<string>("google.callbackURL") || "";
    this.scope = this.configService.get<string>("google.scope") || "email profile";

    if (clientId && clientSecret) {
      this.googleOAuthClient = new OAuth2Client({
        clientId,
        clientSecret,
        redirectUri: this.callbackURL,
      });
    }
    else {
      this.logger.warn("Google OAuth configuration is missing. Google authentication will be unavailable.");
    }
  }

  async getTokens(code: string, redirectUri?: string): Promise<OAuthTokenResponse> {
    if (!this.googleOAuthClient) {
      throw new UnauthorizedException("Google OAuth is not configured");
    }

    try {
      const uri = redirectUri || this.callbackURL;
      const { tokens } = await this.googleOAuthClient.getToken({
        code,
        redirect_uri: uri,
      });

      if (!tokens.id_token || !tokens.access_token) {
        throw new UnauthorizedException("Invalid tokens received from Google");
      }

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? undefined,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        tokenType: tokens.token_type ?? undefined,
        idToken: tokens.id_token,
      };
    }
    catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("invalid_grant")) {
          throw new UnauthorizedException("Authorization code is invalid, expired, or already used. Please try authenticating again.");
        }
        if (error.message.includes("redirect_uri_mismatch")) {
          throw new UnauthorizedException("Redirect URI mismatch. Please check your Google OAuth configuration.");
        }
      }

      throw new UnauthorizedException("Failed to exchange authorization code");
    }
  }

  async getUserInfo(tokenData: OAuthTokenResponse): Promise<OAuthUserInfo> {
    if (!this.googleOAuthClient) {
      throw new UnauthorizedException("Google OAuth is not configured");
    }

    if (!tokenData.idToken) {
      throw new UnauthorizedException("ID token is required for Google OAuth");
    }

    try {
      const ticket = await this.googleOAuthClient.verifyIdToken({
        idToken: tokenData.idToken,
        audience: this.configService.get<string>("google.clientID"),
      });
      const payload = ticket.getPayload();

      if (!payload?.email || !payload?.sub) {
        throw new UnauthorizedException("Invalid Google token payload");
      }

      return {
        providerId: payload.sub,
        email: payload.email,
        name: payload.name || payload.email,
        picture: payload.picture,
      };
    }
    catch {
      throw new UnauthorizedException("Invalid Google token");
    }
  }

  async authenticateWithGoogle(
    code: string,
    state?: string,
  ): Promise<{ user: UserEntity; metadata: any }> {
    return this.authenticateWithOAuth(code, state);
  }

  async validateGoogleUser(googleData: GoogleUserData): Promise<UserEntity> {
    return this.dataSource.transaction(async (manager) => {
      const documentUser = await this.findDocumentUserOrThrow(manager, googleData.email);
      const systemUser = await this.ensureSystemUserFromPython(manager, documentUser);

      await this.upsertOAuthAccount(manager, systemUser, {
        providerId: googleData.googleId,
        email: googleData.email,
        name: googleData.name,
        picture: googleData.picture,
      }, {
        accessToken: googleData.accessToken,
        refreshToken: googleData.refreshToken,
      });

      return systemUser;
    });
  }

  getAuthorizationUrl(metadata?: OAuthMetadata): string {
    if (!this.googleOAuthClient) {
      throw new BadRequestException("Google OAuth is not configured");
    }

    const state = this.encodeState(metadata || {});

    return this.googleOAuthClient.generateAuthUrl({
      access_type: "offline",
      scope: this.scope,
      redirect_uri: this.callbackURL,
      ...(state && { state }),
    });
  }
}
