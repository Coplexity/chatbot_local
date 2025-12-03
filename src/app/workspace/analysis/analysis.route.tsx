import { createRoute } from "@tanstack/react-router";
import { workspaceRoute } from "../workspace.route";
import { Analysis } from "./analysis";

export const analysisRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "analysis",
  component: Analysis,
});
