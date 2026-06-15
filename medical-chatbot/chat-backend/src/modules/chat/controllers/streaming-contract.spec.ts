import { ChatController } from "./chat.controller";
import { GuestChatController } from "./guest-chat.controller";

jest.mock("../../auth/guards/jwt-auth.guard", () => ({
  JwtAuthGuard: class JwtAuthGuardMock {},
}));

describe("chat streaming contract", () => {
  function createChatController(messageServiceOverrides: Record<string, jest.Mock>) {
    return new ChatController({} as never, messageServiceOverrides as never);
  }

  it("forwards conversation, trace, and text payloads from startConversationStream", async () => {
    const controller = createChatController({
      sendFirstMessageStreaming: jest.fn().mockResolvedValue({
        conversation: { id: "conversation-1" },
        stream: (async function* () {
          yield { type: "trace", trace: "Routing: analyzing intent" };
          yield { type: "text", text: "Final answer" };
        })(),
      }),
    });

    const events = await controller.startConversationStream(
      "user-1",
      { role: "admin" } as any,
      { content: "Hello" } as any,
    );
    const values = await new Promise<Array<{ data: string }>>((resolve, reject) => {
      const emitted: Array<{ data: string }> = [];
      events.subscribe({
        next: value => emitted.push(value),
        error: reject,
        complete: () => resolve(emitted),
      });
    });

    expect(values).toEqual([
      { data: JSON.stringify({ type: "conversation", conversationId: "conversation-1" }) },
      { data: JSON.stringify({ type: "trace", trace: "Routing: analyzing intent" }) },
      { data: JSON.stringify({ type: "text", text: "Final answer" }) },
    ]);
  });

  it("uses request role instead of user role when starting authenticated conversations", async () => {
    const messageService = {
      sendFirstMessage: jest.fn().mockResolvedValue({
        conversation: {},
        userMessage: {},
        assistantMessage: {},
      }),
    };
    const controller = createChatController(messageService);

    await controller.startConversation(
      "user-1",
      { role: "nhan_vien_y_te" } as never,
      { content: "Hello", role: "bac_si_tram_y_te", mode: "deep" },
    );

    expect(messageService.sendFirstMessage).toHaveBeenCalledWith(
      "user-1",
      "Hello",
      "bac_si_tram_y_te",
      "deep",
    );
  });

  it("uses request role instead of user role when streaming new authenticated conversations", async () => {
    const messageService = {
      sendFirstMessageStreaming: jest.fn().mockResolvedValue({
        conversation: { id: "conversation-1" },
        stream: (async function* () {})(),
      }),
    };
    const controller = createChatController(messageService);

    await controller.startConversationStream(
      "user-1",
      { role: "nhan_vien_y_te" } as never,
      { content: "Hello", role: "bac_si_tram_y_te", mode: "deep" },
    );

    expect(messageService.sendFirstMessageStreaming).toHaveBeenCalledWith(
      "user-1",
      "Hello",
      "bac_si_tram_y_te",
      "deep",
    );
  });

  it("uses request role instead of user role when sending authenticated messages", async () => {
    const dto = { content: "Hello", role: "bac_si_tram_y_te", mode: "deep" } as const;
    const messageService = {
      sendMessage: jest.fn().mockResolvedValue({
        userMessage: {},
        assistantMessage: {},
      }),
    };
    const controller = createChatController(messageService);

    await controller.sendMessage(
      "user-1",
      { role: "nhan_vien_y_te" } as never,
      "conversation-1",
      dto,
    );

    expect(messageService.sendMessage).toHaveBeenCalledWith(
      "conversation-1",
      "user-1",
      dto,
      "bac_si_tram_y_te",
      "deep",
    );
  });

  it("uses request role instead of user role when streaming authenticated messages", async () => {
    const dto = { content: "Hello", role: "bac_si_tram_y_te", mode: "deep" } as const;
    const messageService = {
      sendMessageStreaming: jest.fn().mockResolvedValue({
        userMessage: {},
        stream: (async function* () {})(),
      }),
    };
    const controller = createChatController(messageService);

    await controller.sendMessageStreaming(
      "user-1",
      { role: "nhan_vien_y_te" } as never,
      "conversation-1",
      dto,
    );

    expect(messageService.sendMessageStreaming).toHaveBeenCalledWith(
      "conversation-1",
      "user-1",
      dto,
      "bac_si_tram_y_te",
      "deep",
    );
  });

  it("falls back to user role when authenticated request role is blank", async () => {
    const messageService = {
      sendFirstMessage: jest.fn().mockResolvedValue({
        conversation: {},
        userMessage: {},
        assistantMessage: {},
      }),
    };
    const controller = createChatController(messageService);

    await controller.startConversation(
      "user-1",
      { role: "nhan_vien_y_te" } as never,
      { content: "Hello", role: "   " },
    );

    expect(messageService.sendFirstMessage).toHaveBeenCalledWith(
      "user-1",
      "Hello",
      "nhan_vien_y_te",
      "basic",
    );
  });

  it("forwards trace and text payloads from guest streams without flattening trace into text", async () => {
    const aiService = {
      generateResponse: jest.fn().mockResolvedValue({
        stream: (async function* () {
          yield { type: "trace", trace: "Routing: analyzing intent" };
          yield { type: "text", text: "Final answer" };
        })(),
      }),
    };

    const controller = new GuestChatController(aiService as any);
    const events = await controller.guestStream({ content: "Hello" } as any);
    const values = await new Promise<Array<{ data: string }>>((resolve, reject) => {
      const emitted: Array<{ data: string }> = [];
      events.subscribe({
        next: value => emitted.push(value),
        error: reject,
        complete: () => resolve(emitted),
      });
    });

    expect(values).toEqual([
      { data: JSON.stringify({ type: "trace", trace: "Routing: analyzing intent" }) },
      { data: JSON.stringify({ type: "text", text: "Final answer" }) },
    ]);
  });
});
