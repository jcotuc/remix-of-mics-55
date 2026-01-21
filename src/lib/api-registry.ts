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
  // Familias Producto
  FamiliaProductoListInput,
  FamiliaProductoListOutput,
  // Centros de Servicio
  CentroDeServicioListInput,
  CentroDeServicioListOutput,
  // Grupos Cola FIFO
  GrupoColaFifoListInput,
  GrupoColaFifoListOutput,
  GrupoColaFifoGetInput,
  GrupoColaFifoGetOutput,
  GrupoColaFifoCreateInput,
  GrupoColaFifoCreateOutput,
  GrupoColaFifoUpdateInput,
  GrupoColaFifoUpdateOutput,
  GrupoColaFifoDeleteInput,
  GrupoColaFifoDeleteOutput,
  // Grupos Cola FIFO Familias
  GrupoColaFifoFamiliaListInput,
  GrupoColaFifoFamiliaListOutput,
  GrupoColaFifoFamiliaGetInput,
  GrupoColaFifoFamiliaGetOutput,
  GrupoColaFifoFamiliaCreateInput,
  GrupoColaFifoFamiliaCreateOutput,
  GrupoColaFifoFamiliaUpdateInput,
  GrupoColaFifoFamiliaUpdateOutput,
  GrupoColaFifoFamiliaDeleteInput,
  GrupoColaFifoFamiliaDeleteOutput,
  // Inventarios
  InventarioListInput,
  InventarioListOutput,
  InventarioGetInput,
  InventarioGetOutput,
  InventarioCreateInput,
  InventarioCreateOutput,
  InventarioUpdateInput,
  InventarioUpdateOutput,
  InventarioDeleteInput,
  InventarioDeleteOutput,
  // Movimientos Inventario
  MovimientoInventarioListInput,
  MovimientoInventarioListOutput,
  MovimientoInventarioGetInput,
  MovimientoInventarioGetOutput,
  MovimientoInventarioCreateInput,
  MovimientoInventarioCreateOutput,
  // Solicitudes Repuestos
  SolicitudRepuestoListInput,
  SolicitudRepuestoListOutput,
  SolicitudRepuestoGetInput,
  SolicitudRepuestoGetOutput,
  SolicitudRepuestoCreateInput,
  SolicitudRepuestoCreateOutput,
  SolicitudRepuestoUpdateInput,
  SolicitudRepuestoUpdateOutput,
  SolicitudRepuestoDeleteInput,
  SolicitudRepuestoDeleteOutput,
  // Pedidos Bodega Central
  PedidoBodegaCentralListInput,
  PedidoBodegaCentralListOutput,
  PedidoBodegaCentralGetInput,
  PedidoBodegaCentralGetOutput,
  PedidoBodegaCentralCreateInput,
  PedidoBodegaCentralCreateOutput,
  PedidoBodegaCentralUpdateInput,
  PedidoBodegaCentralUpdateOutput,
  PedidoBodegaCentralDeleteInput,
  PedidoBodegaCentralDeleteOutput,
  // Embarques
  EmbarqueListInput,
  EmbarqueListOutput,
  EmbarqueGetInput,
  EmbarqueGetOutput,
  EmbarqueCreateInput,
  EmbarqueCreateOutput,
  EmbarqueUpdateInput,
  EmbarqueUpdateOutput,
  EmbarqueDeleteInput,
  EmbarqueDeleteOutput,
  // Importaciones
  ImportacionListInput,
  ImportacionListOutput,
  ImportacionGetInput,
  ImportacionGetOutput,
  ImportacionCreateInput,
  ImportacionCreateOutput,
  ImportacionUpdateInput,
  ImportacionUpdateOutput,
  ImportacionDeleteInput,
  ImportacionDeleteOutput,
  // Ubicaciones
  UbicacionListInput,
  UbicacionListOutput,
  UbicacionGetInput,
  UbicacionGetOutput,
  UbicacionCreateInput,
  UbicacionCreateOutput,
  UbicacionUpdateInput,
  UbicacionUpdateOutput,
  UbicacionDeleteInput,
  UbicacionDeleteOutput,
  // Transitos Bodega
  TransitoBodegaListInput,
  TransitoBodegaListOutput,
  TransitoBodegaGetInput,
  TransitoBodegaGetOutput,
  TransitoBodegaCreateInput,
  TransitoBodegaCreateOutput,
  TransitoBodegaUpdateInput,
  TransitoBodegaUpdateOutput,
  TransitoBodegaDeleteInput,
  TransitoBodegaDeleteOutput,
  // Usuarios
  UsuarioListInput,
  UsuarioListOutput,
  // Roles
  RolListInput,
  RolListOutput,
  // Fallas (solo list)
  FallaListInput,
  FallaListOutput,
  // Causas (solo list)
  CausaListInput,
  CausaListOutput,
  // Accesorios
  AccesorioListInput,
  AccesorioListOutput,
  AccesorioCreateInput,
  AccesorioCreateOutput,
  // Guias (solo list)
  GuiaListInput,
  GuiaListOutput,
  // Presupuestos
  PresupuestoListInput,
  PresupuestoListOutput,
  PresupuestoGetInput,
  PresupuestoGetOutput,
  PresupuestoCreateInput,
  PresupuestoCreateOutput,
  PresupuestoUpdateInput,
  PresupuestoUpdateOutput,
  PresupuestoDeleteInput,
  PresupuestoDeleteOutput,
} from "@/generated/actions.d";

