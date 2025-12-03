import { createRoute } from "@tanstack/react-router";
import { homepageRoute } from "./homepage/homepage.route";
import { rootRoute } from "../router";
import { WorkspaceLayout } from "./workspace.layout";
import { documentManagementRoute } from "./document-management/document-management.route";
import { analysisRoute } from "./analysis/analysis.route";
import { profileRoute } from "./profile/profile.route";

export const workspaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "workspace",
  component: WorkspaceLayout,
});

export const workspaceRouteWithChildren = workspaceRoute.addChildren([
  homepageRoute,
  documentManagementRoute,
  analysisRoute,
  profileRoute,
]);
