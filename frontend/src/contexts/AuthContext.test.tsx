import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider, useAuth } from "./AuthContext";

const { messageErrorMock, authServiceMock, guestStorageServiceMock, chatServiceMock } = vi.hoisted(() => ({
  messageErrorMock: vi.fn(),
  authServiceMock: {
    signIn: vi.fn(),
    signUp: vi.fn(),
    getMe: vi.fn(),
    updateUser: vi.fn(),
    logout: vi.fn(),
    hasToken: vi.fn(),
  },
  guestStorageServiceMock: {
    hasGuestData: vi.fn(),
    getAllGuestData: vi.fn(),
    clearAllGuestData: vi.fn(),
  },
  chatServiceMock: {
    createConversation: vi.fn(),
    sendMessage: vi.fn(),
  },
}));

let unauthorizedHandler: ((error?: unknown) => void | Promise<void>) | null = null;

vi.mock("antd", () => ({
  App: {
    useApp: () => ({
      message: {
        error: messageErrorMock,
      },
    }),
  },
}));

vi.mock("@/services/api", () => ({
  setUnauthorizedHandler: vi.fn((handler) => {
    unauthorizedHandler = handler;
  }),
}));

vi.mock("@/services/auth.service", () => ({
  authService: authServiceMock,
}));

vi.mock("@/services/guest-storage.service", () => ({
  guestStorageService: guestStorageServiceMock,
}));

vi.mock("@/services/chat.service", () => ({
  chatService: chatServiceMock,
}));

function AuthConsumer() {
  const { isAuthenticated, isGuest, isLoading, sessionExpired } = useAuth();

  return (
    <div>
      <div>{isLoading ? "loading" : "ready"}</div>
      <div>{isAuthenticated ? "authenticated" : "anonymous"}</div>
      <div>{isGuest ? "guest" : "not-guest"}</div>
      <div>{sessionExpired ? "expired" : "active"}</div>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    unauthorizedHandler = null;
    messageErrorMock.mockReset();
    authServiceMock.signIn.mockReset();
    authServiceMock.signUp.mockReset();
    authServiceMock.getMe.mockReset();
    authServiceMock.updateUser.mockReset();
    authServiceMock.logout.mockReset();
    authServiceMock.hasToken.mockReset();
    authServiceMock.hasToken.mockReturnValue(false);
    guestStorageServiceMock.hasGuestData.mockReset();
    guestStorageServiceMock.hasGuestData.mockReturnValue(false);
    guestStorageServiceMock.getAllGuestData.mockReset();
    guestStorageServiceMock.clearAllGuestData.mockReset();
    chatServiceMock.createConversation.mockReset();
    chatServiceMock.sendMessage.mockReset();
  });

  it("logs out and shows a persistent toast when the API reports an expired session", async () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("ready")).toBeInTheDocument();
    });

    expect(unauthorizedHandler).not.toBeNull();

    await act(async () => {
      await unauthorizedHandler?.();
    });

    expect(authServiceMock.logout).toHaveBeenCalledTimes(1);
    expect(messageErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại",
        duration: 0,
      })
    );
    expect(screen.getByText("anonymous")).toBeInTheDocument();
    expect(screen.getByText("not-guest")).toBeInTheDocument();
    expect(screen.getByText("expired")).toBeInTheDocument();
  });
});