export interface ActionRegistry {
  // =============================================================================
  // CLIENTES
  // =============================================================================
  "clientes.list": { input: ClienteListInput; output: ClienteListOutput };
  "clientes.get": { input: ClienteGetInput; output: ClienteGetOutput };
  "clientes.create": { input: ClienteCreateInput; output: ClienteCreateOutput };
  "clientes.update": { input: ClienteUpdateInput; output: ClienteUpdateOutput };
  "clientes.delete": { input: ClienteDeleteInput; output: ClienteDeleteOutput };
  "clientes.search": { input: ClienteSearchInput; output: ClienteSearchOutput };

  // =============================================================================
  // PRODUCTOS
  // =============================================================================
  "productos.list": { input: ProductoListInput; output: ProductoListOutput };
  "productos.get": { input: ProductoGetInput; output: ProductoGetOutput };
  "productos.create": { input: ProductoCreateInput; output: ProductoCreateOutput };
  "productos.update": { input: ProductoUpdateInput; output: ProductoUpdateOutput };
  "productos.delete": { input: ProductoDeleteInput; output: ProductoDeleteOutput };
  "productos.search": { input: ProductoSearchInput; output: ProductoSearchOutput };

  // =============================================================================
  // INCIDENTES
  // =============================================================================
  "incidentes.list": { input: IncidenteListInput; output: IncidenteListOutput };
  "incidentes.get": { input: IncidenteGetInput; output: IncidenteGetOutput };
  "incidentes.create": { input: IncidenteCreateInput; output: IncidenteCreateOutput };
  "incidentes.update": { input: IncidenteUpdateInput; output: IncidenteUpdateOutput };
  "incidentes.delete": { input: IncidenteDeleteInput; output: IncidenteDeleteOutput };
  "incidentes.search": { input: IncidenteSearchInput; output: IncidenteSearchOutput };

  // =============================================================================
  // DIAGNOSTICOS
  // =============================================================================
  "diagnosticos.list": { input: DiagnosticoListInput; output: DiagnosticoListOutput };
  "diagnosticos.get": { input: DiagnosticoGetInput; output: DiagnosticoGetOutput };
  "diagnosticos.create": { input: DiagnosticoCreateInput; output: DiagnosticoCreateOutput };
  "diagnosticos.update": { input: DiagnosticoUpdateInput; output: DiagnosticoUpdateOutput };
  "diagnosticos.delete": { input: DiagnosticoDeleteInput; output: DiagnosticoDeleteOutput };
  "diagnosticos.search": { input: DiagnosticoSearchInput; output: DiagnosticoSearchOutput };

  // =============================================================================
  // REPUESTOS
  // =============================================================================
  "repuestos.list": { input: RepuestoListInput; output: RepuestoListOutput };
  "repuestos.get": { input: RepuestoGetInput; output: RepuestoGetOutput };
  "repuestos.create": { input: RepuestoCreateInput; output: RepuestoCreateOutput };
  "repuestos.update": { input: RepuestoUpdateInput; output: RepuestoUpdateOutput };
  "repuestos.delete": { input: RepuestoDeleteInput; output: RepuestoDeleteOutput };
  "repuestos.search": { input: RepuestoSearchInput; output: RepuestoSearchOutput };

