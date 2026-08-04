import { Injectable, Logger } from "@nestjs/common";
import { ChatApiConfig } from "../../../configs/root-config";
import {
  ChatApiMessage,
  ChatApiResponse,
  ChatApiStreamResponse,
  ChatApiStreamChunk,
} from "./chat-api.interface";
import { AdminUserIdsService } from "./admin-user-ids.service";

const ROLE_MAPPING = {
  bac_si_tram_y_te: "bac_si_tramyte",
};

@Injectable()
export class ChatApiProviderService {
  private readonly logger = new Logger(ChatApiProviderService.name);
  private readonly apiUrl: string;

  constructor(
    private readonly chatApiConfig: ChatApiConfig,
    private readonly adminUserIdsService: AdminUserIdsService,
  ) {
    this.apiUrl = this.chatApiConfig.url || "http://localhost:8000";
  }

  async generateResponse(
    messages: ChatApiMessage[],
    streaming = false,
    role = "",
    mode: "basic" | "deep" = "basic",
    userId: string | null = null,
    user_ids?: string[],
  ): Promise<ChatApiResponse | ChatApiStreamResponse> {
    if (streaming) {
      return this.generateStreamingResponse(messages, role, mode, userId, user_ids);
    }

    return this.generateNonStreamingResponse(messages, role, mode, userId, user_ids);
  }

  private readChunkBuffer(buffer: string): {
    remainingBuffer: string;
    messages: ParsedSseMessage[];
  } {
    const normalizedBuffer = buffer.replace(/\r\n/g, "\n");
    const parts = normalizedBuffer.split("\n\n");
    const remainingBuffer = parts.pop() ?? "";
    const messages = parts
      .map(part => this.parseSseMessage(part))
      .filter((message): message is ParsedSseMessage => message !== null);

    return {
      remainingBuffer,
      messages,
    };
  }

  private flushChunkBuffer(buffer: string): ParsedSseMessage[] {
    const normalizedBuffer = buffer.replace(/\r\n/g, "\n").trim();
    if (!normalizedBuffer) {
      return [];
    }

    const message = this.parseSseMessage(normalizedBuffer);
    return message ? [message] : [];
  }

  private formatUserIds(user_ids?: string[]): string {
    return user_ids?.map(userId => userId.trim()).filter(Boolean).join(",") ?? "";
  }

  private hasUserIds(user_ids?: string[]): boolean {
    return Boolean(user_ids?.some(userId => userId.trim()));
  }

  private async resolvePayloadUserIds(user_ids?: string[]): Promise<string[]> {
    if (this.hasUserIds(user_ids)) {
      return user_ids ?? [];
    }

    return this.adminUserIdsService.getAdminUserIds();
  }

  private parseSseMessage(rawMessage: string): ParsedSseMessage | null {
    const lines = rawMessage.split("\n");
    let event: string | undefined;
    const dataLines: string[] = [];

    for (const line of lines) {
      if (!line || line.startsWith(":")) {
        continue;
      }

      if (line.startsWith("event:")) {
        event = line.slice(6).trim();
        continue;
      }

      if (line.startsWith("data:")) {
        const value = line.slice(5);
        dataLines.push(value.startsWith(" ") ? value.slice(1) : value);
      }
    }

    if (dataLines.length === 0) {
      return null;
    }

    return {
      event,
      data: dataLines.join("\n"),
    };
  }

  private processSseMessage(
    message: ParsedSseMessage,
    options: { includeTrace: boolean },
  ): {
    shouldStop: boolean;
    chunks: ChatApiStreamChunk[];
    fullText: string;
  } {
    if (message.event === "done" || message.data === "[DONE]") {
      return {
        shouldStop: true,
        chunks: [],
        fullText: "",
      };
    }

    if (message.event === "trace") {
      const trace = message.data.trim();

      return {
        shouldStop: false,
        chunks: options.includeTrace && trace
          ? [{ type: "trace", trace }]
          : [],
        fullText: "",
      };
    }

    const payload = this.parseStreamPayload(message.data);

    if (payload?.type === "trace") {
      const trace = typeof payload.text === "string"
        ? payload.text.trim()
        : "";

      return {
        shouldStop: false,
        chunks: options.includeTrace && trace
          ? [{ type: "trace", trace }]
          : [],
        fullText: "",
      };
    }

    if (payload?.type === "text" && typeof payload.text === "string") {
      return {
        shouldStop: false,
        chunks: payload.text ? [{ type: "text", text: payload.text }] : [],
        fullText: payload.text,
      };
    }

    if (payload?.type === "done") {
      return {
        shouldStop: true,
        chunks: [],
        fullText: "",
      };
    }

    const payloadText = this.extractTextFromStreamPayload(message.data);
    const chunks: ChatApiStreamChunk[] = [];
    const text = payloadText || message.data;

    if (text) {
      chunks.push({ type: "text", text });
    }

    return {
      shouldStop: false,
      chunks,
      fullText: text,
    };
  }

