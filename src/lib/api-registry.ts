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

  // =============================================================================
  // MOSTRADOR MODULE - NEW ACTIONS
  // =============================================================================
  // Cotizaciones
  "cotizaciones.create": { input: Record<string, unknown>; output: unknown };
  "cotizaciones.list": { input: { skip?: number; limit?: number }; output: { results: unknown[] } };

  // Notificaciones Cliente
  "notificaciones_cliente.list": { input: { incidente_id?: number }; output: { results: unknown[] } };
  "notificaciones_cliente.create": { input: Record<string, unknown> | Record<string, unknown>[]; output: { results: unknown[] } };

  // Incidente Fotos
  "incidente_fotos.list": { input: { incidente_id?: number }; output: { results: unknown[] } };
  "incidente_fotos.create": { input: Record<string, unknown> | Record<string, unknown>[]; output: { results: unknown[] } };

  // Incidente Tecnico
  "incidente_tecnico.list": { input: { incidente_id?: number; es_principal?: boolean; tecnico_id?: number }; output: { results: unknown[] } };

  // Usuarios - get single
  "usuarios.get": { input: { id: number }; output: { result: unknown | null } };

  // Centros de Servicio - get single
  "centros_de_servicio.get": { input: { id: number }; output: { result: unknown | null } };

  // Direcciones Envio
  "direcciones_envio.list": { input: { cliente_id?: number }; output: { results: unknown[] } };
  "direcciones_envio.get": { input: { id: number }; output: { result: unknown | null } };

  // Guias - search with filters
  "guias.search": { input: { incidente_codigo?: string; estado?: string; limit?: number }; output: { results: unknown[] } };

  // Clientes - get by codigo
  "clientes.getByCodigo": { input: { codigo: string }; output: { result: unknown | null } };

  // Productos - get by codigo
  "productos.getByCodigo": { input: { codigo: string }; output: { result: unknown | null } };

  // Solicitudes Repuestos - search
  "solicitudes_repuestos.search": { input: { incidente_id?: number; estado?: string; limit?: number }; output: { results: unknown[] } };

  // Inventarios - search by codigos
  "inventarios.search": { input: { codigos_repuesto?: string[]; centro_servicio_id?: number }; output: { results: unknown[] } };

  // =============================================================================
  // AUDITORIAS CALIDAD
  // =============================================================================
  "auditorias_calidad.list": { input: { skip?: number; limit?: number }; output: { results: unknown[] } };
  "auditorias_calidad.get": { input: { id: number }; output: { result: unknown | null } };
  "auditorias_calidad.create": { input: Record<string, unknown>; output: unknown };
  "auditorias_calidad.update": { input: { id: number; data: Record<string, unknown> }; output: unknown };
  "auditorias_calidad.delete": { input: { id: number }; output: { status: string; id: number } };

  // =============================================================================
  // DEFECTOS CALIDAD
  // =============================================================================
  "defectos_calidad.list": { input: { skip?: number; limit?: number }; output: { results: unknown[] } };
  "defectos_calidad.get": { input: { id: number }; output: { result: unknown | null } };
  "defectos_calidad.create": { input: Record<string, unknown>; output: unknown };
  "defectos_calidad.update": { input: { id: number; data: Record<string, unknown> }; output: unknown };
  "defectos_calidad.delete": { input: { id: number }; output: { status: string; id: number } };

  // =============================================================================
  // GARANTIAS MANUALES
  // =============================================================================
  "garantias_manuales.list": { input: { skip?: number; limit?: number; created_by?: string }; output: { results: unknown[] } };
  "garantias_manuales.get": { input: { id: number }; output: { result: unknown | null } };
  "garantias_manuales.create": { input: Record<string, unknown>; output: unknown };
  "garantias_manuales.update": { input: { id: number; data: Record<string, unknown> }; output: unknown };
  "garantias_manuales.delete": { input: { id: number }; output: { status: string; id: number } };

  // =============================================================================
  // ASIGNACIONES SAC
  // =============================================================================
  "asignaciones_sac.list": { input: { user_id?: number; incidente_id?: number; activo?: boolean }; output: { results: unknown[] } };
  "asignaciones_sac.get": { input: { id: number }; output: { result: unknown | null } };
  "asignaciones_sac.create": { input: Record<string, unknown>; output: unknown };
  "asignaciones_sac.update": { input: { id: number; data: Record<string, unknown> }; output: unknown };
  "asignaciones_sac.delete": { input: { id: number }; output: { status: string; id: number } };

  // =============================================================================
  // NOTIFICACIONES (sistema interno)
  // =============================================================================
  "notificaciones.list": { input: { usuario_id?: number; leido?: boolean; tipo?: string }; output: { results: unknown[] } };
  "notificaciones.get": { input: { id: number }; output: { result: unknown | null } };
  "notificaciones.create": { input: Record<string, unknown>; output: unknown };
  "notificaciones.update": { input: { id: number; data: Record<string, unknown> }; output: unknown };
  "notificaciones.delete": { input: { id: number }; output: { status: string; id: number } };
  "notificaciones.markAsRead": { input: { id: number }; output: unknown };

  // =============================================================================
  // SOLICITUDES CAMBIO
  // =============================================================================
  "solicitudes_cambio.list": { input: { skip?: number; limit?: number; estado?: string }; output: { results: unknown[] } };
  "solicitudes_cambio.get": { input: { id: number }; output: { result: unknown | null } };
  "solicitudes_cambio.create": { input: Record<string, unknown>; output: unknown };
  "solicitudes_cambio.update": { input: { id: number; data: Record<string, unknown> }; output: unknown };
  "solicitudes_cambio.delete": { input: { id: number }; output: { status: string; id: number } };

  // =============================================================================
  // INCIDENTE TECNICO (CRUD completo)
  // =============================================================================
  "incidente_tecnico.get": { input: { id: number }; output: { result: unknown | null } };
  "incidente_tecnico.create": { input: Record<string, unknown>; output: unknown };
  "incidente_tecnico.update": { input: { id: number; data: Record<string, unknown> }; output: unknown };
  "incidente_tecnico.delete": { input: { id: number }; output: { status: string; id: number } };
  "incidente_tecnico.search": { input: { tecnico_id?: number; es_activo?: boolean }; output: { results: unknown[] } };

  // =============================================================================
  // DIAGNOSTICOS (CRUD completo - implementar handlers faltantes)
  // =============================================================================
  // diagnosticos.create, diagnosticos.update ya están en registry pero handlers notImplemented

  // =============================================================================
  // DIAGNOSTICO FALLAS / CAUSAS (asociaciones)
  // =============================================================================
  "diagnostico_fallas.list": { input: { diagnostico_id: number }; output: { results: unknown[] } };
  "diagnostico_fallas.create": { input: Record<string, unknown>; output: unknown };
  "diagnostico_fallas.delete": { input: { diagnostico_id: number; falla_id?: number }; output: { status: string } };
  "diagnostico_fallas.deleteByDiagnostico": { input: { diagnostico_id: number }; output: { status: string } };
  "diagnostico_fallas.createBatch": { input: Array<{ diagnostico_id: number; falla_id: number }>; output: unknown[] };

  "diagnostico_causas.list": { input: { diagnostico_id: number }; output: { results: unknown[] } };
  "diagnostico_causas.create": { input: Record<string, unknown>; output: unknown };
  "diagnostico_causas.delete": { input: { diagnostico_id: number; causa_id?: number }; output: { status: string } };
  "diagnostico_causas.deleteByDiagnostico": { input: { diagnostico_id: number }; output: { status: string } };
  "diagnostico_causas.createBatch": { input: Array<{ diagnostico_id: number; causa_id: number }>; output: unknown[] };

  // =============================================================================
  // USUARIOS (extended)
  // =============================================================================
  "usuarios.search": { input: { search?: string; rol?: string; auth_uid?: string }; output: { results: unknown[] } };
  "usuarios.getByAuthUid": { input: { auth_uid: string }; output: { result: unknown | null } };

  // =============================================================================
  // TRANSITOS BODEGA (extended)
  // =============================================================================
  "transitos_bodega.search": { input: { estado?: string; bodega_origen_id?: number; bodega_destino_id?: number }; output: { results: unknown[] } };

  // =============================================================================
  // CENTROS SUPERVISOR
  // =============================================================================
  "centros_supervisor.list": { input: { supervisor_id?: number }; output: { results: unknown[] } };
  "centros_supervisor.create": { input: Record<string, unknown>; output: unknown };
  "centros_supervisor.delete": { input: { id?: number; supervisor_id?: number }; output: { status: string } };

  // =============================================================================
  // SOLICITUDES TRANSFERENCIA MAQUINAS
  // =============================================================================
  "solicitudes_transferencia_maquinas.list": { input: { estado?: string; centro_origen_id?: number; centro_destino_id?: number }; output: { results: unknown[] } };
  "solicitudes_transferencia_maquinas.get": { input: { id: number }; output: { result: unknown | null } };
  "solicitudes_transferencia_maquinas.create": { input: Record<string, unknown>; output: unknown };
  "solicitudes_transferencia_maquinas.update": { input: { id: number; data: Record<string, unknown> }; output: unknown };

  // =============================================================================
  // USER ROLES
  // =============================================================================
  "user_roles.list": { input: { user_id?: number; role?: string }; output: { results: unknown[] } };

  // =============================================================================
  // REPUESTOS RELACIONES (padre/hijo relationships)
  // =============================================================================
  "repuestos_relaciones.list": { input: { limit?: number; offset?: number }; output: { results: unknown[] } };

  // =============================================================================
  // CONFIGURACION FIFO CENTRO (technician assignments)
  // =============================================================================
  "configuracion_fifo_centro.list": { input: { centro_servicio_id?: number; activo?: boolean }; output: { results: unknown[] } };
  "configuracion_fifo_centro.create": { input: Record<string, unknown>; output: unknown };
  "configuracion_fifo_centro.update": { input: { id: number; data: Record<string, unknown> }; output: unknown };
  "configuracion_fifo_centro.delete": { input: { id: number }; output: { status: string; id: number } };

  // =============================================================================
  // MEDIA (incident photos/videos)
  // =============================================================================
  "media.list": { input: { incidente_id?: number }; output: { results: unknown[] } };
  "media.create": { input: Record<string, unknown>; output: unknown };

  // =============================================================================
  // PEDIDOS BODEGA CENTRAL (extended operations)
  // =============================================================================
  "pedidos_bodega_central.search": { input: { incidente_id?: number; estado?: string }; output: { results: unknown[] } };

  // =============================================================================
  // INVENTARIO (general inventory queries)
  // =============================================================================
  "inventario.list": { input: { centro_servicio_id?: number }; output: { results: unknown[] } };

  // =============================================================================
  // CDS TABLES (Fallas, Causas, Familias from legacy CDS_* tables)
  // =============================================================================
  "cds_fallas.list": { input: Record<string, never>; output: { results: Array<{ id: number; nombre: string; familia_id: number | null }> } };
  "cds_causas.list": { input: Record<string, never>; output: { results: Array<{ id: number; nombre: string; familia_id: number | null }> } };
  "cds_familias.list": { input: Record<string, never>; output: { results: Array<{ id: number; Categoria: string | null; Padre: number | null }> } };

  // =============================================================================
  // REPUESTOS (extended)
  // =============================================================================
  "repuestos.listByProducto": { input: { codigo_producto: string }; output: { results: unknown[] } };

  // =============================================================================
  // INVENTARIOS (extended bulk query)
  // =============================================================================  
  "inventarios.listByCodigos": { input: { centro_servicio_id: number; codigos: string[] }; output: { results: Array<{ codigo_repuesto: string; cantidad: number; ubicacion_legacy: string }> } };

  // =============================================================================
  // PRODUCTOS (extended)
  // =============================================================================
  "productos.listAlternativos": { input: { exclude_familia_id?: number; descontinuado?: boolean }; output: { results: unknown[] } };
}

export type ActionName = keyof ActionRegistry;
