/**
 * Types for Audit Wizard
 */

export interface PreguntaAuditoria {
  id: number;
  codigo: string;
  familia_producto_id: number | null;
  seccion: string;
  texto: string;
  descripcion: string | null;
  opciones: string[];
  orden: number;
  activo: boolean;
}

export interface RespuestaAuditoria {
  pregunta_id: number;
  respuesta: string | null;
}

export interface AuditoriaFormData {
  incidente_id: number | null;
  clasificacion: "DEPARTAMENTAL" | "INTERNA" | null;
  tipo_auditoria_modalidad: "PRESENCIAL" | "VIRTUAL" | null;
  tipologia_reparacion: "GARANTIA" | "PRESUPUESTO" | null;
  familia_producto_id: number | null;
  centro_servicio_id: number | null;
  observaciones: string;
  resultado: "APRUEBA" | "NO_APRUEBA" | null;
  evidencias_urls: string[];
}

export interface IncidenteParaAuditoria {
  id: number;
  codigo: string;
  estado: string;
  centro_de_servicio_id: number;
  centro_de_servicio?: {
    id: number;
    nombre: string;
  };
  producto?: {
    id: number;
    descripcion: string;
    familia_id?: number;
  };
  cliente?: {
    id: number;
    nombre: string;
  };
  aplica_garantia?: boolean;
  tipologia?: string;
}

export type WizardStep = "incidente" | "documental" | "fisica" | "validacion";
