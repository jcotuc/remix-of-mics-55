import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { solicitudService, SolicitudFilters } from "@/services/solicitudService";
import { showError, showSuccess } from "@/utils/toastHelpers";
import type { Database } from "@/integrations/supabase/types";

type SolicitudInsert = Database["public"]["Tables"]["solicitudes_repuestos"]["Insert"];
type SolicitudUpdate = Database["public"]["Tables"]["solicitudes_repuestos"]["Update"];

/**
 * Hook para obtener una solicitud por ID
 */
export const useSolicitud = (id: string | undefined) => {
  return useQuery({
    queryKey: ["solicitud", id],
    queryFn: () => solicitudService.getById(id!),
    enabled: !!id,
  });
};

/**
 * Hook para listar solicitudes de un incidente
 */
export const useSolicitudesByIncidente = (incidenteId: string | undefined) => {
  return useQuery({
    queryKey: ["solicitudes", "incidente", incidenteId],
    queryFn: () => solicitudService.listByIncidente(incidenteId!),
    enabled: !!incidenteId,
  });
};

/**
 * Hook para listar solicitudes con filtros
 */
export const useSolicitudes = (filters?: SolicitudFilters) => {
  return useQuery({
    queryKey: ["solicitudes", filters],
    queryFn: () => solicitudService.list(filters),
  });
};

/**
 * Hook para listar solicitudes pendientes
 */
export const useSolicitudesPendientes = (centroServicioId?: string) => {
  return useQuery({
    queryKey: ["solicitudes", "pendientes", centroServicioId],
    queryFn: () => solicitudService.listPendientes(centroServicioId),
  });
};

/**
 * Hook para contar solicitudes pendientes
 */
export const useSolicitudesPendientesCount = (centroServicioId?: string) => {
  return useQuery({
    queryKey: ["solicitudes", "pendientes", "count", centroServicioId],
    queryFn: () => solicitudService.countPendientes(centroServicioId),
  });
};

/**
 * Hook para obtener estadísticas de solicitudes
 */
export const useSolicitudesEstadisticas = (centroServicioId?: string) => {
  return useQuery({
    queryKey: ["solicitudes", "estadisticas", centroServicioId],
    queryFn: () => solicitudService.getEstadisticas(centroServicioId),
  });
};

/**
 * Hook para crear una solicitud
 */
export const useCreateSolicitud = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (solicitud: SolicitudInsert) => 
      solicitudService.create(solicitud),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["solicitudes"] });
      queryClient.invalidateQueries({ 
        queryKey: ["solicitudes", "incidente", data.incidente_id] 
      });
      showSuccess("Solicitud creada correctamente");
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });
};

/**
 * Hook para crear múltiples solicitudes
 */
export const useCreateManySolicitudes = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (solicitudes: SolicitudInsert[]) => 
      solicitudService.createMany(solicitudes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["solicitudes"] });
      showSuccess("Solicitudes creadas correctamente");
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });
};

/**
 * Hook para actualizar una solicitud
 */
export const useUpdateSolicitud = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: SolicitudUpdate;
    }) => solicitudService.update(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["solicitudes"] });
      queryClient.invalidateQueries({ queryKey: ["solicitud", data.id] });
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });
};

/**
 * Hook para despachar una solicitud
 */
export const useDespacharSolicitud = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      id, 
      cantidadEntregada, 
      despachadorId 
    }: { 
      id: string; 
      cantidadEntregada: number; 
      despachadorId?: string;
    }) => solicitudService.despachar(id, cantidadEntregada, despachadorId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["solicitudes"] });
      queryClient.invalidateQueries({ queryKey: ["solicitud", data.id] });
      showSuccess("Solicitud despachada correctamente");
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });
};

/**
 * Hook para cancelar una solicitud
 */
export const useCancelarSolicitud = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      id, 
      motivo 
    }: { 
      id: string; 
      motivo?: string;
    }) => solicitudService.cancelar(id, motivo),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["solicitudes"] });
      queryClient.invalidateQueries({ queryKey: ["solicitud", data.id] });
      showSuccess("Solicitud cancelada");
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });
};
