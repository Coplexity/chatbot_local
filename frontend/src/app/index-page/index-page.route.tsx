import { createRoute, redirect } from "@tanstack/react-router";
import { rootRoute } from "../router";

export const indexPageRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({
      to: "/chat",
    });
  },
});
