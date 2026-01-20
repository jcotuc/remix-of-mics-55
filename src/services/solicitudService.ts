import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type SolicitudRepuesto = Database["public"]["Tables"]["solicitudes_repuestos"]["Row"];
type SolicitudRepuestoInsert = Database["public"]["Tables"]["solicitudes_repuestos"]["Insert"];
type SolicitudRepuestoUpdate = Database["public"]["Tables"]["solicitudes_repuestos"]["Update"];
type EstadoSolicitud = Database["public"]["Enums"]["estado_solicitud"];

export interface SolicitudFilters {
  incidenteId?: number;
  estado?: EstadoSolicitud | EstadoSolicitud[];
  centroServicioId?: number;
  limit?: number;
  offset?: number;
}

/**
 * Servicio para solicitudes de repuestos
 */
export const solicitudService = {
  async getById(id: string): Promise<SolicitudRepuesto | null> {
    const { data, error } = await supabase
      .from("solicitudes_repuestos")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  async listByIncidente(incidenteId: string): Promise<SolicitudRepuesto[]> {
    const { data, error } = await supabase
      .from("solicitudes_repuestos")
      .select("*")
      .eq("incidente_id", incidenteId);

    if (error) throw error;
    return data || [];
  },

  async list(filters?: SolicitudFilters): Promise<SolicitudRepuesto[]> {
    let query = supabase
      .from("solicitudes_repuestos")
      .select("*")
      .order("created_at", { ascending: false });

    if (filters?.incidenteId) {
      query = query.eq("incidente_id", filters.incidenteId);
    }

    if (filters?.estado) {
      if (Array.isArray(filters.estado)) {
        query = query.in("estado", filters.estado);
      } else {
        query = query.eq("estado", filters.estado);
      }
    }

    if (filters?.centroServicioId) {
      query = query.eq("centro_servicio_id", filters.centroServicioId);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async listPendientes(centroServicioId?: number): Promise<SolicitudRepuesto[]> {
    let query = supabase
      .from("solicitudes_repuestos")
      .select("*")
      .eq("estado", "pendiente")
      .order("created_at", { ascending: false });

    if (centroServicioId) {
      query = query.eq("centro_servicio_id", centroServicioId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async create(solicitud: SolicitudRepuestoInsert): Promise<SolicitudRepuesto> {
    const { data, error } = await supabase
      .from("solicitudes_repuestos")
      .insert(solicitud)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async createMany(solicitudes: SolicitudRepuestoInsert[]): Promise<SolicitudRepuesto[]> {
    const { data, error } = await supabase
      .from("solicitudes_repuestos")
      .insert(solicitudes)
      .select();

    if (error) throw error;
    return data || [];
  },

  async update(id: string, updates: SolicitudRepuestoUpdate): Promise<SolicitudRepuesto> {
    const { data, error } = await supabase
      .from("solicitudes_repuestos")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async despachar(id: string, cantidadEntregada: number, despachadorId?: string): Promise<SolicitudRepuesto> {
    const { data, error } = await supabase
      .from("solicitudes_repuestos")
      .update({
        estado: "despachado",
        cantidad_entregada: cantidadEntregada,
        despachador_id: despachadorId,
        fecha_despacho: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async cancelar(id: string, motivo?: string): Promise<SolicitudRepuesto> {
    const { data, error } = await supabase
      .from("solicitudes_repuestos")
      .update({
        estado: "cancelado",
        motivo_cancelacion: motivo,
        fecha_cancelacion: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async countPendientes(centroServicioId?: number): Promise<number> {
    let query = supabase
      .from("solicitudes_repuestos")
      .select("id", { count: "exact", head: true })
      .eq("estado", "pendiente");

    if (centroServicioId) {
      query = query.eq("centro_servicio_id", centroServicioId);
    }

    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  },

  async getEstadisticas(centroServicioId?: number): Promise<Record<EstadoSolicitud, number>> {
    let query = supabase
      .from("solicitudes_repuestos")
      .select("estado");

    if (centroServicioId) {
      query = query.eq("centro_servicio_id", centroServicioId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const stats = (data || []).reduce((acc, solicitud) => {
      acc[solicitud.estado] = (acc[solicitud.estado] || 0) + 1;
      return acc;
    }, {} as Record<EstadoSolicitud, number>);

    return stats;
  }
};
