/**
 * Configuración centralizada de estados de incidentes
 * Incluye etiquetas, colores y descripciones
 */

export type StatusIncidente = 
  | "Ingresado"
  | "En cola"
  | "En diagnostico"
  | "Presupuesto"
  | "Porcentaje"
  | "Pendiente por repuestos"
  | "En reparacion"
  | "Reparado"
  | "Pendiente entrega"
  | "Logistica envio"
  | "Entregado"
  | "Cerrado"
  | "Pendiente de aprobación NC"
  | "Nota de credito"
  | "Rechazado"
  | "Cambio"
  | "Cambio aprobado"
  | "Cambio rechazado";

export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  description: string;
}

export const STATUS_CONFIG: Record<string, StatusConfig> = {
  "Ingresado": {
    label: "Ingresado",
    color: "gray",
    bgColor: "bg-gray-100",
    textColor: "text-gray-800",
    borderColor: "border-gray-300",
    description: "Incidente registrado, pendiente de asignar a cola"
  },
  "En cola": {
    label: "En Cola",
    color: "blue",
    bgColor: "bg-blue-100",
    textColor: "text-blue-800",
    borderColor: "border-blue-300",
    description: "En cola de espera para asignación a técnico"
  },
  "En diagnostico": {
    label: "En Diagnóstico",
    color: "yellow",
    bgColor: "bg-yellow-100",
    textColor: "text-yellow-800",
    borderColor: "border-yellow-300",
    description: "Técnico realizando diagnóstico"
  },
  "Presupuesto": {
    label: "Presupuesto",
    color: "orange",
    bgColor: "bg-orange-100",
    textColor: "text-orange-800",
    borderColor: "border-orange-300",
    description: "Pendiente de aprobación de presupuesto por cliente"
  },
  "Porcentaje": {
    label: "Porcentaje",
    color: "purple",
    bgColor: "bg-purple-100",
    textColor: "text-purple-800",
    borderColor: "border-purple-300",
    description: "Cobro parcial aprobado"
  },
  "Pendiente por repuestos": {
    label: "Pendiente Repuestos",
    color: "red",
    bgColor: "bg-red-100",
    textColor: "text-red-800",
    borderColor: "border-red-300",
    description: "Esperando llegada de repuestos"
  },
  "En reparacion": {
    label: "En Reparación",
    color: "indigo",
    bgColor: "bg-indigo-100",
    textColor: "text-indigo-800",
    borderColor: "border-indigo-300",
    description: "Técnico realizando reparación"
  },
  "Reparado": {
    label: "Reparado",
    color: "green",
    bgColor: "bg-green-100",
    textColor: "text-green-800",
    borderColor: "border-green-300",
    description: "Reparación completada"
  },
  "Pendiente entrega": {
    label: "Pendiente Entrega",
    color: "teal",
    bgColor: "bg-teal-100",
    textColor: "text-teal-800",
    borderColor: "border-teal-300",
    description: "Listo para entrega en mostrador"
  },
  "Logistica envio": {
    label: "Logística Envío",
    color: "cyan",
    bgColor: "bg-cyan-100",
    textColor: "text-cyan-800",
    borderColor: "border-cyan-300",
    description: "Pendiente de envío por logística"
  },
  "Entregado": {
    label: "Entregado",
    color: "emerald",
    bgColor: "bg-emerald-100",
    textColor: "text-emerald-800",
    borderColor: "border-emerald-300",
    description: "Entregado al cliente"
  },
  "Cerrado": {
    label: "Cerrado",
    color: "slate",
    bgColor: "bg-slate-100",
    textColor: "text-slate-800",
    borderColor: "border-slate-300",
    description: "Incidente finalizado"
  },
  "Pendiente de aprobación NC": {
    label: "Pendiente Aprobación NC",
    color: "amber",
    bgColor: "bg-amber-100",
    textColor: "text-amber-800",
    borderColor: "border-amber-300",
    description: "Nota de crédito pendiente de aprobación"
  },
  "Nota de credito": {
    label: "Nota de Crédito",
    color: "lime",
    bgColor: "bg-lime-100",
    textColor: "text-lime-800",
    borderColor: "border-lime-300",
    description: "Nota de crédito aprobada"
  },
  "Rechazado": {
    label: "Rechazado",
    color: "rose",
    bgColor: "bg-rose-100",
    textColor: "text-rose-800",
    borderColor: "border-rose-300",
    description: "Incidente rechazado"
  },
  "Cambio": {
    label: "Cambio",
    color: "fuchsia",
    bgColor: "bg-fuchsia-100",
    textColor: "text-fuchsia-800",
    borderColor: "border-fuchsia-300",
    description: "Solicitud de cambio pendiente"
  },
  "Cambio aprobado": {
    label: "Cambio Aprobado",
    color: "green",
    bgColor: "bg-green-100",
    textColor: "text-green-800",
    borderColor: "border-green-300",
    description: "Cambio de producto aprobado"
  },
  "Cambio rechazado": {
    label: "Cambio Rechazado",
    color: "red",
    bgColor: "bg-red-100",
    textColor: "text-red-800",
    borderColor: "border-red-300",
    description: "Cambio de producto rechazado"
  }
};

