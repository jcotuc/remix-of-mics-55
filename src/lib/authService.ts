import { apiBackendAction } from "./api-backend";
import { apiFetch } from "./api-backend";
import type { AuthenticatedUser } from "./types";

interface AuthService {
  login: (credentials: any) => Promise<AuthenticatedUser | null>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<AuthenticatedUser | null>;
}

export const authService: AuthService = {
  async login(credentials) {
    try {
      const response = await apiBackendAction("auth.login", credentials) as { success: boolean; message: string; user?: unknown };
      return (response.user as AuthenticatedUser) || null;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  },

  async logout() {
    try {
      await apiBackendAction("auth.logout", {});
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  },

  async getCurrentUser() {
    try {
      const response = await apiBackendAction("auth.me", {});
      return response.result || null;
    } catch (error) {
      console.error("Get current user error:", error);
      return null;
    }
  },
};
