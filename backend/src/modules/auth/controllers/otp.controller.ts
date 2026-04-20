import { BadRequestException, Body, Controller, HttpCode, Post, Req, UnauthorizedException, UseInterceptors, UsePipes, ValidationPipe } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { ApiHttpException } from "../../../common/decorators/api-http-exception.decorator";
import { OtpService } from "../services/otp.service";
import { AccountService } from "../services/account.service";
import { JwtAuthService } from "../services/jwt-auth.service";
import { RequestOtpDto, VerifyOtpDto } from "../dtos/otp.dto";
import { SignInSuccessResponseDto } from "../dtos/auth.dto";
import { AuthCookieInterceptor } from "../interceptors/auth-cookie.interceptor";

@ApiTags("OTP")
@Controller("auth/otp")
@UsePipes(new ValidationPipe())
@UseInterceptors(AuthCookieInterceptor)
export class OtpController {
  constructor(
    private otpService: OtpService,
    private accountService: AccountService,
    private jwtAuthService: JwtAuthService,
  ) { }

  /**
   * Request OTP via email or SMS
   */
  @Post("request")
  @ApiOkResponse({ description: "OTP sent successfully" })
  @ApiHttpException(() => [BadRequestException])
  @HttpCode(200)
  async requestOtp(@Body() dto: RequestOtpDto, @Req() req: Request) {
    const ipAddress = req.ip;
    const userAgent = req.headers["user-agent"];

    if (dto.email) {
      return this.otpService.requestEmailOtp(dto.email, ipAddress, userAgent);
    }

    if (dto.phoneNumber) {
      return this.otpService.requestSmsOtp(dto.phoneNumber, ipAddress, userAgent);
    }

    throw new BadRequestException("Email or phone number required");
  }

  /**
   * Verify OTP code
   */
  @Post("verify")
  @ApiOkResponse({ type: SignInSuccessResponseDto })
  @ApiHttpException(() => [BadRequestException, UnauthorizedException])
  @HttpCode(200)
  async verifyOtp(@Body() dto: VerifyOtpDto, @Req() req: Request): Promise<SignInSuccessResponseDto> {
    const ipAddress = req.ip;
    const userAgent = req.headers["user-agent"];

    // Find user by email or phone
    let userId: string;
    if (dto.email) {
      const user = await this.accountService.findUserByEmail(dto.email);
      if (!user)
        throw new UnauthorizedException("User not found");
      userId = user.id;
    }
    else if (dto.phoneNumber) {
      // TODO: Find user by phone number
      throw new BadRequestException("Phone verification not yet implemented");
    }
    else {
      throw new BadRequestException("Email or phone number required");
    }

    // Verify OTP (now returns {message: string})
    await this.otpService.verifyOtp(userId, dto.code, dto.method, ipAddress, userAgent);

    // Get user and generate token
    const user = await this.accountService.getUser(userId);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    const { accessToken } = this.jwtAuthService.generateToken(user);

    return {
      accessToken,
      user,
    };
  }
}
