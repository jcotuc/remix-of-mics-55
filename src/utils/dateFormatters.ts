import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Formatea una fecha en formato corto: dd/MM/yyyy
 * @param fecha - Fecha a formatear (string o Date)
 * @returns Fecha formateada o cadena vacía si es inválida
 */
export const formatFechaCorta = (fecha: string | Date | null | undefined): string => {
  if (!fecha) return "";
  try {
    return format(new Date(fecha), "dd/MM/yyyy", { locale: es });
  } catch {
    return "";
  }
};

/**
 * Formatea una fecha con hora: dd/MM/yyyy HH:mm
 * @param fecha - Fecha a formatear (string o Date)
 * @returns Fecha y hora formateada o cadena vacía si es inválida
 */
export const formatFechaHora = (fecha: string | Date | null | undefined): string => {
  if (!fecha) return "";
  try {
    return format(new Date(fecha), "dd/MM/yyyy HH:mm", { locale: es });
  } catch {
    return "";
  }
};

/**
 * Formatea una fecha en formato largo: dd de MMMM de yyyy
 * @param fecha - Fecha a formatear (string o Date)
 * @returns Fecha formateada o cadena vacía si es inválida
 */
export const formatFechaLarga = (fecha: string | Date | null | undefined): string => {
  if (!fecha) return "";
  try {
    return format(new Date(fecha), "dd 'de' MMMM 'de' yyyy", { locale: es });
  } catch {
    return "";
  }
};

/**
 * Formatea solo la hora: HH:mm
 * @param fecha - Fecha a formatear (string o Date)
 * @returns Hora formateada o cadena vacía si es inválida
 */
export const formatHora = (fecha: string | Date | null | undefined): string => {
  if (!fecha) return "";
  try {
    return format(new Date(fecha), "HH:mm", { locale: es });
  } catch {
    return "";
  }
};

/**
 * Formatea una fecha relativa: "hace 2 días", "hace 3 horas"
 * @param fecha - Fecha a formatear (string o Date)
 * @returns Tiempo relativo o cadena vacía si es inválida
 */
export const formatFechaRelativa = (fecha: string | Date | null | undefined): string => {
  if (!fecha) return "";
  try {
    return formatDistanceToNow(new Date(fecha), { addSuffix: true, locale: es });
  } catch {
    return "";
  }
};

/**
 * Crea una entrada de log con timestamp
 * @param mensaje - Mensaje del log
 * @returns Entrada formateada: [dd/MM/yyyy HH:mm] mensaje
 */
export const formatLogEntry = (mensaje: string): string => {
  return `[${format(new Date(), "dd/MM/yyyy HH:mm")}] ${mensaje}`;
};

/**
 * Formatea fecha para inputs de tipo date: yyyy-MM-dd
 * @param fecha - Fecha a formatear (string o Date)
 * @returns Fecha en formato ISO o cadena vacía si es inválida
 */
export const formatFechaInput = (fecha: string | Date | null | undefined): string => {
  if (!fecha) return "";
  try {
    return format(new Date(fecha), "yyyy-MM-dd");
  } catch {
    return "";
  }
};

/**
 * Formatea fecha para inputs de tipo datetime-local: yyyy-MM-ddTHH:mm
 * @param fecha - Fecha a formatear (string o Date)
 * @returns Fecha y hora en formato ISO o cadena vacía si es inválida
 */
export const formatFechaHoraInput = (fecha: string | Date | null | undefined): string => {
  if (!fecha) return "";
  try {
    return format(new Date(fecha), "yyyy-MM-dd'T'HH:mm");
  } catch {
    return "";
  }
};