  // =============================================================================
  // BODEGAS
  // =============================================================================
  "bodegas.list": { input: BodegaListInput; output: BodegaListOutput };
  "bodegas.get": { input: BodegaGetInput; output: BodegaGetOutput };
  "bodegas.create": { input: BodegaCreateInput; output: BodegaCreateOutput };
  "bodegas.update": { input: BodegaUpdateInput; output: BodegaUpdateOutput };
  "bodegas.delete": { input: BodegaDeleteInput; output: BodegaDeleteOutput };

  // =============================================================================
  // FAMILIAS PRODUCTO
  // =============================================================================
  "familias_producto.list": { input: FamiliaProductoListInput; output: FamiliaProductoListOutput };

  // =============================================================================
  // CENTROS DE SERVICIO
  // =============================================================================
  "centros_de_servicio.list": { input: CentroDeServicioListInput; output: CentroDeServicioListOutput };

  // =============================================================================
  // GRUPOS COLA FIFO
  // =============================================================================
  "grupos_cola_fifo.list": { input: GrupoColaFifoListInput; output: GrupoColaFifoListOutput };
  "grupos_cola_fifo.get": { input: GrupoColaFifoGetInput; output: GrupoColaFifoGetOutput };
  "grupos_cola_fifo.create": { input: GrupoColaFifoCreateInput; output: GrupoColaFifoCreateOutput };
  "grupos_cola_fifo.update": { input: GrupoColaFifoUpdateInput; output: GrupoColaFifoUpdateOutput };
  "grupos_cola_fifo.delete": { input: GrupoColaFifoDeleteInput; output: GrupoColaFifoDeleteOutput };

  // =============================================================================
  // GRUPOS COLA FIFO FAMILIAS
  // =============================================================================
  "grupos_cola_fifo_familias.list": { input: GrupoColaFifoFamiliaListInput; output: GrupoColaFifoFamiliaListOutput };
  "grupos_cola_fifo_familias.get": { input: GrupoColaFifoFamiliaGetInput; output: GrupoColaFifoFamiliaGetOutput };
  "grupos_cola_fifo_familias.create": { input: GrupoColaFifoFamiliaCreateInput; output: GrupoColaFifoFamiliaCreateOutput };
  "grupos_cola_fifo_familias.update": { input: GrupoColaFifoFamiliaUpdateInput; output: GrupoColaFifoFamiliaUpdateOutput };
  "grupos_cola_fifo_familias.delete": { input: GrupoColaFifoFamiliaDeleteInput; output: GrupoColaFifoFamiliaDeleteOutput };

  // =============================================================================
  // INVENTARIOS
  // =============================================================================
  "inventarios.list": { input: InventarioListInput; output: InventarioListOutput };
  "inventarios.get": { input: InventarioGetInput; output: InventarioGetOutput };
  "inventarios.create": { input: InventarioCreateInput; output: InventarioCreateOutput };
  "inventarios.update": { input: InventarioUpdateInput; output: InventarioUpdateOutput };
  "inventarios.delete": { input: InventarioDeleteInput; output: InventarioDeleteOutput };

  // =============================================================================
  // MOVIMIENTOS INVENTARIO
  // =============================================================================
  "movimientos_inventario.list": { input: MovimientoInventarioListInput; output: MovimientoInventarioListOutput };
  "movimientos_inventario.get": { input: MovimientoInventarioGetInput; output: MovimientoInventarioGetOutput };
  "movimientos_inventario.create": { input: MovimientoInventarioCreateInput; output: MovimientoInventarioCreateOutput };

  // =============================================================================
  // SOLICITUDES REPUESTOS
  // =============================================================================
  "solicitudes_repuestos.list": { input: SolicitudRepuestoListInput; output: SolicitudRepuestoListOutput };
  "solicitudes_repuestos.get": { input: SolicitudRepuestoGetInput; output: SolicitudRepuestoGetOutput };
  "solicitudes_repuestos.create": { input: SolicitudRepuestoCreateInput; output: SolicitudRepuestoCreateOutput };
  "solicitudes_repuestos.update": { input: SolicitudRepuestoUpdateInput; output: SolicitudRepuestoUpdateOutput };
  "solicitudes_repuestos.delete": { input: SolicitudRepuestoDeleteInput; output: SolicitudRepuestoDeleteOutput };

