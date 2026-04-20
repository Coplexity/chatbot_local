import { MailerModule } from "@nestjs-modules/mailer";
import { Logger, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { env } from "node:process";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";
import { parse } from "yaml";
import { HandlebarsAdapter } from "@nestjs-modules/mailer/dist/adapters/handlebars.adapter";

const CONFIG_FOLDER = "config";
const logger = new Logger("AppConfigModule");

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: getConfigLoaders(["default", "config", env.NODE_ENV]),
    }),
    MailerModule.forRootAsync({
      useFactory: async (configService: ConfigService) => {
        const host = configService.get("mailer.host");
        const port = configService.get("mailer.port");
        const secure = configService.get("mailer.secure", false);
        const user = configService.get("mailer.user");
        const pass = configService.get("mailer.pass");
        const from = configService.get("mailer.from");

        if (!host || !port || !user || !pass) {
          logger.warn("Mailer configuration is not complete. Email sending will not work.");
        }

        return {
          transport: {
            host,
            port,
            secure,
            auth: {
              user,
              pass,
            },
          },
          defaults: {
            from,
          },
          template: {
            dir: join(__dirname, "..", "templates"),
            adapter: new HandlebarsAdapter(),
            options: {
              strict: true,
            },
          },
        };
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: async (configService: ConfigService) => ({
        type: "postgres",
        host: configService.get("db.host"),
        port: configService.get("db.port"),
        username: configService.get("db.username"),
        password: configService.get("db.password"),
        database: configService.get("db.database"),
        synchronize: configService.get("db.synchronize"),
        logging: configService.get("db.logging"),
        autoLoadEntities: true,
        namingStrategy: new SnakeNamingStrategy(),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppConfigModule { }

function getConfigLoaders(configNames: (string | undefined)[]): (() => Record<string, any>)[] {
  const loaders: (() => Record<string, any>)[] = [];
  for (const configName of configNames) {
    if (!configName) {
      continue;
    }

    const loader = createLoaderForConfigName(configName);

    if (loader) {
      loaders.push(loader);
    }
  }

  if (loaders.length === 0) {
    logger.warn("No configuration files were loaded. The loaders array is empty.");
  }

  return loaders;
}

function createLoaderForConfigName(baseName: string): (() => Record<string, any>) | null {
  const yamlPath = join(globalThis.appRoot, CONFIG_FOLDER, `${baseName}.yaml`);
  const ymlPath = join(globalThis.appRoot, CONFIG_FOLDER, `${baseName}.yml`);

  let configPath: string | null = null;

  if (existsSync(yamlPath)) {
    configPath = yamlPath;
  }
  else if (existsSync(ymlPath)) {
    configPath = ymlPath;
  }
  else {
    logger.warn(`Config file ${yamlPath} or ${ymlPath} does not exist.`);
    return null;
  }

  return () => {
    try {
      const parsedConfig = parse(readFileSync(configPath, "utf8"));
      if (!parsedConfig) {
        logger.warn(`Config file ${configPath} is empty or invalid.`);
        return {};
      }
      logger.log(`Config file ${configPath} loaded successfully.`);
      return parsedConfig;
    }
    catch (error) {
      logger.error(`Error reading or parsing the file ${configPath}:`, error);
      return {};
    }
  };
}
