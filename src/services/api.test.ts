import { beforeEach, describe, expect, it, vi } from "vitest";

class MockEventSource {
  static instances: MockEventSource[] = [];

  url: string;

  constructor(url: string | URL) {
    this.url = String(url);
    MockEventSource.instances.push(this);
  }

  close() {}
}

describe("api client base path", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    MockEventSource.instances = [];
    localStorage.clear();
  });

  it("sends regular requests through the /api proxy base", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const { api } = await import("./api");

    await api.get("/chat/conversations", {
      params: { page: 1, search: "heart" },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/chat/conversations?page=1&search=heart",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("sends stream requests through the /api proxy base", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    vi.stubGlobal("fetch", fetchMock);

    const { api } = await import("./api");

    await api.fetchStream("/chat/guest/stream", { content: "hello" });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/chat/guest/stream",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("creates event sources through the /api proxy base", async () => {
    vi.stubGlobal("EventSource", MockEventSource as unknown as typeof EventSource);

    const { api } = await import("./api");

    api.createEventSource("/chat/conversations/abc/messages/stream", {
      content: "hello",
    });

    expect(MockEventSource.instances[0]?.url).toBe(
      "http://localhost:3000/api/chat/conversations/abc/messages/stream?content=hello"
    );
  });

  it("calls the unauthorized handler once for authenticated 401 responses", async () => {
    localStorage.setItem("accessToken", "expired-token");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({ message: "Unauthorized" }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const { api, setUnauthorizedHandler, ApiError } = await import("./api");
    const unauthorizedHandler = vi.fn();

    setUnauthorizedHandler(unauthorizedHandler);

    await expect(api.get("/auth/me")).rejects.toBeInstanceOf(ApiError);
    await expect(api.get("/auth/me")).rejects.toBeInstanceOf(ApiError);

    expect(unauthorizedHandler).toHaveBeenCalledTimes(1);
  });

  it("calls the unauthorized handler for authenticated stream 401 responses", async () => {
    localStorage.setItem("accessToken", "expired-token");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({ message: "Unauthorized" }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const { api, setUnauthorizedHandler, ApiError } = await import("./api");
    const unauthorizedHandler = vi.fn();

    setUnauthorizedHandler(unauthorizedHandler);

    await expect(api.fetchStream("/chat/stream", { content: "hello" })).rejects.toBeInstanceOf(ApiError);

    expect(unauthorizedHandler).toHaveBeenCalledTimes(1);
  });
});
