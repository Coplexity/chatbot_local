import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AccountController } from "./controllers/account.controller";
import { GitHubOAuthController } from "./controllers/github-oauth.controller";
import { GoogleOAuthController } from "./controllers/google-oauth.controller";
import { jwtConfigFactory } from "./utils/jwt-config.helper";

import { AccountEntity } from "./entities/account.entity";
import { DocumentUserEntity } from "./entities/document-user.entity";
import { UserEntity } from "./entities/user.entity";

import { AccountRepository } from "./repositories/account.repository";
import { DocumentUserRepository } from "./repositories/python-user.repository";
import { UserRepository } from "./repositories/user.repository";

import { AccountService } from "./services/account.service";
import { CookieService } from "./services/cookie.service";
import { GitHubOAuthService } from "./services/github-oauth.service";
import { GoogleOAuthService } from "./services/google-oauth.service";
import { JwtAuthService } from "./services/jwt-auth.service";

import { JwtAuthGuard } from "./guards/jwt-auth.guard";

import { AuthCookieInterceptor } from "./interceptors/auth-cookie.interceptor";

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      DocumentUserEntity,
      AccountEntity,
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
  ],
  providers: [
    AccountService,
    JwtAuthService,
    GoogleOAuthService,
    GitHubOAuthService,
    CookieService,

    UserRepository,
    DocumentUserRepository,
    AccountRepository,

    JwtAuthGuard,

    AuthCookieInterceptor,
  ],
  exports: [JwtAuthGuard, GoogleOAuthService, GitHubOAuthService, JwtAuthService, AccountService],
})
export class AuthModule { }
