import { MailerService } from "@nestjs-modules/mailer";
import { BadRequestException, Inject, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { REQUEST } from "@nestjs/core";
import { createHash, randomBytes } from "crypto";
import { Request } from "express";
import { SecurityAction } from "../entities/security-log.entity";
import { MagicLinkRepository } from "../repositories/magic-link.repository";
import { SecurityLogRepository } from "../repositories/security-log.repository";
import { UserRepository } from "../repositories/user.repository";
import { ConfigService } from "@nestjs/config";
import { formatExpiry } from "../utils/format-expiry.util";

@Injectable()
export class MagicLinkService {
  private readonly logger = new Logger(MagicLinkService.name);
  private readonly MAGIC_LINK_EXPIRY: number;

  constructor(
    @Inject(REQUEST) private request: Request,
    private readonly magicLinkRepository: MagicLinkRepository,
    private readonly userRepository: UserRepository,
    private readonly securityLogRepository: SecurityLogRepository,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {
    this.MAGIC_LINK_EXPIRY = this.configService.getOrThrow<number>("magicLink.expiry");
  }

  /**
   * Generate a secure random token for magic link
   */
  private generateToken(): string {
    return randomBytes(32).toString("hex");
  }

  /**
   * Hash token for secure storage
   */
  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  /**
   * Request magic link for email
   */
  async requestMagicLink(
    email: string,
    redirectUrl?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    // Find user by email
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new BadRequestException("User with the provided email does not exist");
    }

    // Generate token
    const token = this.generateToken();
    const hashedToken = this.hashToken(token);

    // Calculate expiry
    const expiresAt = new Date(Date.now() + this.MAGIC_LINK_EXPIRY);

    // Delete any existing unused magic links for this user
    await this.magicLinkRepository.deleteByUserId(user.id);

    // Create magic link record
    await this.magicLinkRepository.create({
      userId: user.id,
      token: hashedToken,
      email,
      expiresAt,
      used: false,
      ipAddress,
      userAgent,
    });

    // Build magic link URL
    const hostname = this.request.get("host");
    const protocol = this.request.protocol;
    const url = new URL(`${protocol}://${hostname}/auth/magic-link/verify`);
    url.searchParams.append("token", token);

    if (redirectUrl) {
      url.searchParams.append("redirect", encodeURIComponent(redirectUrl));
    }

    const magicLinkUrl = url.toString();

    // Send magic link via email
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: "Your Magic Link",
        template: "magic-link.hbs",
        context: {
          magicLinkUrl,
          expiry: formatExpiry(this.MAGIC_LINK_EXPIRY),
        },
      });
      this.logger.debug(`Magic link email sent successfully to: ${email}`);
    }
    catch (error) {
      this.logger.error(`Failed to send magic link email: ${error.message}`);
      throw new BadRequestException("Failed to send magic link email");
    }

    // Log security event
    await this.securityLogRepository.logAction(
      SecurityAction.PASSWORD_RESET_REQUEST,
      user.id,
      {
        success: true,
        ipAddress,
        userAgent,
        additionalData: { method: "magic_link" },
      },
    );

    this.logger.debug(`Magic link request processed for user: ${user.id}`);

    return { message: "Magic link sent successfully" };
  }

  /**
   * Verify magic link token
   */
  async verifyMagicLink(
    token: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ userId: string; email: string }> {
    // Hash the token
    const hashedToken = this.hashToken(token);

    // Find magic link by hashed token
    const magicLink = await this.magicLinkRepository.findByToken(hashedToken);

    if (!magicLink) {
      this.logger.debug("Invalid magic link token attempted");
      throw new UnauthorizedException("Invalid or expired magic link");
    }

    // Check if already used
    if (magicLink.used) {
      this.logger.debug(`Magic link already used for user: ${magicLink.userId}`);
      await this.securityLogRepository.logAction(
        SecurityAction.LOGIN_FAILED,
        magicLink.userId,
        {
          success: false,
          failureReason: "Magic link already used",
          ipAddress,
          userAgent,
        },
      );
      throw new UnauthorizedException("Magic link has already been used");
    }

    // Check if expired
    if (new Date() > magicLink.expiresAt) {
      this.logger.debug(`Magic link expired for user: ${magicLink.userId}`);
      await this.securityLogRepository.logAction(
        SecurityAction.LOGIN_FAILED,
        magicLink.userId,
        {
          success: false,
          failureReason: "Magic link expired",
          ipAddress,
          userAgent,
        },
      );
      throw new UnauthorizedException("Magic link has expired");
    }

    // Mark as used
    await this.magicLinkRepository.markAsUsed(magicLink.id, ipAddress, userAgent);

    // Log successful verification
    await this.securityLogRepository.logAction(
      SecurityAction.LOGIN,
      magicLink.userId,
      {
        success: true,
        ipAddress,
        userAgent,
        additionalData: { method: "magic_link" },
      },
    );

    this.logger.debug(`Magic link verified successfully for user: ${magicLink.userId}`);

    return {
      userId: magicLink.userId,
      email: magicLink.email,
    };
  }

  /**
   * Clean up expired magic links (should be run periodically)
   */
  async cleanupExpiredLinks(): Promise<number> {
    const deletedCount = await this.magicLinkRepository.deleteExpired();
    this.logger.debug(`Cleaned up ${deletedCount} expired magic links`);
    return deletedCount;
  }
}
