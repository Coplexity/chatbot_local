import { Injectable } from "@nestjs/common";
import { ChatApiProviderService } from "./chat-api.provider";

@Injectable()
export class ChatApiService {
  constructor(private readonly chatApiProvider: ChatApiProviderService) {}

  async generateResponse(
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
    streaming = false,
    role = "",
    mode: "basic" | "deep" = "basic",
    userId: string | null = null,
    user_ids?: string[],
  ) {
    return this.chatApiProvider.generateResponse(messages, streaming, role, mode, userId, user_ids);
  }

  countTokens(text: string): number {
    return this.chatApiProvider.countTokens(text);
  }
}