  private async generateNonStreamingResponse(
    messages: ChatApiMessage[],
    role = "",
    mode: "basic" | "deep" = "basic",
    userId: string | null = null,
    user_ids?: string[],
  ): Promise<ChatApiResponse> {
    try {
      // Get the last user message as the question
      const lastUserMessage = messages.filter(m => m.role === "user").pop();
      if (!lastUserMessage) {
        throw new Error("No user message found");
      }

      const payloadUserIds = await this.resolvePayloadUserIds(user_ids);
      const requestBody = {
        query: lastUserMessage.content,
        role: ROLE_MAPPING[role] || role,
        mode,
        user_id: userId,
        user_ids: this.formatUserIds(payloadUserIds),
      };
      this.logger.debug(`[ChatApiProvider] POST ${this.apiUrl}/api/chat/stream — body: ${JSON.stringify(requestBody)}`);

      const response = await fetch(`${this.apiUrl}/api/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Chat API error: ${response.statusText}`);
      }

      // Collect full response from stream
      let fullContent = "";
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body reader available");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const { messages: parsedMessages, remainingBuffer } = this.readChunkBuffer(buffer);
          buffer = remainingBuffer;

          let shouldStop = false;
          for (const message of parsedMessages) {
            const result = this.processSseMessage(message, {
              includeTrace: false,
            });

            if (result.fullText) {
              fullContent += result.fullText;
            }

            if (result.shouldStop) {
              shouldStop = true;
              break;
            }
          }

          if (shouldStop) {
            break;
          }
        }

        if (buffer.trim()) {
          for (const message of this.flushChunkBuffer(buffer)) {
            const result = this.processSseMessage(message, {
              includeTrace: false,
            });

            if (result.fullText) {
              fullContent += result.fullText;
            }
          }
        }
      }
      finally {
        reader.releaseLock();
      }

      const tokenCount = this.countTokens(fullContent);

      return {
        content: fullContent,
        tokenCount,
      };
    }
    catch (error) {
      this.logger.error("Error calling Chat API", error);
      throw error;
    }
  }

  private async generateStreamingResponse(
    messages: ChatApiMessage[],
    role = "",
    mode: "basic" | "deep" = "basic",
    userId: string | null = null,
    user_ids?: string[],
  ): Promise<ChatApiStreamResponse> {
    try {
      // Get the last user message as the question
      const lastUserMessage = messages.filter(m => m.role === "user").pop();
      if (!lastUserMessage) {
        throw new Error("No user message found");
      }

      const payloadUserIds = await this.resolvePayloadUserIds(user_ids);
      const requestBody = {
        query: lastUserMessage.content,
        role: ROLE_MAPPING[role] || role,
        mode,
        user_id: userId,
        user_ids: this.formatUserIds(payloadUserIds),
      };
      this.logger.debug(`[ChatApiProvider] POST ${this.apiUrl}/api/chat/stream — body: ${JSON.stringify(requestBody)}`);

      const response = await fetch(`${this.apiUrl}/api/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Chat API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body reader available");
      }

      const decoder = new TextDecoder();
      const readChunkBuffer = this.readChunkBuffer.bind(this);
      const flushChunkBuffer = this.flushChunkBuffer.bind(this);
      const processSseMessage = this.processSseMessage.bind(this);

      const stream = async function* (): AsyncIterable<ChatApiStreamChunk> {
        try {
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const { messages: parsedMessages, remainingBuffer } = readChunkBuffer(buffer);
            buffer = remainingBuffer;

            let shouldStop = false;
            for (const message of parsedMessages) {
              const result = processSseMessage(message, {
                includeTrace: true,
              });

              for (const chunk of result.chunks) {
                yield chunk;
              }

              if (result.shouldStop) {
                shouldStop = true;
                break;
              }
            }

            if (shouldStop) {
              return;
            }
          }

          if (buffer.trim()) {
            for (const message of flushChunkBuffer(buffer)) {
              const result = processSseMessage(message, {
                includeTrace: true,
              });

              for (const chunk of result.chunks) {
                yield chunk;
              }
            }
          }
        }
        finally {
          reader.releaseLock();
        }
      };

      return {
        stream: stream(),
        totalTokens: 0, // Will be calculated after streaming completes
      };
    }
    catch (error) {
      this.logger.error("Error calling Chat API (streaming)", error);
      throw error;
    }
  }

  /**
   * Extract text from JSON SSE payloads when present.
   */
  private parseStreamPayload(data: string): {
    type?: unknown;
    text?: unknown;
    message?: { content?: unknown };
    content?: unknown;
    response?: unknown;
    answer?: unknown;
  } | null {
    try {
      return JSON.parse(data) as {
        type?: unknown;
        text?: unknown;
        message?: { content?: unknown };
        content?: unknown;
        response?: unknown;
        answer?: unknown;
      };
    }
    catch {
      return null;
    }
  }

  /**
   * Extract text from JSON SSE payloads when present.
   */
  private extractTextFromStreamPayload(data: string): string {
    const payload = this.parseStreamPayload(data);

    if (!payload) {
      return "";
    }

    if (typeof payload.text === "string") {
      return payload.text;
    }

    if (typeof payload.message?.content === "string") {
      return payload.message.content;
    }

    if (typeof payload.content === "string") {
      return payload.content;
    }

    if (typeof payload.response === "string") {
      return payload.response;
    }

    if (typeof payload.answer === "string") {
      return payload.answer;
    }

    return "";
  }

  countTokens(text: string): number {
    // Simple approximation: ~4 characters per token for Vietnamese/English
    // For production, use a proper tokenizer library
    return Math.ceil(text.length / 4);
  }
}

interface ParsedSseMessage {
  event?: string;
  data: string;
}
