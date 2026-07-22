import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppConfigModule } from "../../configs/app-config.module";
import { JwtConfig } from "../../configs/root-config";

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
import { GitHubOAuthService } from "./services/github-oauth.service";
import { GoogleOAuthService } from "./services/google-oauth.service";
import { JwtAuthService } from "./services/jwt-auth.service";

import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@Global()
@Module({
  imports: [
    AppConfigModule,
    TypeOrmModule.forFeature([
      UserEntity,
      DocumentUserEntity,
      AccountEntity,
    ]),
    JwtModule.registerAsync({
      imports: [AppConfigModule],
      inject: [JwtConfig],
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

    UserRepository,
    DocumentUserRepository,
    AccountRepository,

    JwtAuthGuard,
  ],
  exports: [JwtAuthGuard, GoogleOAuthService, GitHubOAuthService, JwtAuthService, AccountService],
})
export class AuthModule { }
