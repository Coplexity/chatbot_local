import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";

export class AppConfig {
  @IsString()
  public readonly name: string = "Medical Chatbot";

  @Type(() => Number)
  @IsNumber()
  public readonly port: number = 3000;
}

export class JwtConfig {
  @IsString()
  public readonly algorithm: string = "HS256";

  @IsString()
  public readonly expiresIn: string = "2880m";

  @IsOptional()
  @IsString()
  public readonly secret?: string;

  @IsOptional()
  @IsString()
  public readonly privateKeyPath?: string;

  @IsOptional()
  @IsString()
  public readonly publicKeyPath?: string;
}

export class CorsConfig {
  @Type(() => Boolean)
  @IsBoolean()
  public readonly allowCredentials: boolean = true;

  @IsArray()
  @IsString({ each: true })
  public readonly allowedOrigins: string[] = [];
}

export class DbConfig {
  @IsString()
  public readonly host: string = "postgres";

  @Type(() => Number)
  @IsNumber()
  public readonly port: number = 5432;

  @IsString()
  public readonly username: string = "ai4life";

  @IsString()
  public readonly password: string = "change_me";

  @IsString()
  public readonly database: string = "medical-chatbot";

  @Type(() => Boolean)
  @IsBoolean()
  public readonly synchronize: boolean = false;

  @Type(() => Boolean)
  @IsBoolean()
  public readonly logging: boolean = false;
}

export class RedisConfig {
  @IsString()
  public readonly host: string = "redis";

  @Type(() => Number)
  @IsNumber()
  public readonly port: number = 6379;
}

export class MailerConfig {
  @IsOptional()
  @IsString()
  public readonly host?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  public readonly port?: number;

  @Type(() => Boolean)
  @IsBoolean()
  public readonly secure: boolean = false;

  @IsOptional()
  @IsString()
  public readonly user?: string;

  @IsOptional()
  @IsString()
  public readonly pass?: string;

  @IsOptional()
  @IsString()
  public readonly from?: string;
}

export class RagDatabaseConfig {
  @IsOptional()
  @IsString()
  public readonly url?: string;
}

export class GoogleConfig {
  @IsOptional()
  @IsString()
  public readonly clientID?: string;

  @IsOptional()
  @IsString()
  public readonly clientSecret?: string;

  @IsOptional()
  @IsString()
  public readonly callbackURL?: string;

  @IsString()
  public readonly scope: string = "email profile";
}

export class GithubConfig {
  @IsOptional()
  @IsString()
  public readonly clientID?: string;

  @IsOptional()
  @IsString()
  public readonly clientSecret?: string;

  @IsOptional()
  @IsString()
  public readonly callbackURL?: string;

  @IsString()
  public readonly scope: string = "user:email";
}

export class ChatApiConfig {
  @IsOptional()
  @IsString()
  public readonly url?: string;
}

export class RootConfig {
  @Type(() => AppConfig)
  @ValidateNested()
  public readonly app: AppConfig = new AppConfig();

  @Type(() => JwtConfig)
  @ValidateNested()
  public readonly jwt: JwtConfig = new JwtConfig();

  @Type(() => CorsConfig)
  @ValidateNested()
  public readonly cors: CorsConfig = new CorsConfig();

  @Type(() => DbConfig)
  @ValidateNested()
  public readonly db: DbConfig = new DbConfig();

  @Type(() => RedisConfig)
  @ValidateNested()
  public readonly redis: RedisConfig = new RedisConfig();

  @Type(() => MailerConfig)
  @ValidateNested()
  public readonly mailer: MailerConfig = new MailerConfig();

  @Type(() => RagDatabaseConfig)
  @ValidateNested()
  public readonly ragDatabase: RagDatabaseConfig = new RagDatabaseConfig();

  @Type(() => GoogleConfig)
  @ValidateNested()
  public readonly google: GoogleConfig = new GoogleConfig();

  @Type(() => GithubConfig)
  @ValidateNested()
  public readonly github: GithubConfig = new GithubConfig();

  @Type(() => ChatApiConfig)
  @ValidateNested()
  public readonly chatApi: ChatApiConfig = new ChatApiConfig();
}
