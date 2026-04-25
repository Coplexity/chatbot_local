import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@/types/api-types";

const authResponse = {
  accessToken: "demo-token",
  user: {
    id: "user-1",
    fullName: "Demo User",
    email: "demo@example.com",
    role: "",
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
};

const { postMock, patchMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  patchMock: vi.fn(),
}));

vi.mock("./api", () => ({
  api: {
    post: postMock,
    get: vi.fn(),
    patch: patchMock,
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

describe("authService.updateUserRole", () => {
  beforeEach(() => {
    patchMock.mockReset();
  });

  it("sends chat role updates to the dedicated endpoint", async () => {
    patchMock.mockResolvedValue(authResponse.user);

    const { authService } = await import("./auth.service");

    await authService.updateUserRole(UserRole.BAC_SI_TRAM_Y_TE);

    expect(patchMock).toHaveBeenCalledWith("/auth/me/role", {
      role: "bac_si_tram_y_te",
    });
  });
});
