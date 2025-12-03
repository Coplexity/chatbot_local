import { createRoute } from "@tanstack/react-router";
import { homepageRoute } from "./homepage/homepage.route";
import { rootRoute } from "../router";
import { WorkspaceLayout } from "./workspace.layout";

export const workspaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "workspace",
  component: WorkspaceLayout,
});

export const workspaceRouteWithChildren = workspaceRoute.addChildren([
  homepageRoute,
]);
