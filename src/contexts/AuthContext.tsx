import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { DEV_BYPASS_AUTH, disableDevBypass, isDevBypassEnabled } from "@/config/devBypassAuth";
import { apiBackendAction } from "@/lib/api-backend";

// Simplified roles - actual role management requires user_roles table
type UserRole = "admin" | "mostrador" | "logistica" | "taller" | "bodega" | "tecnico" | "digitador" | "jefe_taller" | "sac" | "control_calidad" | "asesor" | "gerente_centro" | "supervisor_regional" | "jefe_logistica" | "jefe_bodega" | "supervisor_bodega" | "supervisor_calidad" | "supervisor_sac" | "auxiliar_bodega" | "auxiliar_logistica" | "supervisor_inventarios" | "capacitador";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: UserRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const applyDevBypass = () => {
      const fakeUser = {
        id: "dev-bypass",
        email: DEV_BYPASS_AUTH.email,
      } as any as User;

      setSession(null);
      setUser(fakeUser);
      setUserRole(DEV_BYPASS_AUTH.role);
      setLoading(false);
    };

    // Set up auth state listener (exception: onAuthStateChange is a subscription pattern)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setSession(session);
          setUser(session.user);
          // PLACEHOLDER: user_roles table doesn't exist
          setUserRole("admin");
          setLoading(false);
          return;
        }

        if (isDevBypassEnabled()) {
          applyDevBypass();
          return;
        }

        setSession(null);
        setUser(null);
        setUserRole(null);
        setLoading(false);
      }
    );

    // Check for existing session using apiBackendAction
    apiBackendAction("auth.getSession", {}).then(({ session }) => {
      if (session) {
        setSession(session as Session);
        setUser((session as Session).user);
        setUserRole("admin");
        setLoading(false);
        return;
      }

      if (isDevBypassEnabled()) {
        applyDevBypass();
        return;
      }

      setSession(null);
      setUser(null);
      setUserRole(null);
      setLoading(false);
    }).catch(() => {
      // On error, check dev bypass
      if (isDevBypassEnabled()) {
        applyDevBypass();
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      // Permite salir incluso si el bypass está activo.
      disableDevBypass();
      await apiBackendAction("auth.logout", {});
      setUser(null);
      setSession(null);
      setUserRole(null);
      navigate("/auth");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, userRole, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
