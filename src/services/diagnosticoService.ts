import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Diagnostico = Database["public"]["Tables"]["diagnosticos"]["Row"];
type DiagnosticoInsert = Database["public"]["Tables"]["diagnosticos"]["Insert"];
type DiagnosticoUpdate = Database["public"]["Tables"]["diagnosticos"]["Update"];
type EstadoDiagnostico = Database["public"]["Enums"]["estadodiagnostico"];

/**
 * Servicio centralizado para operaciones de diagnósticos
 */
export const diagnosticoService = {
  /**
   * Obtiene un diagnóstico por su ID (numérico)
   */
  async getById(id: number): Promise<Diagnostico | null> {
    const { data, error } = await supabase
      .from("diagnosticos")
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
   * Obtiene el diagnóstico de un incidente
   */
  async getByIncidenteId(incidenteId: number): Promise<Diagnostico | null> {
    const { data, error } = await supabase
      .from("diagnosticos")
      .select("*")
      .eq("incidente_id", incidenteId)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  /**
   * Lista diagnósticos por técnico
   */
  async listByTecnico(tecnicoCodigo: string): Promise<Diagnostico[]> {
    const { data, error } = await supabase
      .from("diagnosticos")
      .select("*")
      .eq("tecnico_codigo", tecnicoCodigo)
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  /**
   * Lista diagnósticos pendientes
   */
  async listPendientesDigitacion(): Promise<Diagnostico[]> {
    const { data, error } = await supabase
      .from("diagnosticos")
      .select("*")
      .eq("estado", "PENDIENTE" as EstadoDiagnostico)
      .order("created_at", { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  /**
   * Crea un nuevo diagnóstico
   */
  async create(diagnostico: DiagnosticoInsert): Promise<Diagnostico> {
    const { data, error } = await supabase
      .from("diagnosticos")
      .insert(diagnostico)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Actualiza un diagnóstico
   */
  async update(id: number, updates: DiagnosticoUpdate): Promise<Diagnostico> {
    const { data, error } = await supabase
      .from("diagnosticos")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Actualiza un diagnóstico por incidente ID
   */
  async updateByIncidenteId(
    incidenteId: number, 
    updates: DiagnosticoUpdate
  ): Promise<Diagnostico | null> {
    const { data, error } = await supabase
      .from("diagnosticos")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("incidente_id", incidenteId)
      .select()
      .single();
    
    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data;
  },

  /**
   * Marca un diagnóstico como finalizado
   */
  async finalizarDiagnostico(id: number): Promise<Diagnostico> {
    return this.update(id, {
      estado: "COMPLETADO" as EstadoDiagnostico,
      fecha_fin_diagnostico: new Date().toISOString()
    });
  },

  /**
   * Asigna un digitador al diagnóstico
   */
  async asignarDigitador(
    id: number, 
    digitadorId: number, 
    digitadorCodigo: string
  ): Promise<Diagnostico> {
    return this.update(id, {
      digitador_asignado: digitadorId,
      digitador_codigo: digitadorCodigo,
      fecha_inicio_digitacion: new Date().toISOString()
    });
  },

  /**
   * Agrega fotos al diagnóstico
   */
  async addFotos(id: number, fotosUrls: string[]): Promise<Diagnostico> {
    const current = await this.getById(id);
    if (!current) throw new Error("Diagnóstico no encontrado");

    const existingFotos = current.fotos_urls || [];
    const allFotos = [...existingFotos, ...fotosUrls];

    return this.update(id, { fotos_urls: allFotos });
  },

  /**
   * Cuenta diagnósticos por estado
   */
  async countByEstado(estado: EstadoDiagnostico): Promise<number> {
    const { count, error } = await supabase
      .from("diagnosticos")
      .select("id", { count: "exact", head: true })
      .eq("estado", estado);
    
    if (error) throw error;
    return count || 0;
  }
};
