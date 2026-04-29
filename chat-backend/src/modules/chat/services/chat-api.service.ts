import { Injectable } from "@nestjs/common";
import { ChatApiProviderService } from "./chat-api.provider";

@Injectable()
export class ChatApiService {
  constructor(private readonly chatApiProvider: ChatApiProviderService) {}

  async generateResponse(
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
    streaming = false,
    role = "",
  ) {
    return this.chatApiProvider.generateResponse(messages, streaming, role);
  }

  countTokens(text: string): number {
    return this.chatApiProvider.countTokens(text);
  }
}
