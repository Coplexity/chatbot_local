import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { REQUEST } from "@nestjs/core";
import { Request, Response } from "express";

export interface CookieConfig {
  name: string;
  options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "none" | "lax" | "strict";
    maxAge: number;
    path: string;
    domain?: string;
  };
}

/**
 * Cookie Service
 * Handles cookie configuration based on environment and hostname
 */
@Injectable()
export class CookieService {
  private readonly AUTH_COOKIE_ENABLED: boolean;
  private readonly AUTH_COOKIE_NAME: string;
  private readonly AUTH_COOKIE_MAX_AGE: number;
  private readonly AUTH_COOKIE_DOMAINS: string[];
  private readonly AUTH_COOKIE_SAME_SITE: "none" | "lax" | "strict" = "none";

  constructor(
    private readonly configService: ConfigService,
    @Inject(REQUEST) private request: Request,
  ) {
    this.AUTH_COOKIE_ENABLED = this.configService.getOrThrow<boolean>("authCookie.enabled");
    this.AUTH_COOKIE_NAME = this.configService.getOrThrow<string>("authCookie.name");
    this.AUTH_COOKIE_MAX_AGE = this.configService.getOrThrow<number>("authCookie.maxAge");
    this.AUTH_COOKIE_DOMAINS = this.configService.get<string[]>("authCookie.domains", []);
    this.AUTH_COOKIE_SAME_SITE = this.configService.get<"none" | "lax" | "strict">("authCookie.sameSite", "none");
  }

  isEnabled(): boolean {
    return this.AUTH_COOKIE_ENABLED;
  }

  private buildCookieOptions(overrides?: { domain?: string; sameSite?: "none" | "lax" | "strict" }): CookieConfig["options"] {
    const secure = this.request.protocol === "https" || this.request.get("x-forwarded-proto") === "https";

    return {
      httpOnly: true,
      secure,
      sameSite: overrides?.sameSite ?? this.AUTH_COOKIE_SAME_SITE,
      maxAge: this.AUTH_COOKIE_MAX_AGE,
      path: "/",
      ...(overrides?.domain ? { domain: overrides.domain } : {}),
    };
  }

  /**
   * Get cookie configuration based on environment
   */
  getCookieConfig(): CookieConfig | null {
    const hostname = this.request.get("host")?.split(":")[0]; // Remove port if present
    if (!hostname) {
      return null;
    }
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
    const domain = this.AUTH_COOKIE_DOMAINS.find(domain => hostname.endsWith(domain));
    if (domain) {
      return {
        name: this.AUTH_COOKIE_NAME,
        options: this.buildCookieOptions({ domain }),
      };
    }

    if (isLocalhost) {
      return {
        name: this.AUTH_COOKIE_NAME,
        options: this.buildCookieOptions({ sameSite: "lax" }),
      };
    }

    return null;
  }

  clearAuthCookie(response: Response): void {
    const cookieConfig = this.getCookieConfig();

    response.clearCookie(
      this.AUTH_COOKIE_NAME,
      cookieConfig?.options ?? this.buildCookieOptions({ sameSite: "lax" }),
    );
  }

  /**
   * Get cookie name
   */
  getCookieName(): string {
    return this.AUTH_COOKIE_NAME;
  }
}
