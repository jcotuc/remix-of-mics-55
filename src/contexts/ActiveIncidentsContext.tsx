import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { apiBackendAction } from "@/lib/api-backend";
import type { Database } from "@/integrations/supabase/types";

type IncidenteDB = Database['public']['Tables']['incidentes']['Row'];

export interface ActiveIncident extends IncidenteDB {
  notificacionesPendientes: number;
  codigo_producto?: string;
  producto?: {
    id: number;
    codigo: string;
    descripcion: string;
  };
}

interface ActiveIncidentsContextType {
  activeIncidents: ActiveIncident[];
  isLoading: boolean;
  userId: string | null;
  refreshIncidents: () => Promise<void>;
  removeIncident: (incidenteId: number) => void;
  maxAssignments: number;
  currentAssignments: number;
  canTakeMoreAssignments: boolean;
}

const ActiveIncidentsContext = createContext<ActiveIncidentsContextType | null>(null);

export const MAX_ASSIGNMENTS = 3;

export function ActiveIncidentsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [activeIncidents, setActiveIncidents] = useState<ActiveIncident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchActiveIncidents = useCallback(async () => {
    if (!user?.email) {
      setActiveIncidents([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Get technician by email
      const { result: usuarioResult } = await apiBackendAction("usuarios.getByEmail", { 
        email: user.email 
      });
      
      const usuario = usuarioResult as { id: number; auth_uid?: string } | null;
      
      if (!usuario) {
        setActiveIncidents([]);
        setIsLoading(false);
        return;
      }

      setUserId(usuario.auth_uid || user.id);

      // Get technician assignments
      const { results: asignaciones } = await apiBackendAction("incidente_tecnico.list", { 
        tecnico_id: usuario.id 
      });

      if (!asignaciones || asignaciones.length === 0) {
        setActiveIncidents([]);
        setIsLoading(false);
        return;
      }

      // Get incident IDs
      const incidenteIds = asignaciones.map((a: any) => a.incidente_id);

      // Get all incidents
      const { results: allIncidentes } = await apiBackendAction("incidentes.list", {});

      // Filter to only assigned incidents in active states
      const activeStates = ['REGISTRADO', 'EN_DIAGNOSTICO', 'PENDIENTE_REPUESTOS', 'EN_REPARACION'];
      const incidentesAsignados = (allIncidentes || []).filter((inc: any) => 
        incidenteIds.includes(inc.id) && activeStates.includes(inc.estado)
      );

      // Enrich with product data
      const enrichedIncidents: ActiveIncident[] = await Promise.all(
        incidentesAsignados.map(async (inc: any) => {
          let producto = null;
          if (inc.producto_id) {
            try {
              const { result } = await apiBackendAction("productos.get", { id: inc.producto_id });
              producto = result;
            } catch (e) {
              console.warn(`Error fetching producto ${inc.producto_id}:`, e);
            }
          }

          // Count pending notifications (simplified - could be enhanced)
          let notificacionesPendientes = 0;

          return {
            ...inc,
            producto,
            codigo_producto: producto?.codigo,
            notificacionesPendientes
          };
        })
      );

      setActiveIncidents(enrichedIncidents);
    } catch (error) {
      console.error("Error fetching active incidents:", error);
      setActiveIncidents([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.email, user?.id]);

  useEffect(() => {
    fetchActiveIncidents();
  }, [fetchActiveIncidents]);

  const removeIncident = useCallback((incidenteId: number) => {
    setActiveIncidents(prev => prev.filter(inc => inc.id !== incidenteId));
  }, []);

  const value: ActiveIncidentsContextType = {
    activeIncidents,
    isLoading,
    userId,
    refreshIncidents: fetchActiveIncidents,
    removeIncident,
    maxAssignments: MAX_ASSIGNMENTS,
    currentAssignments: activeIncidents.length,
    canTakeMoreAssignments: activeIncidents.length < MAX_ASSIGNMENTS
  };

  return (
    <ActiveIncidentsContext.Provider value={value}>
      {children}
    </ActiveIncidentsContext.Provider>
  );
}

export function useActiveIncidents() {
  const context = useContext(ActiveIncidentsContext);
  if (!context) {
    throw new Error('useActiveIncidents must be used within an ActiveIncidentsProvider');
  }
  return context;
}
