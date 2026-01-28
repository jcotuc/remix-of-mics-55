import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DEV_BYPASS_AUTH, disableDevBypass, isDevBypassEnabled } from "@/config/devBypassAuth";
import { authService } from "@/lib/authService";
import type { AuthenticatedUser, AppSchemasRolRolSchema } from "@/generated_sdk/types.gen";

// Simplified roles - actual role management requires user_roles table
type UserRole = "admin" | "mostrador" | "logistica" | "taller" | "bodega" | "tecnico" | "digitador" | "jefe_taller" | "sac" | "control_calidad" | "asesor" | "gerente_centro" | "supervisor_regional" | "jefe_logistica" | "jefe_bodega" | "supervisor_bodega" | "supervisor_calidad" | "supervisor_sac" | "auxiliar_bodega" | "auxiliar_logistica" | "supervisor_inventarios" | "capacitador";

interface AuthContextType {
  user: AuthenticatedUser | null;
  userRole: UserRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const applyDevBypass = async () => {
      // Simulate backend user object for dev bypass
      const fakeUser: AuthenticatedUser = {
        id: -1, // Use a distinguishing ID for bypass
        email: DEV_BYPASS_AUTH.email,
        nombre: "Dev Bypass User",
        roles: [{ id: -1, nombre: DEV_BYPASS_AUTH.role, slug: DEV_BYPASS_AUTH.role }],
      };

      setUser(fakeUser);
      // Ensure the role string is cast to UserRole if it's a known role
      setUserRole(DEV_BYPASS_AUTH.role as UserRole);
      setLoading(false);
    };

    const fetchUser = async () => {
      setLoading(true);
      try {
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          // Assuming the first role is the primary role for simplicity for now
          // This logic may need refinement based on actual role hierarchy/use
          if (currentUser.roles && currentUser.roles.length > 0) {
            setUserRole(currentUser.roles[0].slug as UserRole);
          } else {
            setUserRole(null); // No roles assigned
          }
        } else if (isDevBypassEnabled()) {
          // Fallback to dev bypass if no user and dev bypass is enabled
          await applyDevBypass();
        } else {
          setUser(null);
          setUserRole(null);
        }
      } catch (error) {
        console.error("Error fetching current user:", error);
        // Fallback to dev bypass on API error
        if (isDevBypassEnabled()) {
          await applyDevBypass();
        } else {
          setUser(null);
          setUserRole(null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUser();

    // No direct subscription equivalent for Hey API, so we fetch on mount
    // and rely on explicit re-fetches after auth actions or component unmount/remount
  }, []);

  const signOut = async () => {
    try {
      disableDevBypass();
      await authService.logout();
      setUser(null);
      setUserRole(null);
      navigate("/auth");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userRole, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
