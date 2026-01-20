import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { formatLogEntry } from "@/utils/dateFormatters";

type Incidente = Database["public"]["Tables"]["incidentes"]["Row"];
type IncidenteInsert = Database["public"]["Tables"]["incidentes"]["Insert"];
type IncidenteUpdate = Database["public"]["Tables"]["incidentes"]["Update"];
type StatusIncidente = Database["public"]["Enums"]["status_incidente"];

export interface IncidenteFilters {
  status?: StatusIncidente | StatusIncidente[];
  centroServicio?: string;
  codigoCliente?: string;
  codigoTecnico?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface IncidenteConRelaciones extends Incidente {
  cliente?: {
    nombre: string;
    celular: string;
    nit: string;
  } | null;
  producto?: {
    descripcion: string;
  } | null;
}

/**
 * Servicio centralizado para operaciones de incidentes
 */
export const incidenteService = {
  /**
   * Obtiene un incidente por su ID
   */
  async getById(id: string): Promise<Incidente | null> {
    const { data, error } = await supabase
      .from("incidentes")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Obtiene un incidente por su código (INC-XXXXXX)
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
  async getByIdConRelaciones(id: string): Promise<IncidenteConRelaciones | null> {
    const { data, error } = await supabase
      .from("incidentes")
      .select(`
        *,
        cliente:clientes!codigo_cliente(nombre, celular, nit),
        producto:productos!codigo_producto(descripcion)
      `)
      .eq("id", id)
      .single();
    
    if (error) throw error;
    return data as unknown as IncidenteConRelaciones;
  },

  /**
   * Lista incidentes con filtros opcionales
   */
  async list(filters?: IncidenteFilters): Promise<Incidente[]> {
    let query = supabase
      .from("incidentes")
      .select("*")
      .order("fecha_ingreso", { ascending: false });

    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        query = query.in("status", filters.status);
      } else {
        query = query.eq("status", filters.status);
      }
    }

    if (filters?.centroServicio) {
      query = query.eq("centro_servicio", filters.centroServicio);
    }

    if (filters?.codigoCliente) {
      query = query.eq("codigo_cliente", filters.codigoCliente);
    }

    if (filters?.codigoTecnico) {
      query = query.eq("codigo_tecnico", filters.codigoTecnico);
    }

    if (filters?.fechaDesde) {
      query = query.gte("fecha_ingreso", filters.fechaDesde);
    }

    if (filters?.fechaHasta) {
      query = query.lte("fecha_ingreso", filters.fechaHasta);
    }

    if (filters?.search) {
      query = query.or(`codigo.ilike.%${filters.search}%,codigo_cliente.ilike.%${filters.search}%,codigo_producto.ilike.%${filters.search}%`);
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
  async listByCliente(codigoCliente: string): Promise<Incidente[]> {
    return this.list({ codigoCliente });
  },

  /**
   * Lista incidentes por técnico asignado
   */
  async listByTecnico(tecnicoId: string): Promise<Incidente[]> {
    const { data, error } = await supabase
      .from("incidentes")
      .select("*")
      .eq("tecnico_asignado_id", tecnicoId)
      .order("fecha_ingreso", { ascending: false });
    
    if (error) throw error;
    return data || [];
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
  async update(id: string, updates: IncidenteUpdate): Promise<Incidente> {
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
   * Actualiza el estado de un incidente con log opcional
   */
  async updateStatus(
    id: string, 
    status: StatusIncidente, 
    logMessage?: string
  ): Promise<Incidente> {
    // Obtener incidente actual para el log
    const current = await this.getById(id);
    if (!current) throw new Error("Incidente no encontrado");

    const updates: IncidenteUpdate = { status };

    // Agregar entrada al log si se proporciona mensaje
    if (logMessage) {
      const newLogEntry = formatLogEntry(logMessage);
      updates.log_observaciones = current.log_observaciones 
        ? `${current.log_observaciones}\n${newLogEntry}`
        : newLogEntry;
    }

    return this.update(id, updates);
  },

  /**
   * Agrega una observación al log del incidente
   */
  async addLogEntry(id: string, mensaje: string): Promise<Incidente> {
    const current = await this.getById(id);
    if (!current) throw new Error("Incidente no encontrado");

    const newLogEntry = formatLogEntry(mensaje);
    const log_observaciones = current.log_observaciones 
      ? `${current.log_observaciones}\n${newLogEntry}`
      : newLogEntry;

    return this.update(id, { log_observaciones });
  },

  /**
   * Asigna un técnico a un incidente
   */
  async asignarTecnico(
    id: string, 
    tecnicoId: string, 
    tecnicoCodigo: string
  ): Promise<Incidente> {
    return this.update(id, {
      tecnico_asignado_id: tecnicoId,
      codigo_tecnico: tecnicoCodigo,
      fecha_asignacion_tecnico: new Date().toISOString(),
      status: "En diagnostico"
    });
  },

  /**
   * Cuenta incidentes por estado
   */
  async countByStatus(status: StatusIncidente | StatusIncidente[]): Promise<number> {
    let query = supabase
      .from("incidentes")
      .select("id", { count: "exact", head: true });

    if (Array.isArray(status)) {
      query = query.in("status", status);
    } else {
      query = query.eq("status", status);
    }

    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  },

  /**
   * Obtiene estadísticas de incidentes para un centro de servicio
   */
  async getEstadisticas(centroServicioId?: string) {
    let query = supabase
      .from("incidentes")
      .select("status");

    if (centroServicioId) {
      query = query.eq("centro_servicio", centroServicioId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const stats = (data || []).reduce((acc, inc) => {
      acc[inc.status] = (acc[inc.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return stats;
  }
};
