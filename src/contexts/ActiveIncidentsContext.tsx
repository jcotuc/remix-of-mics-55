import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import {
  getMyAssignedIncidentesApiV1IncidentesMisAsignacionesGet,
  getProductoApiV1ProductosProductoIdGet,
} from "@/generated_sdk";
import type { IncidenteSchema, ProductoSchema } from "@/generated_sdk/types.gen";

export interface ActiveIncident extends IncidenteSchema {
  notificacionesPendientes: number;
  codigo_producto?: string;
}

interface ActiveIncidentsContextType {
  activeIncidents: ActiveIncident[];
  isLoading: boolean;
  userId: number | null;
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
  const [userId, setUserId] = useState<number | null>(null);

  const fetchActiveIncidents = useCallback(async () => {
    if (!user?.id) {
      setActiveIncidents([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      setUserId(user.id);

      const { results: assignedIncidents } = await getMyAssignedIncidentesApiV1IncidentesMisAsignacionesGet({
        responseStyle: 'data',
      });

      // Filter to only assigned incidents in active states (if not already filtered by API)
      const activeStates = ['REGISTRADO', 'EN_DIAGNOSTICO', 'PENDIENTE_REPUESTOS', 'EN_REPARACION'];
      const filteredAssignedIncidents = (assignedIncidents || []).filter((inc: IncidenteSchema) => 
        activeStates.includes(inc.estado)
      );

      // Enrich with product data
      const enrichedIncidents: ActiveIncident[] = await Promise.all(
        filteredAssignedIncidents.map(async (inc: IncidenteSchema) => {
          let producto: ProductoSchema | null = null;
          if (inc.producto?.id) {
            try {
              const { result } = await getProductoApiV1ProductosProductoIdGet({
                path: { producto_id: inc.producto.id },
                responseStyle: 'data',
              });
              producto = result;
            } catch (e) {
              console.warn(`Error fetching producto ${inc.producto.id}:`, e);
            }
          }

          // Count pending notifications (simplified - could be enhanced)
          let notificacionesPendientes = 0;

          return {
            ...inc,
            producto: producto || inc.producto, // Use fetched product if available, otherwise original
            codigo_producto: producto?.codigo || inc.producto?.codigo,
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
  }, [user?.id]);

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
