import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { incidenteService, IncidenteFilters } from "@/services/incidenteService";
import { showError, showSuccess } from "@/utils/toastHelpers";
import type { Database } from "@/integrations/supabase/types";

type StatusIncidente = Database["public"]["Enums"]["status_incidente"];

/**
 * Hook para obtener un incidente por ID
 */
export const useIncidente = (id: string | undefined) => {
  return useQuery({
    queryKey: ["incidente", id],
    queryFn: () => incidenteService.getById(id!),
    enabled: !!id,
  });
};

/**
 * Hook para obtener un incidente con relaciones (cliente, producto)
 */
export const useIncidenteConRelaciones = (id: string | undefined) => {
  return useQuery({
    queryKey: ["incidente", id, "relaciones"],
    queryFn: () => incidenteService.getByIdConRelaciones(id!),
    enabled: !!id,
  });
};

/**
 * Hook para obtener un incidente por código
 */
export const useIncidenteByCodigo = (codigo: string | undefined) => {
  return useQuery({
    queryKey: ["incidente", "codigo", codigo],
    queryFn: () => incidenteService.getByCodigo(codigo!),
    enabled: !!codigo,
  });
};

/**
 * Hook para listar incidentes con filtros
 */
export const useIncidentes = (filters?: IncidenteFilters) => {
  return useQuery({
    queryKey: ["incidentes", filters],
    queryFn: () => incidenteService.list(filters),
  });
};

/**
 * Hook para listar incidentes de un cliente
 */
export const useIncidentesByCliente = (codigoCliente: string | undefined) => {
  return useQuery({
    queryKey: ["incidentes", "cliente", codigoCliente],
    queryFn: () => incidenteService.listByCliente(codigoCliente!),
    enabled: !!codigoCliente,
  });
};

/**
 * Hook para listar incidentes de un técnico
 */
export const useIncidentesByTecnico = (tecnicoId: string | undefined) => {
  return useQuery({
    queryKey: ["incidentes", "tecnico", tecnicoId],
    queryFn: () => incidenteService.listByTecnico(tecnicoId!),
    enabled: !!tecnicoId,
  });
};

/**
 * Hook para contar incidentes por estado
 */
export const useIncidentesCount = (status: StatusIncidente | StatusIncidente[]) => {
  return useQuery({
    queryKey: ["incidentes", "count", status],
    queryFn: () => incidenteService.countByStatus(status),
  });
};

/**
 * Hook para obtener estadísticas de incidentes
 */
export const useIncidentesEstadisticas = (centroServicioId?: string) => {
  return useQuery({
    queryKey: ["incidentes", "estadisticas", centroServicioId],
    queryFn: () => incidenteService.getEstadisticas(centroServicioId),
  });
};

/**
 * Hook para actualizar el estado de un incidente
 */
export const useUpdateIncidenteStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      id, 
      status, 
      logMessage 
    }: { 
      id: string; 
      status: StatusIncidente; 
      logMessage?: string;
    }) => incidenteService.updateStatus(id, status, logMessage),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["incidentes"] });
      queryClient.invalidateQueries({ queryKey: ["incidente", data.id] });
      showSuccess("Estado actualizado correctamente");
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });
};

/**
 * Hook para actualizar un incidente
 */
export const useUpdateIncidente = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: Parameters<typeof incidenteService.update>[1];
    }) => incidenteService.update(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["incidentes"] });
      queryClient.invalidateQueries({ queryKey: ["incidente", data.id] });
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });
};

/**
 * Hook para asignar un técnico a un incidente
 */
export const useAsignarTecnico = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      id, 
      tecnicoId, 
      tecnicoCodigo 
    }: { 
      id: string; 
      tecnicoId: string; 
      tecnicoCodigo: string;
    }) => incidenteService.asignarTecnico(id, tecnicoId, tecnicoCodigo),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["incidentes"] });
      queryClient.invalidateQueries({ queryKey: ["incidente", data.id] });
      showSuccess("Técnico asignado correctamente");
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });
};

/**
 * Hook para agregar una entrada al log de un incidente
 */
export const useAddLogEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      id, 
      mensaje 
    }: { 
      id: string; 
      mensaje: string;
    }) => incidenteService.addLogEntry(id, mensaje),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["incidente", data.id] });
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });
};
