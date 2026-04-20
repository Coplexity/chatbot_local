import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JsonWebTokenError, JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { JwtPayloadDto } from "../dtos/jwt-payload.dto";
import { UserEntity } from "../entities/user.entity";
import { CookieService } from "./cookie.service";

/**
 * JWT Authentication Service
 * Handles token generation and verification without Passport
 */
@Injectable()
export class JwtAuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly cookieService: CookieService,
  ) { }

  /**
   * Generate JWT token for authenticated user
   */
  generateToken(user: UserEntity): { accessToken: string } {
    const currentTimestamp = Math.floor(Date.now() / 1000);

    const payload: Omit<JwtPayloadDto, "exp"> = {
      sub: user.id,
      roles: user.roles,
      role: user.role,
      iat: currentTimestamp,
    };

    const accessToken = this.jwtService.sign(payload);

    return { accessToken };
  }

  /**
   * Extract JWT token from request (Bearer token or Cookie)
   */
  extractTokenFromRequest(request: Request): string | null {
    // Try Bearer token first
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7);
    }

    // Try Cookie
    const cookieToken = request.cookies?.[this.cookieService.getCookieName()];
    if (cookieToken) {
      return cookieToken;
    }

    return null;
  }

  /**
   * Verify JWT token and extract payload
   */
  async verifyToken(token: string): Promise<JwtPayloadDto> {
    try {
      return this.jwtService.verify<JwtPayloadDto>(token);
    }
    catch (error) {
      if (error instanceof JsonWebTokenError) {
        throw new UnauthorizedException("Invalid jwt token");
      }
      throw error;
    }
  }
}
