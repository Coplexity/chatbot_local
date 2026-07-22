import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WorkspaceLayout } from "./workspace.layout";

const navigateMock = vi.fn();
const continueAsGuestMock = vi.fn();
const useAuthMock = vi.fn();
const hasTokenMock = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Outlet: () => <div>Outlet</div>,
  useNavigate: () => navigateMock,
}));

vi.mock("@/components/layout/title-section", () => ({
  TitleSection: () => <div>Title Section</div>,
}));

vi.mock("@/components/layout/navigation", () => ({
  default: () => <div>Navigation</div>,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("@/services/auth.service", () => ({
  authService: {
    hasToken: () => hasTokenMock(),
  },
}));

describe("WorkspaceLayout", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    continueAsGuestMock.mockReset();
    useAuthMock.mockReset();
    hasTokenMock.mockReset();
  });

  it("shows a re-login prompt after session expiry without auto navigating", () => {
    hasTokenMock.mockReturnValue(false);
    useAuthMock.mockReturnValue({
      isAuthenticated: false,
      isGuest: false,
      isLoading: false,
      continueAsGuest: continueAsGuestMock,
      sessionExpired: true,
    });

    render(<WorkspaceLayout />);

    expect(screen.getByText("Phiên đăng nhập đã hết hạn")).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
    expect(continueAsGuestMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Đăng nhập lại" }));

    expect(navigateMock).toHaveBeenCalledWith({ to: "/login" });
  });
});
