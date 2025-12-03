import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "../router";
import { LandingComponent } from "./landing/landing";

export const indexPageRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LandingComponent,
});
