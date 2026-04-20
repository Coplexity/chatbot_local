import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { Response } from "express";
import { CookieService } from "../services/cookie.service";

/**
 * Auth Cookie Interceptor
 * Automatically sets authentication cookies for responses that contain an accessToken
 *
 * This interceptor checks if the response contains an accessToken property
 * and automatically sets the authentication cookie with the access token.
 */
@Injectable()
export class AuthCookieInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuthCookieInterceptor.name);

  constructor(private readonly cookieService: CookieService) { }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse<Response>();
    if (!this.cookieService.isEnabled()) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === "object" && "accessToken" in data && data.accessToken) {
          const cookieConfig = this.cookieService.getCookieConfig();
          if (cookieConfig) {
            // Set the authentication cookie
            response.cookie(cookieConfig.name, data.accessToken, cookieConfig.options);
          }
          else {
            this.logger.warn("Cookie config not available, skipping cookie setting");
          }
        }

        return data;
      }),
    );
  }
}
