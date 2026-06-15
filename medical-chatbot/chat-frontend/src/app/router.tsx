import { createRootRoute, createRouter, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { workspaceRouteWithChildren } from "./workspace/workspace.route";
import { indexPageRoute } from "./index-page/index-page.route";
import { loginRoute, signupRoute } from "./auth/auth.route";

export const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <TanStackRouterDevtools  />
    </>
  ),
});

export const routeTree = rootRoute.addChildren([
  indexPageRoute,
  loginRoute,
  signupRoute,
  workspaceRouteWithChildren,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
