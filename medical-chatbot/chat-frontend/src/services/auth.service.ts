import { api } from "./api";
import type {
  AuthResponse,
  SignInRequest,
  SignUpRequest,
  User,
  UserRole,
} from "@/types/api-types";

interface LogoutResponse {
  message: string;
}

export const authService = {
  /**
   * Sign in with username and password
   */
  async signIn(credentials: SignInRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/auth/sign-in", credentials);

    // Store token in localStorage
    if (response.accessToken) {
      localStorage.setItem("accessToken", response.accessToken);
    }

    return response;
  },

  /**
   * Sign up new user
   */
  async signUp(data: SignUpRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/auth/sign-up", data);

    // Store token in localStorage
    if (response.accessToken) {
      localStorage.setItem("accessToken", response.accessToken);
    }

    return response;
  },

  /**
   * Get current user profile
   */
  async getMe(): Promise<User> {
    return api.get<User>("/auth/me");
  },

  async updateUserRole(role: UserRole): Promise<User> {
    return api.patch<User>("/auth/me/role", { role });
  },

  /**
   * Logout on the server and clear the local token fallback
   */
  async logout(): Promise<void> {
    localStorage.removeItem("accessToken");
    await Promise.allSettled([api.post<LogoutResponse>("/auth/logout")]);
  },

  /**
   * Check if user has valid token
   */
  hasToken(): boolean {
    return !!localStorage.getItem("accessToken");
  },
};
