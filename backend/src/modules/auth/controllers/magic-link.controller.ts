import { BadRequestException, Body, Controller, Get, HttpCode, Post, Query, Req, Res, UnauthorizedException, UseInterceptors, UsePipes, ValidationPipe } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Request, Response } from "express";
import { ApiHttpException } from "../../../common/decorators/api-http-exception.decorator";
import { MagicLinkService } from "../services/magic-link.service";
import { AccountService } from "../services/account.service";
import { JwtAuthService } from "../services/jwt-auth.service";
import { RequestMagicLinkDto, VerifyMagicLinkDto, MagicLinkResponseDto } from "../dtos/magic-link.dto";
import { SignInSuccessResponseDto } from "../dtos/auth.dto";
import { AuthCookieInterceptor } from "../interceptors/auth-cookie.interceptor";

@ApiTags("Magic Link")
@Controller("auth/magic-link")
@UsePipes(new ValidationPipe())
@UseInterceptors(AuthCookieInterceptor)
export class MagicLinkController {
  constructor(
    private magicLinkService: MagicLinkService,
    private accountService: AccountService,
    private jwtAuthService: JwtAuthService,
  ) { }

  /**
   * Request magic link via email
   */
  @Post("request")
  @ApiOkResponse({ type: MagicLinkResponseDto })
  @ApiHttpException(() => [BadRequestException])
  @HttpCode(200)
  async requestMagicLink(@Body() dto: RequestMagicLinkDto, @Req() req: Request): Promise<MagicLinkResponseDto> {
    const ipAddress = req.ip;
    const userAgent = req.headers["user-agent"];

    const result = await this.magicLinkService.requestMagicLink(
      dto.email,
      dto.redirectUrl,
      ipAddress,
      userAgent,
    );

    return {
      success: true,
      message: result.message,
      email: dto.email,
    };
  }

  /**
   * Verify magic link token
   */
  @Get("verify")
  @ApiOkResponse({ type: SignInSuccessResponseDto })
  @ApiHttpException(() => [BadRequestException, UnauthorizedException])
  async verifyMagicLink(
    @Query() dto: VerifyMagicLinkDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddress = req.ip;
    const userAgent = req.headers["user-agent"];

    // Verify magic link
    const { userId } = await this.magicLinkService.verifyMagicLink(
      dto.token,
      ipAddress,
      userAgent,
    );

    // Get user and generate token
    const user = await this.accountService.getUser(userId);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    const { accessToken } = this.jwtAuthService.generateToken(user);

    // If redirect URL is provided, redirect with access token
    if (dto.redirect) {
      const redirectUrl = new URL(decodeURIComponent(dto.redirect));
      redirectUrl.searchParams.set("accessToken", accessToken);
      redirectUrl.searchParams.set("userId", user.id);
      return res.redirect(redirectUrl.toString());
    }

    // Otherwise, return JSON response
    return {
      accessToken,
      user,
    };
  }
}
