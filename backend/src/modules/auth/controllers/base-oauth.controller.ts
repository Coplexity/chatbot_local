import { BadRequestException } from "@nestjs/common";
import { Request, Response } from "express";
import { JwtAuthService } from "../services/jwt-auth.service";
import { BaseOAuthService, OAuthMetadata } from "../services/base-oauth.service";
import { SignInSuccessResponseDto } from "../dtos/auth.dto";
import { UserEntity } from "../entities/user.entity";
import { OAuthAuthDto } from "../dtos/oauth-auth.dto";

/**
 * Base OAuth Controller
 * Provides common functionality for all OAuth providers (Google, GitHub, etc.)
 * Reduces code duplication across OAuth controllers
 */
export abstract class BaseOAuthController {
  protected abstract oauthService: BaseOAuthService;
  protected abstract jwtAuthService: JwtAuthService;

  /**
   * Handle OAuth authorization redirect
   * Generates authorization URL and either redirects or returns JSON
   */
  protected async handleOAuthRedirect(
    req: Request,
    res: Response,
    query: OAuthAuthDto,
  ) {
    // Prepare metadata to pass through OAuth flow
    const metadata: OAuthMetadata = {
      redirectUrl: query.redirectUrl,
      clientName: query.clientName,
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
      timestamp: new Date().toISOString(),
    };

    const authUrl = this.oauthService.getAuthorizationUrl(metadata);

    if (query.redirect === "false") {
      return { authorizationUrl: authUrl };
    }

    res.redirect(authUrl);
  }

  /**
   * Handle OAuth callback
   * Processes authorization code and returns tokens or redirects with tokens
   */
  protected async handleOAuthCallback(
    res: Response,
    code: string,
    state: string | undefined,
  ) {
    if (!code) {
      throw new BadRequestException("Authorization code is required");
    }

    const { user, metadata } = await this.oauthService.authenticateWithOAuth(code, state);
    const { accessToken } = this.jwtAuthService.generateToken(user);

    // If metadata contains redirectUrl, redirect to it with the access token
    if (metadata?.redirectUrl) {
      const redirectUrl = new URL(metadata.redirectUrl);
      redirectUrl.searchParams.set("accessToken", accessToken);
      redirectUrl.searchParams.set("userId", user.id);
      return res.redirect(redirectUrl.toString());
    }

    // Otherwise, return JSON response
    return {
      accessToken,
      user,
      metadata,
    };
  }

  /**
   * Handle token exchange
   * Exchanges authorization code for access tokens (for client-side apps)
   */
  protected async handleTokenExchange(
    code: string,
    state?: string,
  ): Promise<SignInSuccessResponseDto> {
    const { user, metadata } = await this.oauthService.authenticateWithOAuth(code, state);
    const { accessToken } = this.jwtAuthService.generateToken(user);

    return {
      accessToken,
      user,
      metadata,
    };
  }

  /**
   * Generate authentication response with token and user data
   * Common helper for all authentication endpoints
   */
  protected generateAuthResponse(user: UserEntity): SignInSuccessResponseDto {
    const { accessToken } = this.jwtAuthService.generateToken(user);

    return {
      accessToken,
      user,
    };
  }
}
