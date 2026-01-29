/**
 * Types for Reincidencias (Recurrence Verification) Module
 */

export interface VerificacionReincidencia {
  id: number;
  incidente_id: number;
  incidente_anterior_id: number | null;
  es_reincidencia: boolean;
  aplica_reingreso: boolean | null;
  motivo_no_reingreso: string | null;
  justificacion: string;
  evidencias_urls: string[];
  problema_actual: string | null;
  problema_anterior: string | null;
  dias_desde_reparacion: number | null;
  verificado_por: number;
  verificado_at: string;
  created_at: string;
  updated_at: string;
  // Joined data
  verificador?: {
    id: number;
    nombre: string;
  };
}

export interface IncidenteParaVerificar {
  id: number;
  codigo: string;
  cliente_id: number;
  producto_id: number | null;
  descripcion_problema: string | null;
  estado: string;
  fecha_ingreso: string | null;
  fecha_entrega: string | null;
  cliente?: {
    id: number;
    nombre: string;
    codigo: string;
  };
  producto?: {
    id: number;
    codigo: string;
    descripcion: string;
  };
  verificacion_existente?: VerificacionReincidencia | null;
}

export interface IncidenteHistorial {
  id: number;
  codigo: string;
  descripcion_problema: string | null;
  estado: string;
  fecha_ingreso: string | null;
  fecha_entrega: string | null;
  producto_id: number | null;
  producto?: {
    id: number;
    codigo: string;
    descripcion: string;
  };
  dias_desde_reparacion: number;
  dentro_garantia: boolean;
  mismo_producto: boolean;
}

export type MotivoNoReingreso = 
  | "FUERA_PERIODO" 
  | "MAL_USO" 
  | "FALLA_DIFERENTE" 
  | "SIN_ANTERIOR";

export interface WizardData {
  // Step 1
  incidenteActual: IncidenteParaVerificar | null;
  
  // Step 2
  incidentesHistorial: IncidenteHistorial[];
  incidenteAnteriorId: number | null;
  filtroMismoProducto: boolean;
  
  // Step 3
  esReincidencia: boolean | null;
  aplicaReingreso: boolean | null;
  motivoNoReingreso: MotivoNoReingreso | null;
  justificacion: string;
  evidenciasUrls: string[];
}

export const MOTIVOS_NO_REINGRESO: { value: MotivoNoReingreso; label: string }[] = [
  { value: "FUERA_PERIODO", label: "Fuera del período de garantía (>30 días)" },
  { value: "MAL_USO", label: "Falla por mal uso del cliente" },
  { value: "FALLA_DIFERENTE", label: "Es una falla diferente a la anterior" },
  { value: "SIN_ANTERIOR", label: "No hay incidente anterior relacionado" },
];

export const PERIODO_GARANTIA_DIAS = 30;
