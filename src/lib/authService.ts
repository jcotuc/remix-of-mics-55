import { mycsapi, tokenStore } from "@/mics-api";
import type { AuthenticatedUser } from "./types";

interface AuthService {
  login: (credentials: any) => Promise<AuthenticatedUser | null>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<AuthenticatedUser | null>;
}

export const authService: AuthService = {
  async login(credentials) {
    try {
      const data = await mycsapi.post("/api/v1/auth/login", { body: credentials });
      // Tokens are auto-stored by the client on login response
      return (data.user as AuthenticatedUser) || null;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  },

  async logout() {
    try {
      await mycsapi.post("/api/v1/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    }
    tokenStore.clear();
  },

  async getCurrentUser() {
    try {
      const user = await mycsapi.get("/api/v1/auth/me");
      return (user as AuthenticatedUser) || null;
    } catch (error) {
      console.error("Get current user error:", error);
      return null;
    }
  },
};
