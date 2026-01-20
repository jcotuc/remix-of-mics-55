import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type SolicitudRepuesto = Database["public"]["Tables"]["solicitudes_repuestos"]["Row"];
type SolicitudInsert = Database["public"]["Tables"]["solicitudes_repuestos"]["Insert"];
type SolicitudUpdate = Database["public"]["Tables"]["solicitudes_repuestos"]["Update"];

export interface SolicitudFilters {
  incidenteId?: string;
  estado?: string | string[];
  centroServicioId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Servicio centralizado para operaciones de solicitudes de repuestos
 */
export const solicitudService = {
  /**
   * Obtiene una solicitud por su ID
   */
  async getById(id: string): Promise<SolicitudRepuesto | null> {
    const { data, error } = await supabase
      .from("solicitudes_repuestos")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data;
  },

  /**
   * Lista solicitudes de un incidente
   */
  async listByIncidente(incidenteId: string): Promise<SolicitudRepuesto[]> {
    const { data, error } = await supabase
      .from("solicitudes_repuestos")
      .select("*")
      .eq("incidente_id", incidenteId)
      .order("created_at", { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  /**
   * Lista solicitudes con filtros
   */
  async list(filters?: SolicitudFilters): Promise<SolicitudRepuesto[]> {
    // Build query without chaining to avoid type instantiation issues
    const baseQuery = supabase
      .from("solicitudes_repuestos")
      .select("*");
    
    // Apply filters using RPC or direct query based on needs
    let finalQuery = baseQuery.order("created_at", { ascending: false });

    if (filters?.incidenteId) {
      finalQuery = finalQuery.eq("incidente_id", filters.incidenteId);
    }

    if (filters?.estado) {
      if (Array.isArray(filters.estado)) {
        finalQuery = finalQuery.in("estado", filters.estado);
      } else {
        finalQuery = finalQuery.eq("estado", filters.estado);
      }
    }

    if (filters?.limit) {
      finalQuery = finalQuery.limit(filters.limit);
    }

    const { data, error } = await finalQuery;
    if (error) throw error;
    return data || [];
  },

  /**
   * Lista solicitudes pendientes de despacho
   */
  async listPendientes(centroServicioId?: string): Promise<SolicitudRepuesto[]> {
    return this.list({ 
      estado: ["pendiente", "parcial"], 
      centroServicioId 
    });
  },

  /**
   * Crea una nueva solicitud
   */
  async create(solicitud: SolicitudInsert): Promise<SolicitudRepuesto> {
    const { data, error } = await supabase
      .from("solicitudes_repuestos")
      .insert(solicitud)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Crea múltiples solicitudes
   */
  async createMany(solicitudes: SolicitudInsert[]): Promise<SolicitudRepuesto[]> {
    // Insert one by one to avoid type instantiation issues
    const results: SolicitudRepuesto[] = [];
    for (const solicitud of solicitudes) {
      const created = await this.create(solicitud);
      results.push(created);
    }
    return results;
  },

  /**
   * Actualiza una solicitud
   */
  async update(id: string, updates: SolicitudUpdate): Promise<SolicitudRepuesto> {
    const { data, error } = await supabase
      .from("solicitudes_repuestos")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Despacha una solicitud (registra cantidad entregada)
   */
  async despachar(
    id: string, 
    cantidadEntregada: number,
    despachadorId?: string
  ): Promise<SolicitudRepuesto> {
    const solicitud = await this.getById(id);
    if (!solicitud) throw new Error("Solicitud no encontrada");

    const nuevoEstado = cantidadEntregada >= solicitud.cantidad 
      ? "entregado" 
      : "parcial";

    return this.update(id, {
      cantidad_entregada: cantidadEntregada,
      estado: nuevoEstado,
      fecha_despacho: new Date().toISOString(),
      despachado_por: despachadorId
    });
  },

  /**
   * Cancela una solicitud
   */
  async cancelar(id: string, motivo?: string): Promise<SolicitudRepuesto> {
    return this.update(id, {
      estado: "cancelado",
      notas: motivo
    });
  },

  /**
   * Cuenta solicitudes pendientes por centro de servicio
   */
  async countPendientes(centroServicioId?: string): Promise<number> {
    const { count, error } = await supabase
      .from("solicitudes_repuestos")
      .select("id", { count: "exact", head: true })
      .in("estado", ["pendiente", "parcial"]);

    if (error) throw error;
    return count || 0;
  },

  /**
   * Obtiene estadísticas de solicitudes
   */
  async getEstadisticas(centroServicioId?: string) {
    const { data, error } = await supabase
      .from("solicitudes_repuestos")
      .select("estado");

    if (error) throw error;

    return (data || []).reduce((acc, sol) => {
      acc[sol.estado] = (acc[sol.estado] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
};
