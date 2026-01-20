// API client
// API Backend - Clean typed interface for backend actions
export { apiBackendAction } from "./api-backend";
export type { ActionRegistry, ActionName } from "./api-registry";

// Re-export commonly used types from generated actions
export type {
  // Clientes
  ClienteSchema,
  ClienteListInput,
  ClienteListOutput,
  ClienteGetInput,
  ClienteGetOutput,
  ClienteCreateInput,
  ClienteCreateOutput,
  ClienteUpdateInput,
  ClienteUpdateOutput,
  ClienteSearchInput,
  ClienteSearchOutput,
  ClienteSearchResultItem,
  // Incidentes
  IncidenteSchema,
  IncidenteListInput,
  IncidenteListOutput,
  IncidenteGetInput,
  IncidenteGetOutput,
  IncidenteSearchInput,
  IncidenteSearchOutput,
  IncidenteSearchResultItem,
  EstadoIncidente,
  ProductoSchema,
} from "@/generated/actions.d";