/**
 * Obtiene la etiqueta de un estado
 */
export const getStatusLabel = (status: string): string => {
  return STATUS_CONFIG[status]?.label || status;
};

/**
 * Obtiene el color de un estado
 */
export const getStatusColor = (status: string): string => {
  return STATUS_CONFIG[status]?.color || "gray";
};

/**
 * Obtiene la descripción de un estado
 */
export const getStatusDescription = (status: string): string => {
  return STATUS_CONFIG[status]?.description || "";
};

/**
 * Obtiene las clases de Tailwind para un estado
 */
export const getStatusClasses = (status: string): string => {
  const config = STATUS_CONFIG[status];
  if (!config) return "bg-gray-100 text-gray-800 border-gray-300";
  return `${config.bgColor} ${config.textColor} ${config.borderColor}`;
};

/**
 * Estados que indican que el incidente está activo/en proceso
 */
export const ACTIVE_STATUSES: StatusIncidente[] = [
  "Ingresado",
  "En cola",
  "En diagnostico",
  "Presupuesto",
  "Porcentaje",
  "Pendiente por repuestos",
  "En reparacion"
];

/**
 * Estados que indican que el incidente está listo para entrega
 */
export const READY_FOR_DELIVERY_STATUSES: StatusIncidente[] = [
  "Reparado",
  "Pendiente entrega",
  "Logistica envio"
];

/**
 * Estados que indican que el incidente está cerrado/finalizado
 */
export const CLOSED_STATUSES: StatusIncidente[] = [
  "Entregado",
  "Cerrado",
  "Nota de credito",
  "Rechazado",
  "Cambio aprobado",
  "Cambio rechazado"
];

/**
 * Configuración de tipos de resolución de diagnóstico
 */
export const RESOLUTION_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  "REPARAR_EN_GARANTIA": { 
    label: "Reparación en Garantía", 
    icon: "✓", 
    color: "text-green-700" 
  },
  "REPARAR_FUERA_GARANTIA": { 
    label: "Reparación Fuera de Garantía", 
    icon: "🔧", 
    color: "text-orange-700" 
  },
  "CAMBIO_EN_GARANTIA": { 
    label: "Cambio por Garantía", 
    icon: "🔄", 
    color: "text-blue-700" 
  },
  "CAMBIO_FUERA_GARANTIA": { 
    label: "Cambio Fuera de Garantía", 
    icon: "🔄", 
    color: "text-purple-700" 
  },
  "NOTA_CREDITO": { 
    label: "Nota de Crédito", 
    icon: "💰", 
    color: "text-emerald-700" 
  },
  "DEVOLUCION": { 
    label: "Devolución", 
    icon: "↩", 
    color: "text-gray-700" 
  },
  "NO_REPARABLE": { 
    label: "No Reparable", 
    icon: "✗", 
    color: "text-red-700" 
  },
};

/**
 * Obtiene la etiqueta legible de un tipo de resolución
 */
export const getResolutionLabel = (resolution: string): string => {
  return RESOLUTION_LABELS[resolution]?.label || resolution.replace(/_/g, ' ');
};
