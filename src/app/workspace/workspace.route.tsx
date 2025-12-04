import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "../router";
import { WorkspaceLayout } from "./workspace.layout";
import { chatPageRoute } from "./chat-page/chat-page.route";

export const workspaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "workspace",
  component: WorkspaceLayout,
});

export const workspaceRouteWithChildren = workspaceRoute.addChildren([
  chatPageRoute,
]);
