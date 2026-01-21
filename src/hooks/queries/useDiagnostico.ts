import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { diagnosticoService } from "@/services/diagnosticoService";
import { showError, showSuccess } from "@/utils/toastHelpers";
import type { Database } from "@/integrations/supabase/types";

type DiagnosticoInsert = Database["public"]["Tables"]["diagnosticos"]["Insert"];
type DiagnosticoUpdate = Database["public"]["Tables"]["diagnosticos"]["Update"];

/**
 * Hook para obtener un diagnóstico por ID
 */
export const useDiagnostico = (id: number | string | undefined) => {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  return useQuery({
    queryKey: ["diagnostico", numericId],
    queryFn: () => diagnosticoService.getById(numericId!),
    enabled: !!numericId && !isNaN(numericId),
  });
};

/**
 * Hook para obtener el diagnóstico de un incidente
 */
export const useDiagnosticoByIncidente = (incidenteId: number | string | undefined) => {
  const numericId = typeof incidenteId === 'string' ? parseInt(incidenteId, 10) : incidenteId;
  return useQuery({
    queryKey: ["diagnostico", "incidente", numericId],
    queryFn: () => diagnosticoService.getByIncidenteId(numericId!),
    enabled: !!numericId && !isNaN(numericId),
  });
};

/**
 * Hook para listar diagnósticos de un técnico
 */
export const useDiagnosticosByTecnico = (tecnicoCodigo: string | undefined) => {
  return useQuery({
    queryKey: ["diagnosticos", "tecnico", tecnicoCodigo],
    queryFn: () => diagnosticoService.listByTecnico(tecnicoCodigo!),
    enabled: !!tecnicoCodigo,
  });
};

/**
 * Hook para listar diagnósticos pendientes de digitación
 */
export const useDiagnosticosPendientes = () => {
  return useQuery({
    queryKey: ["diagnosticos", "pendientes"],
    queryFn: () => diagnosticoService.listPendientesDigitacion(),
  });
};

/**
 * Hook para crear un diagnóstico
 */
export const useCreateDiagnostico = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (diagnostico: DiagnosticoInsert) => 
      diagnosticoService.create(diagnostico),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["diagnosticos"] });
      queryClient.invalidateQueries({ 
        queryKey: ["diagnostico", "incidente", data.incidente_id] 
      });
      showSuccess("Diagnóstico creado correctamente");
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });
};

/**
 * Hook para actualizar un diagnóstico
 */
export const useUpdateDiagnostico = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      id, 
      updates 
    }: { 
      id: number; 
      updates: DiagnosticoUpdate;
    }) => diagnosticoService.update(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["diagnosticos"] });
      queryClient.invalidateQueries({ queryKey: ["diagnostico", data.id] });
      queryClient.invalidateQueries({ 
        queryKey: ["diagnostico", "incidente", data.incidente_id] 
      });
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });
};

/**
 * Hook para finalizar un diagnóstico
 */
export const useFinalizarDiagnostico = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => diagnosticoService.finalizarDiagnostico(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["diagnosticos"] });
      queryClient.invalidateQueries({ queryKey: ["diagnostico", data.id] });
      showSuccess("Diagnóstico finalizado correctamente");
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });
};

/**
 * Hook para asignar digitador a un diagnóstico
 */
export const useAsignarDigitador = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      id, 
      digitadorId, 
      digitadorCodigo 
    }: { 
      id: number; 
      digitadorId: number; 
      digitadorCodigo: string;
    }) => diagnosticoService.asignarDigitador(id, digitadorId, digitadorCodigo),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["diagnosticos"] });
      queryClient.invalidateQueries({ queryKey: ["diagnostico", data.id] });
      showSuccess("Digitador asignado correctamente");
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });
};

/**
 * Hook para agregar fotos a un diagnóstico
 */
export const useAddFotosDiagnostico = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      id, 
      fotosUrls 
    }: { 
      id: number; 
      fotosUrls: string[];
    }) => diagnosticoService.addFotos(id, fotosUrls),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["diagnostico", data.id] });
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });
};
