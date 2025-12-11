import { createRoute, redirect } from "@tanstack/react-router";
import { rootRoute } from "../router";
import { WorkspaceLayout } from "./workspace.layout";
import { chatPageRoute } from "./chat-page/chat-page.route";

export const workspaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "workspace",
  component: WorkspaceLayout,
  beforeLoad: ({ location }) => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
        },
      });
    }
  },
});

export const workspaceRouteWithChildren = workspaceRoute.addChildren([
  chatPageRoute,
]);
