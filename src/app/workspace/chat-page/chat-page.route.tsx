import { createRoute } from "@tanstack/react-router";
import { workspaceRoute } from "../workspace.route";
import { ChatPage } from "./chat-page";

export const chatPageRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "/chat",
  component: ChatPage,
  validateSearch: (search: {
    chatId?: string;
  }) => search,
});
