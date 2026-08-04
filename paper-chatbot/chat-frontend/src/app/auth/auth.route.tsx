import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "../router";
import { LoginPage } from "./login/login";
import { SignupPage } from "./signup/signup";

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

export const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/signup",
  component: SignupPage,
});
