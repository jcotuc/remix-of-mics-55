import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clienteService, ClienteFilters } from "@/services/clienteService";
import { showError, showSuccess } from "@/utils/toastHelpers";
import type { Database } from "@/integrations/supabase/types";

type ClienteInsert = Database["public"]["Tables"]["clientes"]["Insert"];
type ClienteUpdate = Database["public"]["Tables"]["clientes"]["Update"];

/**
 * Hook para obtener un cliente por ID
 */
export const useCliente = (id: number | string | undefined) => {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  return useQuery({
    queryKey: ["cliente", numericId],
    queryFn: () => clienteService.getById(numericId!),
    enabled: !!numericId && !isNaN(numericId),
  });
};

/**
 * Hook para obtener un cliente por código
 */
export const useClienteByCodigo = (codigo: string | undefined) => {
  return useQuery({
    queryKey: ["cliente", "codigo", codigo],
    queryFn: () => clienteService.getByCodigo(codigo!),
    enabled: !!codigo,
  });
};

/**
 * Hook para obtener un cliente por NIT
 */
export const useClienteByNit = (nit: string | undefined) => {
  return useQuery({
    queryKey: ["cliente", "nit", nit],
    queryFn: () => clienteService.getByNit(nit!),
    enabled: !!nit,
  });
};

/**
 * Hook para listar clientes con filtros
 */
export const useClientes = (filters?: ClienteFilters) => {
  return useQuery({
    queryKey: ["clientes", filters],
    queryFn: () => clienteService.list(filters),
  });
};

/**
 * Hook para buscar clientes
 */
export const useSearchClientes = (term: string, limit: number = 10) => {
  return useQuery({
    queryKey: ["clientes", "search", term, limit],
    queryFn: () => clienteService.search(term, limit),
    enabled: term.length >= 2, // Solo buscar si hay al menos 2 caracteres
  });
};

/**
 * Hook para obtener direcciones de envío de un cliente
 */
export const useDireccionesCliente = (codigoCliente: string | undefined) => {
  return useQuery({
    queryKey: ["cliente", "direcciones", codigoCliente],
    queryFn: () => clienteService.getDirecciones(codigoCliente!),
    enabled: !!codigoCliente,
  });
};

/**
 * Hook para contar clientes
 */
export const useClientesCount = (filters?: ClienteFilters) => {
  return useQuery({
    queryKey: ["clientes", "count", filters],
    queryFn: () => clienteService.count(filters),
  });
};

/**
 * Hook para crear un cliente
 */
export const useCreateCliente = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cliente: ClienteInsert) => clienteService.create(cliente),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      showSuccess("Cliente creado correctamente");
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });
};

/**
 * Hook para actualizar un cliente
 */
export const useUpdateCliente = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      id, 
      updates 
    }: { 
      id: number; 
      updates: ClienteUpdate;
    }) => clienteService.update(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      queryClient.invalidateQueries({ queryKey: ["cliente", data.id] });
      showSuccess("Cliente actualizado correctamente");
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });
};

/**
 * Hook para generar código de cliente
 */
export const useGenerarCodigoCliente = () => {
  return useMutation({
    mutationFn: () => clienteService.generarCodigo(),
    onError: (error: Error) => {
      showError(error.message);
    },
  });
};

/**
 * Hook para verificar si un NIT existe
 */
export const useVerificarNit = () => {
  return useMutation({
    mutationFn: ({ 
      nit, 
      excludeId 
    }: { 
      nit: string; 
      excludeId?: number;
    }) => clienteService.existeNit(nit, excludeId),
  });
};
