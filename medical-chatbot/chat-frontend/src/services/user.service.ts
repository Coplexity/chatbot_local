import { api } from "./api";
import type { UserAncestor } from "@/types/api-types";

export const userService = {
  async getAncestors(): Promise<UserAncestor[]> {
    return api.get<UserAncestor[]>("/auth/users/ancestors");
  },
};
