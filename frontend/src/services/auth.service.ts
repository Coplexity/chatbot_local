import { api } from "./api";
import type {
  AuthResponse,
  SignInRequest,
  SignUpRequest,
  User,
} from "@/types/api-types";

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

  /**
   * Update user profile
   */
  async updateUser(data: Partial<Pick<User, "username" | "name" | "email" | "role">>): Promise<User> {
    return api.patch<User>("/auth/me", data);
  },

  /**
   * Logout (clear local token)
   */
  logout(): void {
    localStorage.removeItem("accessToken");
  },

  /**
   * Check if user has valid token
   */
  hasToken(): boolean {
    return !!localStorage.getItem("accessToken");
  },
};
