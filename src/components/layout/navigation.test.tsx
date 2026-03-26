import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Navigation from "./navigation";

const navigateMock = vi.fn();
const logoutMock = vi.fn();
const invalidateQueriesMock = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateMock,
  useSearch: () => ({ chatId: "chat-1" }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: {
      items: [
        { id: "chat-1", title: "Triệu chứng viêm phổi" },
        { id: "chat-2", title: "Triệu chứng sốt xuất huyết" },
      ],
    },
    isLoading: false,
  }),
  useMutation: ({ mutationFn, onSuccess }: any) => ({
    mutate: async (id: string) => {
      await mutationFn(id);
      onSuccess?.();
    },
  }),
  useQueryClient: () => ({
    invalidateQueries: invalidateQueriesMock,
  }),
}));

vi.mock("@/hooks/useGuestChat", () => ({
  useGuestChat: () => ({
    getConversations: vi.fn(),
    deleteConversation: vi.fn(),
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    logout: logoutMock,
    isGuest: true,
    isAuthenticated: false,
  }),
}));

vi.mock("../logos/logos", () => ({
  default: {
    Logo: ({ className }: { className?: string }) => (
      <div className={className}>Logo</div>
    ),
  },
}));

vi.mock("../icons/icons", () => ({
  default: {
    XIcon: (props: any) => <svg {...props} />,
    SearchIcon: (props: any) => <svg {...props} />,
    MoreHorizontal: (props: any) => <svg {...props} />,
    Share2Icon: (props: any) => <svg {...props} />,
    Trash2Icon: (props: any) => <svg {...props} />,
    DoorOpen: (props: any) => <svg {...props} />,
  },
}));

describe("Navigation", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    logoutMock.mockReset();
    invalidateQueriesMock.mockReset();
  });

  it("renders the mockup-inspired sidebar structure", () => {
    const { container } = render(<Navigation />);

    const newChatButton = screen.getByRole("button", {
      name: /cuộc trò chuyện mới/i,
    });
    const searchInput = screen.getByPlaceholderText(/tìm kiếm/i);
    const loginButton = screen.getByRole("button", { name: /đăng nhập/i });

    expect(newChatButton).toBeInTheDocument();
    expect(searchInput).toBeInTheDocument();
    expect(screen.getByText(/lịch sử trò chuyện/i)).toBeInTheDocument();
    expect(screen.getByText(/triệu chứng viêm phổi/i)).toBeInTheDocument();
    expect(loginButton).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("bg-[#eff3fb]");
    expect(newChatButton).toHaveClass("rounded-full");
    expect(searchInput).toHaveClass("rounded-full");
    expect(loginButton).toHaveClass("rounded-full");
  });

  it("filters conversation history from the search box", () => {
    render(<Navigation />);

    fireEvent.change(screen.getByPlaceholderText(/tìm kiếm/i), {
      target: { value: "xuất huyết" },
    });

    expect(screen.getAllByText(/xuất huyết/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/triệu chứng viêm phổi/i)).not.toBeInTheDocument();
  });
});
