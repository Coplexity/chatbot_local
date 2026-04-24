import { Module } from "@nestjs/common";

import { AppConfigModule } from "./configs/app-config.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ChatModule } from "./modules/chat/chat.module";
import { DatabaseModule } from "./modules/database/database.module";
import { HealthModule } from "./modules/health/health.module";

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    AuthModule,
    HealthModule,
    ChatModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
