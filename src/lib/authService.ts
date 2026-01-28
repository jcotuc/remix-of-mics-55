import { loginUserApiV1AuthLoginPost, logoutApiV1AuthLogoutPost, readUserMeApiV1AuthMeGet } from "@/generated_sdk";
import type { AppSchemasAuthUsuarioSchema, LoginUserApiV1AuthLoginPostData } from "@/generated_sdk/types.gen";
import { client } from "@/generated_sdk/client.gen";

// Custom type for the authenticated user, based on the SDK's schema
export type AuthenticatedUser = AppSchemasAuthUsuarioSchema;

interface AuthService {
  login: (credentials: LoginUserApiV1AuthLoginPostData['body']) => Promise<AuthenticatedUser | null>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<AuthenticatedUser | null>;
}

export const authService: AuthService = {
  async login(credentials) {
    try {
      // The Hey API client automatically handles cookies if the server sets them
      const response = await loginUserApiV1AuthLoginPost({
        body: credentials,
        // Ensure responseStyle is 'data' to get the direct user object
        responseStyle: 'data', 
      });
      // Assuming the response is the user data directly when successful
      return response || null;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  },

  async logout() {
    try {
      await logoutApiV1AuthLogoutPost();
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  },

  async getCurrentUser() {
    try {
      const response = await readUserMeApiV1AuthMeGet({
        // Ensure responseStyle is 'data' to get the direct user object
        responseStyle: 'data',
      });
      // The `readUserMeApiV1AuthMeGet` returns the user or null if not authenticated
      return response || null;
    } catch (error) {
      // Handle cases where the user might not be authenticated (e.g., 401 Unauthorized)
      // The Hey API client might throw an error for non-2xx responses if throwOnError is true
      // or return { error: ... } if throwOnError is false (which is the default in types.gen.ts)
      console.error("Get current user error:", error);
      return null;
    }
  },
};
