import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Cliente = Database["public"]["Tables"]["clientes"]["Row"];
type ClienteInsert = Database["public"]["Tables"]["clientes"]["Insert"];
type ClienteUpdate = Database["public"]["Tables"]["clientes"]["Update"];

export interface ClienteFilters {
  search?: string;
  departamento?: string;
  origen?: string;
  limit?: number;
  offset?: number;
}

/**
 * Servicio centralizado para operaciones de clientes
 */
export const clienteService = {
  /**
   * Obtiene un cliente por su ID (numérico)
   */
  async getById(id: number): Promise<Cliente | null> {
    const { data, error } = await supabase
      .from("clientes")
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
   * Obtiene un cliente por su código (HPC-XXXXXX)
   */
  async getByCodigo(codigo: string): Promise<Cliente | null> {
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .eq("codigo", codigo)
      .single();
    
    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data;
  },

  /**
   * Obtiene un cliente por su NIT
   */
  async getByNit(nit: string): Promise<Cliente | null> {
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .eq("nit", nit)
      .single();
    
    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data;
  },

  /**
   * Lista clientes con filtros opcionales
   */
  async list(filters?: ClienteFilters): Promise<Cliente[]> {
    let query = supabase
      .from("clientes")
      .select("*")
      .order("nombre", { ascending: true });

    if (filters?.search) {
      query = query.or(
        `nombre.ilike.%${filters.search}%,codigo.ilike.%${filters.search}%,nit.ilike.%${filters.search}%,celular.ilike.%${filters.search}%`
      );
    }

    if (filters?.departamento) {
      query = query.eq("departamento", filters.departamento);
    }

    if (filters?.origen) {
      query = query.eq("origen", filters.origen);
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
   * Busca clientes por término (nombre, código, NIT, celular)
   */
  async search(term: string, limit: number = 10): Promise<Cliente[]> {
    return this.list({ search: term, limit });
  },

  /**
   * Crea un nuevo cliente
   */
  async create(cliente: ClienteInsert): Promise<Cliente> {
    const { data, error } = await supabase
      .from("clientes")
      .insert(cliente)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Actualiza un cliente (ID numérico)
   */
  async update(id: number, updates: ClienteUpdate): Promise<Cliente> {
    const { data, error } = await supabase
      .from("clientes")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Genera un nuevo código de cliente HPC
   * Nota: RPC function debe existir en la DB
   */
  async generarCodigo(): Promise<string> {
    // Generar código manualmente si la función RPC no existe
    const prefix = "HPC-";
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  },

  /**
   * Verifica si un NIT ya existe
   */
  async existeNit(nit: string, excludeId?: number): Promise<boolean> {
    let query = supabase
      .from("clientes")
      .select("id", { count: "exact", head: true })
      .eq("nit", nit);

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { count, error } = await query;
    if (error) throw error;
    return (count || 0) > 0;
  },

  /**
   * Obtiene las direcciones de envío de un cliente
   */
  async getDirecciones(codigoCliente: string) {
    const { data, error } = await (supabase as any)
      .from("direcciones_envio")
      .select("*")
      .eq("codigo_cliente", codigoCliente)
      .order("es_principal", { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  /**
   * Cuenta el total de clientes
   */
  async count(filters?: ClienteFilters): Promise<number> {
    let query = supabase
      .from("clientes")
      .select("id", { count: "exact", head: true });

    if (filters?.search) {
      query = query.or(
        `nombre.ilike.%${filters.search}%,codigo.ilike.%${filters.search}%,nit.ilike.%${filters.search}%`
      );
    }

    if (filters?.departamento) {
      query = query.eq("departamento", filters.departamento);
    }

    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  }
};
