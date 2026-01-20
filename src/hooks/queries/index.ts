/**
 * Índice de hooks de React Query
 * Exporta todos los hooks reutilizables para queries y mutaciones
 */

// Incidentes
export {
  useIncidente,
  useIncidenteConRelaciones,
  useIncidenteByCodigo,
  useIncidentes,
  useIncidentesByCliente,
  useIncidentesByTecnico,
  useIncidentesCount,
  useIncidentesEstadisticas,
  useUpdateIncidenteStatus,
  useUpdateIncidente,
  useAsignarTecnico,
  useAddLogEntry,
} from "./useIncidente";

// Diagnósticos
export {
  useDiagnostico,
  useDiagnosticoByIncidente,
  useDiagnosticosByTecnico,
  useDiagnosticosPendientes,
  useCreateDiagnostico,
  useUpdateDiagnostico,
  useFinalizarDiagnostico,
  useAsignarDigitador,
  useAddFotosDiagnostico,
} from "./useDiagnostico";

// Clientes
export {
  useCliente,
  useClienteByCodigo,
  useClienteByNit,
  useClientes,
  useSearchClientes,
  useDireccionesCliente,
  useClientesCount,
  useCreateCliente,
  useUpdateCliente,
  useGenerarCodigoCliente,
  useVerificarNit,
} from "./useCliente";

// Solicitudes de repuestos
export {
  useSolicitud,
  useSolicitudesByIncidente,
  useSolicitudes,
  useSolicitudesPendientes,
  useSolicitudesPendientesCount,
  useSolicitudesEstadisticas,
  useCreateSolicitud,
  useCreateManySolicitudes,
  useUpdateSolicitud,
  useDespacharSolicitud,
  useCancelarSolicitud,
} from "./useSolicitud";
