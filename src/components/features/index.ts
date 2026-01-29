/**
 * Features Components - Main Barrel Export
 * 
 * Re-exporta todos los componentes de features organizados por dominio.
 * 
 * @example
 * // Importar por dominio específico (recomendado)
 * import { IncidentTimeline } from "@/components/features/incidentes";
 * import { DiagnosticoTecnico } from "@/components/features/diagnostico";
 * 
 * // O importar desde features directamente
 * import { IncidentTimeline, DiagnosticoTecnico } from "@/components/features";
 */

export * from "./incidentes";
export * from "./diagnostico";
export * from "./media";
export * from "./logistica";
export * from "./auditoria";
export * from "./reincidencias";
