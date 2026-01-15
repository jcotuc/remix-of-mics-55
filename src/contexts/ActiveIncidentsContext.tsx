import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type IncidenteDB = Database['public']['Tables']['incidentes']['Row'];

interface ActiveIncident extends IncidenteDB {
  notificacionesPendientes: number;
}

interface ActiveIncidentsContextType {
  activeIncidents: ActiveIncident[];
  isLoading: boolean;
  userId: string | null;
  refreshIncidents: () => Promise<void>;
  removeIncident: (incidenteId: string) => void;
  maxAssignments: number;
  currentAssignments: number;
  canTakeMoreAssignments: boolean;
}

const ActiveIncidentsContext = createContext<ActiveIncidentsContextType | null>(null);

export const MAX_ASSIGNMENTS = 3;

export function ActiveIncidentsProvider({ children }: { children: React.ReactNode }) {
  const [activeIncidents, setActiveIncidents] = useState<ActiveIncident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Cargar incidentes activos
  const fetchActiveIncidents = useCallback(async () => {
    if (!userId) return;

    try {
      // Obtener incidentes en diagnóstico asignados al técnico
      const { data: incidentes, error } = await supabase
        .from('incidentes')
        .select('*')
        .eq('tecnico_asignado_id', userId)
        .eq('status', 'En diagnostico')
        .order('fecha_ingreso', { ascending: true });

      if (error) throw error;

      // Obtener conteo de notificaciones por incidente
      const incidenteIds = incidentes?.map(i => i.id) || [];
      
      if (incidenteIds.length > 0) {
        const { data: notificaciones } = await supabase
          .from('notificaciones')
          .select('incidente_id')
          .eq('user_id', userId)
          .eq('leido', false)
          .in('incidente_id', incidenteIds);

        // Mapear incidentes con conteo de notificaciones
        const incidentesConNotif = incidentes?.map(inc => ({
          ...inc,
          notificacionesPendientes: notificaciones?.filter(n => n.incidente_id === inc.id).length || 0
        })) || [];

        setActiveIncidents(incidentesConNotif);
      } else {
        setActiveIncidents([]);
      }
    } catch (error) {
      console.error('Error fetching active incidents:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Inicializar userId
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Cargar incidentes cuando cambie userId
  useEffect(() => {
    if (userId) {
      fetchActiveIncidents();
    }
  }, [userId, fetchActiveIncidents]);

  // Suscripción real-time a cambios en incidentes
  useEffect(() => {
    if (!userId) return;

    const incidentesChannel = supabase
      .channel('active-incidents-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'incidentes',
          filter: `tecnico_asignado_id=eq.${userId}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const newData = payload.new as IncidenteDB;
            
            // Si el status cambió de "En diagnostico" a otro, eliminar del widget
            if (newData.status !== 'En diagnostico') {
              setActiveIncidents(prev => {
                const removed = prev.find(inc => inc.id === newData.id);
                if (removed) {
                  // Mostrar toast según el nuevo status
                  const statusMessages: Record<string, string> = {
                    'Reparado': '✅ Incidente completado',
                    'Pendiente por repuestos': '⏸ Incidente en espera de repuestos',
                    'Cambio por garantia': '🔄 Incidente cambió a garantía',
                    'Rechazado': '❌ Incidente rechazado'
                  };
                  const message = statusMessages[newData.status] || `Incidente ${newData.codigo} cambió de estado`;
                  toast.info(message);
                }
                return prev.filter(inc => inc.id !== newData.id);
              });
            } else {
              // Actualizar datos del incidente
              setActiveIncidents(prev => 
                prev.map(inc => 
                  inc.id === newData.id 
                    ? { ...inc, ...newData }
                    : inc
                )
              );
            }
          } else if (payload.eventType === 'INSERT') {
            // Nuevo incidente asignado
            const newData = payload.new as IncidenteDB;
            if (newData.status === 'En diagnostico') {
              setActiveIncidents(prev => {
                if (prev.find(inc => inc.id === newData.id)) return prev;
                return [...prev, { ...newData, notificacionesPendientes: 0 }];
              });
            }
          }
        }
      )
      .subscribe();

    // Suscripción a notificaciones
    const notificacionesChannel = supabase
      .channel('incident-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificaciones',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const newNotif = payload.new as Database['public']['Tables']['notificaciones']['Row'];
          if (newNotif.incidente_id) {
            setActiveIncidents(prev => 
              prev.map(inc => 
                inc.id === newNotif.incidente_id
                  ? { ...inc, notificacionesPendientes: inc.notificacionesPendientes + 1 }
                  : inc
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(incidentesChannel);
      supabase.removeChannel(notificacionesChannel);
    };
  }, [userId]);

  const removeIncident = useCallback((incidenteId: string) => {
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