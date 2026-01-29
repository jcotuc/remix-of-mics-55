/**
 * Waterspider types for task management
 */

export type TipoTareaWS = "mostrador" | "logistica" | "repuesto" | "depuracion";

export interface TareaWS {
  id: number;
  incidente_id: number;
  codigo_incidente: string;
  tipo: TipoTareaWS;
  estado: string;
  prioridad: "critico" | "urgente" | "normal";
  zona?: string;
  producto_descripcion?: string;
  ubicacion_tecnico?: string;
  nombre_tecnico?: string;
  tiempo_espera_minutos: number;
  tecnico?: { nombre: string };
  created_at: string;
  updated_at?: string;
}

export interface ZoneCount {
  zona: string;
  count: number;
}
