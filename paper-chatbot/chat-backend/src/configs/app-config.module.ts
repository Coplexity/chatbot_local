import { MailerModule } from "@nestjs-modules/mailer";
import { HandlebarsAdapter } from "@nestjs-modules/mailer/dist/adapters/handlebars.adapter";
import { Global, Logger, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TypedConfigModule } from "nest-typed-config";
import { join } from "node:path";
import { createConfigLoaders } from "./config-loader";
import { DbConfig, MailerConfig, RootConfig } from "./root-config";
import { PrefixedSnakeNamingStrategy } from "./prefixed-snake-naming-strategy";

const logger = new Logger("AppConfigModule");

const typedConfigModule = TypedConfigModule.forRoot({
  schema: RootConfig,
  load: createConfigLoaders(),
  isGlobal: true,
});

@Global()
@Module({
  imports: [
    typedConfigModule,
    MailerModule.forRootAsync({
      useFactory: async (config: MailerConfig) => {
        const { host, port, secure, user, pass, from } = config;

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
      inject: [MailerConfig],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: async (config: DbConfig) => ({
        type: "postgres",
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        database: config.database,
        synchronize: config.synchronize,
        logging: config.logging,
        autoLoadEntities: true,
        namingStrategy: new PrefixedSnakeNamingStrategy(),
      }),
      inject: [DbConfig],
    }),
  ],
})
export class AppConfigModule { }
