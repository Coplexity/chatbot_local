import { BadRequestException, Body, ClassSerializerInterceptor, Controller, Get, HttpCode, Logger, Patch, Post, Req, Res, UnauthorizedException, UseGuards, UseInterceptors, UsePipes, ValidationPipe } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request, Response } from "express";
import { ApiHttpException } from "../../../common/decorators/api-http-exception.decorator";
import { UserDto } from "../dtos/user.dto";
import { AccountService } from "../services/account.service";
import { JwtAuthService } from "../services/jwt-auth.service";
import { GetUserId } from "../decorators/get-user-id.decorator";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { LogoutSuccessResponseDto, SignInDto, SignInSuccessResponseDto, SignUpDto, SignUpSuccessResponseDto } from "../dtos/auth.dto";
import { ChangePasswordDto, GetPasswordResponseDto } from "../dtos/password.dto";

@ApiTags("Account")
@Controller("auth")
@UsePipes(new ValidationPipe())
@UseInterceptors(ClassSerializerInterceptor)
export class AccountController {
  private readonly logger = new Logger(AccountController.name);

  constructor(
    private accountService: AccountService,
    private jwtAuthService: JwtAuthService,
  ) { }

  // ==================== Authentication Endpoints ====================

  @Post("sign-in")
  @ApiOkResponse({ type: SignInSuccessResponseDto })
  @ApiHttpException(() => [])
  @HttpCode(200)
  async signIn(@Body() dto: SignInDto): Promise<SignInSuccessResponseDto> {
    const user = await this.accountService.signIn(dto);
    const { accessToken } = this.jwtAuthService.generateToken(user);

    return {
      accessToken,
      user,
    };
  }

  @Post("sign-up")
  @ApiOkResponse({ type: SignUpSuccessResponseDto })
  @ApiHttpException(() => [])
  @HttpCode(200)
  async signUp(@Body() dto: SignUpDto): Promise<SignUpSuccessResponseDto> {
    const user = await this.accountService.signUp(dto);
    const { accessToken } = this.jwtAuthService.generateToken(user);

    return {
      accessToken,
      user,
    };
  }

  // ==================== User Profile Endpoints ====================

  @Get("me")
  @ApiBearerAuth()
  @ApiOkResponse({ type: UserDto })
  @ApiHttpException(() => [UnauthorizedException])
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async getUser(@GetUserId() userId: string) {
    return this.accountService.getUser(userId);
  }

  @Patch("me")
  @ApiBearerAuth()
  @ApiOkResponse({ type: UserDto })
  @ApiHttpException(() => [BadRequestException, UnauthorizedException])
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async updateUser(@GetUserId() userId: string, @Body() dto: Pick<UserDto, "fullName" | "email" | "role" | "chatRole" | "isActive">) {
    return this.accountService.updateUser(userId, dto);
  }

  // ==================== Password Management Endpoints ====================

  @Get("password")
  @ApiResponse({ type: GetPasswordResponseDto })
  @ApiHttpException(() => [UnauthorizedException])
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getPassword(@GetUserId() userId: string) {
    return this.accountService.getPassword(userId);
  }

  @Post("change-password")
  @ApiHttpException(() => [BadRequestException, UnauthorizedException])
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async changePassword(@GetUserId() userId: string, @Body() dto: ChangePasswordDto) {
    if (dto.oldPassword) {
      return this.accountService.changePassword(userId, dto);
    }
    else {
      return this.accountService.createPassword(userId, dto);
    }
  }
}
