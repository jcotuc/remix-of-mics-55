import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toastHelpers";
import type { Database } from "@/integrations/supabase/types";

// Use the actual enum from the database
type EstadoIncidente = Database["public"]["Enums"]["estadoincidente"];
type IncidenteRow = Database["public"]["Tables"]["incidentes"]["Row"];

/**
 * Hook para obtener un incidente por ID
 */
export const useIncidente = (id: string | undefined) => {
  return useQuery({
    queryKey: ["incidente", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("incidentes")
        .select("*")
        .eq("id", Number(id))
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
};

/**
 * Hook para obtener un incidente con relaciones (cliente, producto)
 */
export const useIncidenteConRelaciones = (id: string | undefined) => {
  return useQuery({
    queryKey: ["incidente", id, "relaciones"],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("incidentes")
        .select(`
          *,
          clientes!cliente_id(nombre, celular, nit),
          productos!producto_id(descripcion)
        `)
        .eq("id", Number(id))
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
};

/**
 * Hook para obtener un incidente por código
 */
export const useIncidenteByCodigo = (codigo: string | undefined) => {
  return useQuery({
    queryKey: ["incidente", "codigo", codigo],
    queryFn: async () => {
      if (!codigo) return null;
      const { data, error } = await supabase
        .from("incidentes")
        .select("*")
        .eq("codigo", codigo)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!codigo,
  });
};

/**
 * Hook para listar incidentes con filtros
 */
export const useIncidentes = (filters?: { estado?: EstadoIncidente | EstadoIncidente[], limit?: number }) => {
  return useQuery({
    queryKey: ["incidentes", filters],
    queryFn: async () => {
      let query = supabase
        .from("incidentes")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.estado) {
        if (Array.isArray(filters.estado)) {
          query = query.in("estado", filters.estado);
        } else {
          query = query.eq("estado", filters.estado);
        }
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
};

/**
 * Hook para listar incidentes de un cliente
 */
export const useIncidentesByCliente = (clienteId: number | undefined) => {
  return useQuery({
    queryKey: ["incidentes", "cliente", clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      const { data, error } = await supabase
        .from("incidentes")
        .select("*")
        .eq("cliente_id", clienteId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!clienteId,
  });
};

/**
 * Hook para listar incidentes de un técnico
 */
export const useIncidentesByTecnico = (tecnicoId: string | undefined) => {
  return useQuery({
    queryKey: ["incidentes", "tecnico", tecnicoId],
    queryFn: async () => {
      if (!tecnicoId) return [];
      // Note: The incidentes table uses incidente_tecnico junction table
      const { data, error } = await supabase
        .from("incidente_tecnico")
        .select(`
          incidente_id,
          incidentes!incidente_id(*)
        `)
        .eq("tecnico_id", Number(tecnicoId));
      if (error) throw error;
      return data?.map(d => d.incidentes).filter(Boolean) || [];
    },
    enabled: !!tecnicoId,
  });
};

/**
 * Hook para contar incidentes por estado
 */
export const useIncidentesCount = (estado: EstadoIncidente | EstadoIncidente[]) => {
  return useQuery({
    queryKey: ["incidentes", "count", estado],
    queryFn: async () => {
      let query = supabase
        .from("incidentes")
        .select("id", { count: "exact", head: true });

      if (Array.isArray(estado)) {
        query = query.in("estado", estado);
      } else {
        query = query.eq("estado", estado);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
  });
};

/**
 * Hook para obtener estadísticas de incidentes
 */
export const useIncidentesEstadisticas = (centroServicioId?: number) => {
  return useQuery({
    queryKey: ["incidentes", "estadisticas", centroServicioId],
    queryFn: async () => {
      let query = supabase
        .from("incidentes")
        .select("estado");

      if (centroServicioId) {
        query = query.eq("centro_de_servicio_id", centroServicioId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const stats = (data || []).reduce((acc, inc) => {
        acc[inc.estado] = (acc[inc.estado] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return stats;
    },
  });
};

/**
 * Hook para actualizar el estado de un incidente
 */
export const useUpdateIncidenteStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      estado
    }: { 
      id: number; 
      estado: EstadoIncidente;
    }) => {
      const { data, error } = await supabase
        .from("incidentes")
        .update({ estado, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["incidentes"] });
      queryClient.invalidateQueries({ queryKey: ["incidente", String(data.id)] });
      showSuccess("Estado actualizado correctamente");
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });
};

/**
 * Hook para actualizar un incidente
 */
export const useUpdateIncidente = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: number; 
      updates: Partial<IncidenteRow>;
    }) => {
      const { data, error } = await supabase
        .from("incidentes")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["incidentes"] });
      queryClient.invalidateQueries({ queryKey: ["incidente", String(data.id)] });
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });
};

/**
 * Hook para asignar un técnico a un incidente
 */
export const useAsignarTecnico = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      incidenteId, 
      tecnicoId
    }: { 
      incidenteId: number; 
      tecnicoId: number;
    }) => {
      const { data, error } = await supabase
        .from("incidente_tecnico")
        .insert({
          incidente_id: incidenteId,
          tecnico_id: tecnicoId,
          es_principal: true
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["incidentes"] });
      queryClient.invalidateQueries({ queryKey: ["incidente", String(data.incidente_id)] });
      showSuccess("Técnico asignado correctamente");
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });
};

/**
 * Hook para agregar una entrada al log de un incidente
 */
export const useAddLogEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      mensaje 
    }: { 
      id: number; 
      mensaje: string;
    }) => {
      // Get current incidente
      const { data: current, error: fetchError } = await supabase
        .from("incidentes")
        .select("observaciones")
        .eq("id", id)
        .single();
      
      if (fetchError) throw fetchError;

      const timestamp = new Date().toISOString();
      const newEntry = `[${timestamp}] ${mensaje}`;
      const newObservaciones = current.observaciones 
        ? `${current.observaciones}\n${newEntry}`
        : newEntry;

      const { data, error } = await supabase
        .from("incidentes")
        .update({ observaciones: newObservaciones })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["incidente", String(data.id)] });
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });
};
