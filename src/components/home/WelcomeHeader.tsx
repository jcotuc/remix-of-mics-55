import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MapPin } from "lucide-react";
import { mycsapi } from "@/mics-api";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 18) return "Buenas tardes";
  return "Buenas noches";
}

export function WelcomeHeader() {
  const { user } = useAuth();
  const [centroNombre, setCentroNombre] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const today = new Date();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.email) return;
      
      try {
        const response = await mycsapi.get("/api/v1/auth/me") as any;
        const profile = response.result;
        if (profile) {
          // Set user name - try nombre first, then combine with apellido if available
          const fullName = profile.apellido 
            ? `${profile.nombre} ${profile.apellido}`.trim()
            : profile.nombre;
          if (fullName) {
            setUserName(fullName);
          }
          // Set centro de servicio
          if (profile.centro_de_servicio?.nombre) {
            setCentroNombre(profile.centro_de_servicio.nombre);
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };

    fetchProfile();
  }, [user?.email]);

  const displayName = userName || user?.email?.split("@")[0] || "Usuario";
  const formattedDate = format(today, "EEEE, d 'de' MMMM yyyy", { locale: es });

  return (
    <div className="space-y-1">
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
        {getGreeting()}, <span className="text-primary">{displayName}</span>
      </h1>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span className="capitalize">{formattedDate}</span>
        {centroNombre && (
          <>
            <span className="hidden sm:inline">•</span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {centroNombre}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
