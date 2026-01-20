import { toast } from "@/hooks/use-toast";

/**
 * Muestra un toast de error con estilo destructive
 * @param message - Mensaje a mostrar
 * @param title - Título opcional (default: "Error")
 */
export const showError = (message: string, title: string = "Error") => {
  toast({ 
    title, 
    description: message, 
    variant: "destructive" 
  });
};

/**
 * Muestra un toast de éxito
 * @param message - Mensaje a mostrar
 * @param title - Título opcional (default: "Éxito")
 */
export const showSuccess = (message: string, title: string = "Éxito") => {
  toast({ 
    title, 
    description: message 
  });
};

/**
 * Muestra un toast de advertencia
 * @param message - Mensaje a mostrar
 * @param title - Título opcional (default: "Advertencia")
 */
export const showWarning = (message: string, title: string = "Advertencia") => {
  toast({ 
    title, 
    description: message,
    variant: "destructive"
  });
};

/**
 * Muestra un toast informativo
 * @param message - Mensaje a mostrar
 * @param title - Título opcional (default: "Información")
 */
export const showInfo = (message: string, title: string = "Información") => {
  toast({ 
    title, 
    description: message 
  });
};
