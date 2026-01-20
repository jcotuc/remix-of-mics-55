import React, { createContext, useContext, useState } from "react";
import type { Database } from "@/integrations/supabase/types";

type IncidenteDB = Database['public']['Tables']['incidentes']['Row'];

export interface ActiveIncident extends IncidenteDB {
  notificacionesPendientes: number;
  // The following fields don't exist in the DB schema, so we add them as optional
  codigo_producto?: string;
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
  // This context is disabled because it requires fields that don't exist in the DB:
  // - tecnico_asignado_id
  // - status (column is named 'estado')
  // - user_id on notificaciones
  
  const [activeIncidents] = useState<ActiveIncident[]>([]);
  const [isLoading] = useState(false);
  const [userId] = useState<string | null>(null);

  const value: ActiveIncidentsContextType = {
    activeIncidents,
    isLoading,
    userId,
    refreshIncidents: async () => {},
    removeIncident: () => {},
    maxAssignments: MAX_ASSIGNMENTS,
    currentAssignments: 0,
    canTakeMoreAssignments: true
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
