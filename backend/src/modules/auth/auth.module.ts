import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";

// Controllers
import { AccountController } from "./controllers/account.controller";
import { GitHubOAuthController } from "./controllers/github-oauth.controller";
import { GoogleOAuthController } from "./controllers/google-oauth.controller";
import { MagicLinkController } from "./controllers/magic-link.controller";
import { OtpController } from "./controllers/otp.controller";
import { jwtConfigFactory } from "./utils/jwt-config.helper";

// Entities
import { AccountEntity } from "./entities/account.entity";
import { MagicLinkEntity } from "./entities/magic-link.entity";
import { OtpEntity } from "./entities/otp.entity";
import { PasswordEntity } from "./entities/password.entity";
import { SecurityLogEntity } from "./entities/security-log.entity";
import { TokenEntity } from "./entities/token.entity";
import { UserEntity } from "./entities/user.entity";

// Repositories
import { AccountRepository } from "./repositories/account.repository";
import { MagicLinkRepository } from "./repositories/magic-link.repository";
import { OtpRepository } from "./repositories/otp.repository";
import { PasswordRepository } from "./repositories/password.repository";
import { SecurityLogRepository } from "./repositories/security-log.repository";
import { TokenRepository } from "./repositories/token.repository";
import { UserRepository } from "./repositories/user.repository";

// Services
import { AccountService } from "./services/account.service";
import { CookieService } from "./services/cookie.service";
import { GitHubOAuthService } from "./services/github-oauth.service";
import { GoogleOAuthService } from "./services/google-oauth.service";
import { JwtAuthService } from "./services/jwt-auth.service";
import { MagicLinkService } from "./services/magic-link.service";
import { OtpService } from "./services/otp.service";

// Guards
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

// Interceptors
import { AuthCookieInterceptor } from "./interceptors/auth-cookie.interceptor";

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      AccountEntity,
      PasswordEntity,
      TokenEntity,
      OtpEntity,
      MagicLinkEntity,
      SecurityLogEntity,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: jwtConfigFactory,
    }),
  ],
  controllers: [
    AccountController,
    GoogleOAuthController,
    GitHubOAuthController,
    OtpController,
    MagicLinkController,
  ],
  providers: [
    // Services
    AccountService,
    JwtAuthService,
    GoogleOAuthService,
    GitHubOAuthService,
    OtpService,
    MagicLinkService,
    CookieService,

    // Repositories
    UserRepository,
    AccountRepository,
    PasswordRepository,
    TokenRepository,
    OtpRepository,
    MagicLinkRepository,
    SecurityLogRepository,

    // Guards
    JwtAuthGuard,

    // Interceptors
    AuthCookieInterceptor,
  ],
  exports: [JwtAuthGuard, GoogleOAuthService, GitHubOAuthService, JwtAuthService, AccountService],
})
export class AuthModule { }
