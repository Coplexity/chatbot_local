import { CacheModule } from "@nestjs/cache-manager";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuthModule } from "../auth/auth.module";
import { ChatController } from "./controllers/chat.controller";
import { GuestChatController } from "./controllers/guest-chat.controller";
import { ReferenceController } from "./controllers/reference.controller";
import { CitationEntity } from "./entities/citation.entity";
import { ConversationSummaryEntity } from "./entities/conversation-summary.entity";
import { ConversationEntity } from "./entities/conversation.entity";
import { MessageEntity } from "./entities/message.entity";
import { ConversationRepository } from "./repositories/conversation.repository";
import { MessageRepository } from "./repositories/message.repository";
import { ChatApiProviderService } from "./services/chat-api.provider";
import { ChatApiService } from "./services/chat-api.service";
import { AdminUserIdsService } from "./services/admin-user-ids.service";
import { ChatService } from "./services/chat.service";
import { MessageService } from "./services/message.service";
import { ReferenceMetadataService } from "./services/reference-metadata.service";

@Module({
  imports: [
    CacheModule.register(),
    TypeOrmModule.forFeature([
      ConversationEntity,
      MessageEntity,
      ConversationSummaryEntity,
      CitationEntity,
    ]),
    AuthModule,
  ],
  controllers: [ChatController, GuestChatController, ReferenceController],
  providers: [
    ConversationRepository,
    MessageRepository,
    AdminUserIdsService,
    ChatApiProviderService,
    ChatApiService,
    ChatService,
    MessageService,
    ReferenceMetadataService,
  ],
  exports: [ChatService, MessageService],
})
export class ChatModule { }
