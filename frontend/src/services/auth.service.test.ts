import { beforeEach, describe, expect, it, vi } from "vitest";

const authResponse = {
  accessToken: "demo-token",
  user: {
    id: "user-1",
    username: "demo",
    name: "Demo User",
    email: "demo@example.com",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
};

const { postMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
}));

vi.mock("./api", () => ({
  api: {
    post: postMock,
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

describe("authService.logout", () => {
  beforeEach(() => {
    postMock.mockReset();
    localStorage.clear();
  });

  it("calls the backend logout endpoint and clears local storage", async () => {
    localStorage.setItem("accessToken", "demo-token");
    postMock.mockResolvedValue({ message: "Logged out successfully" });

    const { authService } = await import("./auth.service");

    await authService.logout();

    expect(postMock).toHaveBeenCalledWith("/auth/logout");
    expect(localStorage.getItem("accessToken")).toBeNull();
  });

  it("still clears local storage when the backend logout call fails", async () => {
    localStorage.setItem("accessToken", "demo-token");
    postMock.mockRejectedValue(new Error("network failure"));

    const { authService } = await import("./auth.service");

    await expect(authService.logout()).resolves.toBeUndefined();
    expect(localStorage.getItem("accessToken")).toBeNull();
  });
});

describe("authService.signIn", () => {
  beforeEach(() => {
    postMock.mockReset();
    localStorage.clear();
  });

  it("sends the username login payload expected by the backend", async () => {
    postMock.mockResolvedValue(authResponse);

    const { authService } = await import("./auth.service");

    await authService.signIn({ username: "demo@example.com", password: "password123" });

    expect(postMock).toHaveBeenCalledWith("/auth/sign-in", {
      username: "demo@example.com",
      password: "password123",
    });
    expect(localStorage.getItem("accessToken")).toBe("demo-token");
  });
});
