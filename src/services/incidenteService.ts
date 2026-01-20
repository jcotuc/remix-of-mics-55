import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Incidente = Database["public"]["Tables"]["incidentes"]["Row"];
type IncidenteInsert = Database["public"]["Tables"]["incidentes"]["Insert"];
type IncidenteUpdate = Database["public"]["Tables"]["incidentes"]["Update"];
type EstadoIncidente = Database["public"]["Enums"]["estadoincidente"];

export interface IncidenteFilters {
  estado?: EstadoIncidente | EstadoIncidente[];
  centroServicioId?: number;
  clienteId?: number;
  limit?: number;
  offset?: number;
  search?: string;
}

/**
 * Servicio centralizado para operaciones de incidentes
 */
export const incidenteService = {
  /**
   * Obtiene un incidente por su ID
   */
  async getById(id: number): Promise<Incidente | null> {
    const { data, error } = await supabase
      .from("incidentes")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Obtiene un incidente por su código
   */
  async getByCodigo(codigo: string): Promise<Incidente | null> {
    const { data, error } = await supabase
      .from("incidentes")
      .select("*")
      .eq("codigo", codigo)
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Obtiene un incidente con sus relaciones (cliente, producto)
   */
  async getByIdConRelaciones(id: number): Promise<any | null> {
    const { data, error } = await supabase
      .from("incidentes")
      .select(`
        *,
        clientes!cliente_id(nombre, celular, nit),
        productos!producto_id(descripcion)
      `)
      .eq("id", id)
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Lista incidentes con filtros opcionales
   */
  async list(filters?: IncidenteFilters): Promise<Incidente[]> {
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

    if (filters?.centroServicioId) {
      query = query.eq("centro_de_servicio_id", filters.centroServicioId);
    }

    if (filters?.clienteId) {
      query = query.eq("cliente_id", filters.clienteId);
    }

    if (filters?.search) {
      query = query.or(`codigo.ilike.%${filters.search}%`);
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

  /**
   * Lista incidentes por cliente
   */
  async listByCliente(clienteId: number): Promise<Incidente[]> {
    return this.list({ clienteId });
  },

  /**
   * Lista incidentes por técnico asignado (via junction table)
   */
  async listByTecnico(tecnicoId: number): Promise<Incidente[]> {
    const { data, error } = await supabase
      .from("incidente_tecnico")
      .select(`
        incidente_id,
        incidentes!incidente_id(*)
      `)
      .eq("tecnico_id", tecnicoId);
    
    if (error) throw error;
    return data?.map(d => d.incidentes as unknown as Incidente).filter(Boolean) || [];
  },

  /**
   * Crea un nuevo incidente
   */
  async create(incidente: IncidenteInsert): Promise<Incidente> {
    const { data, error } = await supabase
      .from("incidentes")
      .insert(incidente)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Actualiza un incidente
   */
  async update(id: number, updates: IncidenteUpdate): Promise<Incidente> {
    const { data, error } = await supabase
      .from("incidentes")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Actualiza el estado de un incidente
   */
  async updateStatus(id: number, estado: EstadoIncidente): Promise<Incidente> {
    return this.update(id, { estado });
  },

  /**
   * Agrega una observación al incidente
   */
  async addObservacion(id: number, mensaje: string): Promise<Incidente> {
    const current = await this.getById(id);
    if (!current) throw new Error("Incidente no encontrado");

    const timestamp = new Date().toISOString();
    const newEntry = `[${timestamp}] ${mensaje}`;
    const observaciones = current.observaciones 
      ? `${current.observaciones}\n${newEntry}`
      : newEntry;

    return this.update(id, { observaciones });
  },

  /**
   * Asigna un técnico a un incidente
   */
  async asignarTecnico(incidenteId: number, tecnicoId: number): Promise<void> {
    const { error } = await supabase
      .from("incidente_tecnico")
      .insert({
        incidente_id: incidenteId,
        tecnico_id: tecnicoId,
        es_principal: true
      });
    
    if (error) throw error;
  },

  /**
   * Cuenta incidentes por estado
   */
  async countByStatus(estado: EstadoIncidente | EstadoIncidente[]): Promise<number> {
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

  /**
   * Obtiene estadísticas de incidentes
   */
  async getEstadisticas(centroServicioId?: number) {
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
  }
};
