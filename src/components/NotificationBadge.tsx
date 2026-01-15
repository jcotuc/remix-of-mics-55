import { Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Notificacion {
  id: string;
  tipo: string;
  mensaje: string;
  incidente_id: string | null;
  leido: boolean;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

export function NotificationBadge() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: notificaciones, refetch } = useQuery({
    queryKey: ["notificaciones", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("notificaciones")
        .select("*")
        .eq("user_id", user.id)
        .eq("leido", false)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return (data || []) as Notificacion[];
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch cada 30 segundos
  });

  const pendingCount = notificaciones?.length || 0;

  const handleNotificationClick = async (notificacion: Notificacion) => {
    // Marcar como leída
    await supabase
      .from("notificaciones")
      .update({ leido: true })
      .eq("id", notificacion.id);

    // Navegar según tipo
    if (notificacion.tipo === "aprobacion_cxg" || notificacion.tipo === "aprobacion_nc") {
      navigate("/gerencia/aprobaciones-garantia");
    } else if (notificacion.incidente_id) {
      navigate(`/incidente/${notificacion.incidente_id}`);
    }

    refetch();
  };

  const getNotificationIcon = (tipo: string) => {
    switch (tipo) {
      case "aprobacion_cxg":
        return "🔄";
      case "aprobacion_nc":
        return "📋";
      default:
        return "📢";
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {pendingCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-destructive"
            >
              {pendingCount > 9 ? "9+" : pendingCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Notificaciones</h4>
          {notificaciones && notificaciones.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {notificaciones.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className="p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors border"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{getNotificationIcon(notif.tipo)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-2">{notif.mensaje}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(notif.created_at), "dd MMM, HH:mm", { locale: es })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay notificaciones pendientes
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
