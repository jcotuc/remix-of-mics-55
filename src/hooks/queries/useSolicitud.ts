/**
 * Placeholder hooks for solicitudes de repuestos
 * Table 'solicitudes_repuestos' does not exist in the database
 */

// Stub placeholder hooks - table doesn't exist
export const useSolicitud = () => ({ data: null, isLoading: false, error: null });
export const useSolicitudesByIncidente = () => ({ data: [], isLoading: false, error: null });
export const useSolicitudes = () => ({ data: [], isLoading: false, error: null });
export const useSolicitudesPendientes = () => ({ data: [], isLoading: false, error: null });
export const useSolicitudesPendientesCount = () => ({ data: 0, isLoading: false, error: null });
export const useSolicitudesEstadisticas = () => ({ data: null, isLoading: false, error: null });
export const useCreateSolicitud = () => ({ mutateAsync: async () => {}, isLoading: false });
export const useCreateManySolicitudes = () => ({ mutateAsync: async () => {}, isLoading: false });
export const useUpdateSolicitud = () => ({ mutateAsync: async () => {}, isLoading: false });
export const useDespacharSolicitud = () => ({ mutateAsync: async () => {}, isLoading: false });
export const useCancelarSolicitud = () => ({ mutateAsync: async () => {}, isLoading: false });
