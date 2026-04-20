import { BadRequestException, Body, Controller, Get, HttpCode, Post, Query, Req, Res, UnauthorizedException, UseInterceptors, UsePipes, ValidationPipe } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Request, Response } from "express";
import { ApiHttpException } from "../../../common/decorators/api-http-exception.decorator";
import { GoogleOAuthService } from "../services/google-oauth.service";
import { JwtAuthService } from "../services/jwt-auth.service";
import { SignInSuccessResponseDto } from "../dtos/auth.dto";
import { OAuthAuthDto } from "../dtos/oauth-auth.dto";
import { OAuthCallbackDto, OAuthTokenExchangeDto } from "../dtos/oauth-callback.dto";
import { AuthCookieInterceptor } from "../interceptors/auth-cookie.interceptor";
import { BaseOAuthController } from "./base-oauth.controller";

@ApiTags("Google OAuth")
@Controller("auth/google")
@UsePipes(new ValidationPipe())
@UseInterceptors(AuthCookieInterceptor)
export class GoogleOAuthController extends BaseOAuthController {
  protected oauthService: GoogleOAuthService;
  protected jwtAuthService: JwtAuthService;

  constructor(
    googleOAuthService: GoogleOAuthService,
    jwtAuthService: JwtAuthService,
  ) {
    super();
    this.oauthService = googleOAuthService;
    this.jwtAuthService = jwtAuthService;
  }

  /**
   * Get Google OAuth authorization URL
   * Redirects to Google for authentication
   * Use this for traditional web apps with server-side redirects
   */
  @Get()
  @ApiOkResponse({ description: "Redirects to Google OAuth or returns authorization URL" })
  async googleAuth(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Query() query: OAuthAuthDto,
  ) {
    return this.handleOAuthRedirect(req, res, query);
  }

  /**
   * Google OAuth callback endpoint
   * Google redirects back here after authentication with authorization code
   */
  @Get("callback")
  @ApiOkResponse({ description: "Returns tokens and user data, or redirects with tokens", type: SignInSuccessResponseDto })
  @ApiHttpException(() => [BadRequestException, UnauthorizedException])
  async googleAuthCallback(
    @Query() query: OAuthCallbackDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.handleOAuthCallback(res, query.code, query.state);
  }

  /**
   * Exchange Google authorization code for tokens
   * Use this for client-side applications that handle OAuth flow
   */
  @Post("token")
  @ApiOkResponse({ description: "Returns tokens and user data", type: SignInSuccessResponseDto })
  @ApiHttpException(() => [BadRequestException, UnauthorizedException])
  @HttpCode(200)
  async exchangeGoogleCode(@Body() body: OAuthTokenExchangeDto): Promise<SignInSuccessResponseDto> {
    return this.handleTokenExchange(body.code, body.state);
  }
}
