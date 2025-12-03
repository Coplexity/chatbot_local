import { createRoute } from "@tanstack/react-router";
import { workspaceRoute } from "../workspace.route";
import { Profile } from "./profile";

export const profileRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "profile",
  component: Profile,
});
