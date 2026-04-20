import { BadRequestException, Body, Controller, Get, HttpCode, Post, Query, Req, Res, UnauthorizedException, UseInterceptors, UsePipes, ValidationPipe } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Request, Response } from "express";
import { ApiHttpException } from "../../../common/decorators/api-http-exception.decorator";
import { SignInSuccessResponseDto } from "../dtos/auth.dto";
import { OAuthAuthDto } from "../dtos/oauth-auth.dto";
import { OAuthCallbackDto, OAuthTokenExchangeDto } from "../dtos/oauth-callback.dto";
import { AuthCookieInterceptor } from "../interceptors/auth-cookie.interceptor";
import { GitHubOAuthService } from "../services/github-oauth.service";
import { JwtAuthService } from "../services/jwt-auth.service";
import { BaseOAuthController } from "./base-oauth.controller";

@ApiTags("GitHub OAuth")
@Controller("auth/github")
@UsePipes(new ValidationPipe())
@UseInterceptors(AuthCookieInterceptor)
export class GitHubOAuthController extends BaseOAuthController {
  protected oauthService: GitHubOAuthService;
  protected jwtAuthService: JwtAuthService;

  constructor(
    githubOAuthService: GitHubOAuthService,
    jwtAuthService: JwtAuthService,
  ) {
    super();
    this.oauthService = githubOAuthService;
    this.jwtAuthService = jwtAuthService;
  }

  /**
   * Get GitHub OAuth authorization URL
   * Redirects to GitHub for authentication
   * Use this for traditional web apps with server-side redirects
   */
  @Get()
  @ApiOkResponse({ description: "Redirects to GitHub OAuth or returns authorization URL" })
  async githubAuth(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Query() query: OAuthAuthDto,
  ) {
    return this.handleOAuthRedirect(req, res, query);
  }

  /**
   * GitHub OAuth callback endpoint
   * GitHub redirects back here after authentication with authorization code
   */
  @Get("callback")
  @ApiOkResponse({ description: "Returns tokens and user data, or redirects with tokens", type: SignInSuccessResponseDto })
  @ApiHttpException(() => [BadRequestException, UnauthorizedException])
  async githubAuthCallback(
    @Query() query: OAuthCallbackDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.handleOAuthCallback(res, query.code, query.state);
  }

  /**
   * Exchange GitHub authorization code for tokens
   * Use this for client-side applications that handle OAuth flow
   */
  @Post("token")
  @ApiOkResponse({ description: "Returns tokens and user data", type: SignInSuccessResponseDto })
  @ApiHttpException(() => [BadRequestException, UnauthorizedException])
  @HttpCode(200)
  async exchangeGitHubCode(@Body() body: OAuthTokenExchangeDto): Promise<SignInSuccessResponseDto> {
    return this.handleTokenExchange(body.code, body.state);
  }
}
