// API Registry
// Type registry mapping action names to input/output types
// Uses auto-generated types from src/generated/actions.d.ts

import type {
  // Clientes
  ClienteListInput,
  ClienteListOutput,
  ClienteGetInput,
  ClienteGetOutput,
  ClienteCreateInput,
  ClienteCreateOutput,
  ClienteUpdateInput,
  ClienteUpdateOutput,
  ClienteDeleteInput,
  ClienteDeleteOutput,
  ClienteSearchInput,
  ClienteSearchOutput,
  // Productos
  ProductoListInput,
  ProductoListOutput,
  ProductoGetInput,
  ProductoGetOutput,
  ProductoCreateInput,
  ProductoCreateOutput,
  ProductoUpdateInput,
  ProductoUpdateOutput,
  ProductoDeleteInput,
  ProductoDeleteOutput,
  ProductoSearchInput,
  ProductoSearchOutput,
  // Incidentes
  IncidenteListInput,
  IncidenteListOutput,
  IncidenteGetInput,
  IncidenteGetOutput,
  IncidenteCreateInput,
  IncidenteCreateOutput,
  IncidenteUpdateInput,
  IncidenteUpdateOutput,
  IncidenteDeleteInput,
  IncidenteDeleteOutput,
  IncidenteSearchInput,
  IncidenteSearchOutput,
  // Diagnosticos
  DiagnosticoListInput,
  DiagnosticoListOutput,
  DiagnosticoGetInput,
  DiagnosticoGetOutput,
  DiagnosticoCreateInput,
  DiagnosticoCreateOutput,
  DiagnosticoUpdateInput,
  DiagnosticoUpdateOutput,
  DiagnosticoDeleteInput,
  DiagnosticoDeleteOutput,
  DiagnosticoSearchInput,
  DiagnosticoSearchOutput,
  // Repuestos
  RepuestoListInput,
  RepuestoListOutput,
  RepuestoGetInput,
  RepuestoGetOutput,
  RepuestoCreateInput,
  RepuestoCreateOutput,
  RepuestoUpdateInput,
  RepuestoUpdateOutput,
  RepuestoDeleteInput,
  RepuestoDeleteOutput,
  RepuestoSearchInput,
  RepuestoSearchOutput,
  // Bodegas
  BodegaListInput,
  BodegaListOutput,
  BodegaGetInput,
  BodegaGetOutput,
  BodegaCreateInput,
  BodegaCreateOutput,
  BodegaUpdateInput,
  BodegaUpdateOutput,
  BodegaDeleteInput,
  BodegaDeleteOutput,
} from "@/generated/actions.d";

export interface ActionRegistry {
  // Clientes
  "clientes.list": { input: ClienteListInput; output: ClienteListOutput };
  "clientes.get": { input: ClienteGetInput; output: ClienteGetOutput };
  "clientes.create": { input: ClienteCreateInput; output: ClienteCreateOutput };
  "clientes.update": { input: ClienteUpdateInput; output: ClienteUpdateOutput };
  "clientes.delete": { input: ClienteDeleteInput; output: ClienteDeleteOutput };
  "clientes.search": { input: ClienteSearchInput; output: ClienteSearchOutput };
  // Productos
  "productos.list": { input: ProductoListInput; output: ProductoListOutput };
  "productos.get": { input: ProductoGetInput; output: ProductoGetOutput };
  "productos.create": { input: ProductoCreateInput; output: ProductoCreateOutput };
  "productos.update": { input: ProductoUpdateInput; output: ProductoUpdateOutput };
  "productos.delete": { input: ProductoDeleteInput; output: ProductoDeleteOutput };
  "productos.search": { input: ProductoSearchInput; output: ProductoSearchOutput };
  // Incidentes
  "incidentes.list": { input: IncidenteListInput; output: IncidenteListOutput };
  "incidentes.get": { input: IncidenteGetInput; output: IncidenteGetOutput };
  "incidentes.create": { input: IncidenteCreateInput; output: IncidenteCreateOutput };
  "incidentes.update": { input: IncidenteUpdateInput; output: IncidenteUpdateOutput };
  "incidentes.delete": { input: IncidenteDeleteInput; output: IncidenteDeleteOutput };
  "incidentes.search": { input: IncidenteSearchInput; output: IncidenteSearchOutput };
  // Diagnosticos
  "diagnosticos.list": { input: DiagnosticoListInput; output: DiagnosticoListOutput };
  "diagnosticos.get": { input: DiagnosticoGetInput; output: DiagnosticoGetOutput };
  "diagnosticos.create": { input: DiagnosticoCreateInput; output: DiagnosticoCreateOutput };
  "diagnosticos.update": { input: DiagnosticoUpdateInput; output: DiagnosticoUpdateOutput };
  "diagnosticos.delete": { input: DiagnosticoDeleteInput; output: DiagnosticoDeleteOutput };
  "diagnosticos.search": { input: DiagnosticoSearchInput; output: DiagnosticoSearchOutput };
  // Repuestos
  "repuestos.list": { input: RepuestoListInput; output: RepuestoListOutput };
  "repuestos.get": { input: RepuestoGetInput; output: RepuestoGetOutput };
  "repuestos.create": { input: RepuestoCreateInput; output: RepuestoCreateOutput };
  "repuestos.update": { input: RepuestoUpdateInput; output: RepuestoUpdateOutput };
  "repuestos.delete": { input: RepuestoDeleteInput; output: RepuestoDeleteOutput };
  "repuestos.search": { input: RepuestoSearchInput; output: RepuestoSearchOutput };
  // Bodegas
  "bodegas.list": { input: BodegaListInput; output: BodegaListOutput };
  "bodegas.get": { input: BodegaGetInput; output: BodegaGetOutput };
  "bodegas.create": { input: BodegaCreateInput; output: BodegaCreateOutput };
  "bodegas.update": { input: BodegaUpdateInput; output: BodegaUpdateOutput };
  "bodegas.delete": { input: BodegaDeleteInput; output: BodegaDeleteOutput };
}

export type ActionName = keyof ActionRegistry;
