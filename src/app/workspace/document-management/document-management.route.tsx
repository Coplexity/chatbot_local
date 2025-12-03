import { createRoute } from "@tanstack/react-router";
import { workspaceRoute } from "../workspace.route";
import { DocumentManagement } from "./document-management";

export const documentManagementRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "document-management",
  component: DocumentManagement,
});
