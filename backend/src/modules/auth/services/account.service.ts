import { MailerService } from "@nestjs-modules/mailer";
import { BadRequestException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { compareSync, hashSync } from "bcrypt";
import { nanoid } from "nanoid";
import { SignInDto, SignUpDto } from "../dtos/auth.dto";
import { ChangePasswordDto, RequestPasswordResetDto, ResetPasswordWithCodeDto } from "../dtos/password.dto";
import { TokenType } from "../entities/token.entity";
import { UserEntity } from "../entities/user.entity";
import { PasswordRepository } from "../repositories/password.repository";
import { TokenRepository } from "../repositories/token.repository";
import { UserRepository } from "../repositories/user.repository";
import { ConfigService } from "@nestjs/config";

/**
 * Account Service
 * Handles all user account operations including authentication, profile management, and password operations
 */
@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);
  private readonly SALT_ROUND: number;
  private readonly PASSWORD_RESET_TOKEN_EXPIRATION: number;
  constructor(
    private userRepo: UserRepository,
    private passwordRepo: PasswordRepository,
    private tokenRepo: TokenRepository,
    private mailerService: MailerService,
    private configService: ConfigService,
  ) {
    this.SALT_ROUND = this.configService.getOrThrow<number>("crypto.saltRounds");
    this.PASSWORD_RESET_TOKEN_EXPIRATION = this.configService.getOrThrow<number>("token.passwordResetExpiry");
  }

  /**
   * Sign in with username/email and password
   */
  async signIn(dto: SignInDto): Promise<UserEntity> {
    const user = await this.userRepo.findOne({
      where: [
        { username: dto.username },
        { email: dto.username },
      ],
    });

    if (!user) {
      throw new UnauthorizedException("Not found user");
    }

    const userPassword = await this.passwordRepo.findOne({
      where: { userId: user.id },
    });

    const isPasswordMatch = userPassword && compareSync(dto.password, userPassword.password);
    if (!isPasswordMatch) {
      throw new UnauthorizedException("Username or password is not correct");
    }

    return user;
  }

  /**
   * Sign up new user with email and password
   */
  async signUp(dto: SignUpDto): Promise<UserEntity> {
    const { email, username, name } = dto;
    const existingUser = await this.userRepo.findOne({
      where: [
        { email },
        ...(username ? [{ username }] : []),
      ],
    });

    if (existingUser) {
      throw new BadRequestException("User already exists");
    }

    const user = this.userRepo.create({
      email,
      username,
      name,
    });
    await this.userRepo.save(user);

    const userPassword = this.passwordRepo.create({
      user,
      password: hashSync(dto.password, this.SALT_ROUND),
    });
    await this.passwordRepo.save(userPassword);

    this.logger.log(`New user registered: ${email}`);

    return user;
  }

  /**
   * Get user by ID
   */
  async getUser(userId: string) {
    const user = await this.userRepo.findOne({
      where: {
        id: userId,
      },
    });

    return user;
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email: string) {
    return this.userRepo.findOne({
      where: { email },
    });
  }

  /**
   * Update user profile
   */
  async updateUser(userId: string, updateData: Partial<UserEntity>) {
    const user = await this.userRepo.findOne({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new BadRequestException("User not found");
    }

    Object.assign(user, updateData);
    await user.save();

    return user;
  }

  /**
   * Change username
   */
  async changeUsername(userId: string, newUsername: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException("User not found");
    }

    const existingUser = await this.userRepo.findOne({
      where: {
        username: newUsername,
      },
    });

    if (existingUser) {
      throw new BadRequestException("Username already exists");
    }

    user.username = newUsername;
    await user.save();

    return { message: "Username changed successfully" };
  }

  /**
   * Get password info (last updated date)
   */
  async getPassword(userId: string) {
    let updatedAt: Date | null = null;

    const userPassword = await this.passwordRepo.findOne({
      where: {
        userId,
      },
    });

    if (userPassword) {
      updatedAt = userPassword.updatedAt;
    }

    return {
      updatedAt,
    };
  }

  /**
   * Create password for user who doesn't have one
   */
  async createPassword(userId: string, dto: ChangePasswordDto) {
    const userPassword = await this.passwordRepo.findOne({
      where: {
        userId,
      },
    });

    if (userPassword) {
      throw new BadRequestException("User already has password");
    }

    const newUserPassword = this.passwordRepo.create({
      userId,
      password: hashSync(dto.newPassword, this.SALT_ROUND),
    });

    await this.passwordRepo.insert(newUserPassword);

    return { message: "Password created successfully" };
  }

  /**
   * Change existing password
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const userPassword = await this.passwordRepo.findOne({
      where: {
        userId,
      },
    });

    if (!userPassword) {
      throw new BadRequestException("User does not have password");
    }

    const isPasswordMatch = compareSync(dto.oldPassword, userPassword.password);

    if (!isPasswordMatch) {
      throw new BadRequestException("Old password is not correct");
    }

    userPassword.password = hashSync(dto.newPassword, this.SALT_ROUND);
    await userPassword.save();

    this.logger.log(`Password changed for user: ${userId}`);

    return { message: "Password changed successfully" };
  }

  /**
   * Request password reset (send email with reset link)
   */
  async requestPasswordReset(dto: RequestPasswordResetDto) {
    const user = await this.userRepo.findOne({
      where: {
        email: dto.email,
      },
    });

    if (!user) {
      throw new BadRequestException("Email not exists");
    }

    const userToken = this.tokenRepo.create({
      userId: user.id,
      token: nanoid(64),
      tokenType: TokenType.PASSWORD_RESET,
      expiresAt: new Date(Date.now() + this.PASSWORD_RESET_TOKEN_EXPIRATION),
    });

    await userToken.save();

    const code = `${userToken.id}$${userToken.token}`;
    const resetLink = new URL(dto.endpointUrl);
    resetLink.searchParams.append("code", code);

    try {
      await this.mailerService.sendMail({
        subject: "Password Reset",
        template: "password-reset.hbs",
        to: user.email,
        context: {
          resetLink: resetLink.toString(),
        },
      });
    }
    catch (error) {
      this.logger.error("Failed to send password reset email", error.stack);
      throw new BadRequestException("Failed to send reset email. Please try again later.");
    }

    return { message: "Password reset email sent successfully" };
  }

  /**
   * Reset password using code from email
   */
  async resetPasswordWithCode(dto: ResetPasswordWithCodeDto) {
    const [tokenId, token] = dto.code.split("$");

    const userToken = await this.tokenRepo.findOne({
      where: {
        id: tokenId,
      },
    });

    if (
      !userToken
      || userToken.token !== token
      || userToken.tokenType !== TokenType.PASSWORD_RESET
      || userToken.expiresAt < new Date()
      || userToken.revoked
    ) {
      throw new BadRequestException("Invalid Code");
    }

    userToken.revoked = true;

    const userPassword = await this.passwordRepo.findOne({
      where: {
        userId: userToken.userId,
      },
    });

    if (!userPassword) {
      throw new BadRequestException("User does not have password");
    }

    userPassword.password = hashSync(dto.newPassword, this.SALT_ROUND);

    await Promise.all([userToken.save(), userPassword.save()]);

    return { message: "Password reset successfully" };
  }
}
