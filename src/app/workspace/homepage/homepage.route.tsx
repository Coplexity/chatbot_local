import { createRoute } from "@tanstack/react-router";
import { workspaceRoute } from "../workspace.route";
import { HomePage } from "./homepage";

export const homepageRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "homepage",
  component: HomePage,
});