  // =============================================================================
  // PEDIDOS BODEGA CENTRAL
  // =============================================================================
  "pedidos_bodega_central.list": { input: PedidoBodegaCentralListInput; output: PedidoBodegaCentralListOutput };
  "pedidos_bodega_central.get": { input: PedidoBodegaCentralGetInput; output: PedidoBodegaCentralGetOutput };
  "pedidos_bodega_central.create": { input: PedidoBodegaCentralCreateInput; output: PedidoBodegaCentralCreateOutput };
  "pedidos_bodega_central.update": { input: PedidoBodegaCentralUpdateInput; output: PedidoBodegaCentralUpdateOutput };
  "pedidos_bodega_central.delete": { input: PedidoBodegaCentralDeleteInput; output: PedidoBodegaCentralDeleteOutput };

  // =============================================================================
  // EMBARQUES
  // =============================================================================
  "embarques.list": { input: EmbarqueListInput; output: EmbarqueListOutput };
  "embarques.get": { input: EmbarqueGetInput; output: EmbarqueGetOutput };
  "embarques.create": { input: EmbarqueCreateInput; output: EmbarqueCreateOutput };
  "embarques.update": { input: EmbarqueUpdateInput; output: EmbarqueUpdateOutput };
  "embarques.delete": { input: EmbarqueDeleteInput; output: EmbarqueDeleteOutput };

  // =============================================================================
  // IMPORTACIONES
  // =============================================================================
  "importaciones.list": { input: ImportacionListInput; output: ImportacionListOutput };
  "importaciones.get": { input: ImportacionGetInput; output: ImportacionGetOutput };
  "importaciones.create": { input: ImportacionCreateInput; output: ImportacionCreateOutput };
  "importaciones.update": { input: ImportacionUpdateInput; output: ImportacionUpdateOutput };
  "importaciones.delete": { input: ImportacionDeleteInput; output: ImportacionDeleteOutput };

  // =============================================================================
  // UBICACIONES
  // =============================================================================
  "ubicaciones.list": { input: UbicacionListInput; output: UbicacionListOutput };
  "ubicaciones.get": { input: UbicacionGetInput; output: UbicacionGetOutput };
  "ubicaciones.create": { input: UbicacionCreateInput; output: UbicacionCreateOutput };
  "ubicaciones.update": { input: UbicacionUpdateInput; output: UbicacionUpdateOutput };
  "ubicaciones.delete": { input: UbicacionDeleteInput; output: UbicacionDeleteOutput };

  // =============================================================================
  // TRANSITOS BODEGA
  // =============================================================================
  "transitos_bodega.list": { input: TransitoBodegaListInput; output: TransitoBodegaListOutput };
  "transitos_bodega.get": { input: TransitoBodegaGetInput; output: TransitoBodegaGetOutput };
  "transitos_bodega.create": { input: TransitoBodegaCreateInput; output: TransitoBodegaCreateOutput };
  "transitos_bodega.update": { input: TransitoBodegaUpdateInput; output: TransitoBodegaUpdateOutput };
  "transitos_bodega.delete": { input: TransitoBodegaDeleteInput; output: TransitoBodegaDeleteOutput };

  // =============================================================================
  // USUARIOS
  // =============================================================================
  "usuarios.list": { input: UsuarioListInput; output: UsuarioListOutput };

  // =============================================================================
  // ROLES
  // =============================================================================
  "roles.list": { input: RolListInput; output: RolListOutput };

  // =============================================================================
  // FALLAS
  // =============================================================================
  "fallas.list": { input: FallaListInput; output: FallaListOutput };

  // =============================================================================
  // CAUSAS
  // =============================================================================
  "causas.list": { input: CausaListInput; output: CausaListOutput };

  // =============================================================================
  // ACCESORIOS
  // =============================================================================
  "accesorios.list": { input: AccesorioListInput; output: AccesorioListOutput };
  "accesorios.create": { input: AccesorioCreateInput; output: AccesorioCreateOutput };

  // =============================================================================
  // GUIAS
  // =============================================================================
  "guias.list": { input: GuiaListInput; output: GuiaListOutput };

  // =============================================================================
  // PRESUPUESTOS
  // =============================================================================
  "presupuestos.list": { input: PresupuestoListInput; output: PresupuestoListOutput };
  "presupuestos.get": { input: PresupuestoGetInput; output: PresupuestoGetOutput };
  "presupuestos.create": { input: PresupuestoCreateInput; output: PresupuestoCreateOutput };
  "presupuestos.update": { input: PresupuestoUpdateInput; output: PresupuestoUpdateOutput };
  "presupuestos.delete": { input: PresupuestoDeleteInput; output: PresupuestoDeleteOutput };
}

export type ActionName = keyof ActionRegistry;
