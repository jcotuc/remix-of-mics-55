// API Backend utilities
// Typed backend action facade over Supabase operations

import type { ActionRegistry, ActionName } from "./api-registry";
import {
  listClientesApiV1ClientesGet,
  getClienteApiV1ClientesClienteIdGet,
  createClienteApiV1ClientesPost,
  updateClienteApiV1ClientesClienteIdPatch,
  deleteClienteApiV1ClientesClienteIdDelete,
  listProductosApiV1ProductosGet,
  getProductoApiV1ProductosProductoIdGet,
  createProductoApiV1ProductosPost,
  updateProductoApiV1ProductosProductoIdPatch,
  deleteProductoApiV1ProductosProductoIdDelete,
  getIncidentesApiV1IncidentesGet,
  getIncidenteApiV1IncidentesIncidenteIdGet,
  createIncidenteApiV1IncidentesPost,
  updateIncidenteApiV1IncidentesIncidenteIdPatch,
  deleteIncidenteApiV1IncidentesIncidenteIdDelete,
  getAllAccesoriosApiV1AccesoriosGet,
  getAccesorioApiV1AccesoriosAccesorioIdGet,
  createAccesorioApiV1AccesoriosPost,
  updateAccesorioApiV1AccesoriosAccesorioIdPatch,
  deleteAccesorioApiV1AccesoriosAccesorioIdDelete,
  searchAccesoriosApiV1AccesoriosSearchGet,
  getAllCausasApiV1CausasGet,
  getCausaByIdApiV1CausasCausaIdGet,
  createCausaApiV1CausasPost,
  updateCausaApiV1CausasCausaIdPatch,
  deleteCausaApiV1CausasCausaIdDelete,
  searchCausasApiV1CausasSearchGet,
  getAllRepuestosApiV1RepuestosGet,
  getRepuestoByIdApiV1RepuestosRepuestoIdGet,
  createRepuestoApiV1RepuestosPost,
  updateRepuestoApiV1RepuestosRepuestoIdPatch,
  deleteRepuestoApiV1RepuestosRepuestoIdDelete,
  getAllBodegasApiV1BodegasGet,
  getBodegaApiV1BodegasBodegaIdGet,
  createBodegaApiV1BodegasPost,
  updateBodegaApiV1BodegasBodegaIdPatch,
  deleteBodegaApiV1BodegasBodegaIdDelete,
  searchBodegasApiV1BodegasSearchGet,
  getAllFamiliasProductoApiV1FamiliasProductoGet,
  getFamiliaProductoApiV1FamiliasProductoFamiliaProductoIdGet,
  createFamiliaProductoApiV1FamiliasProductoPost,
  updateFamiliaProductoApiV1FamiliasProductoFamiliaProductoIdPatch,
  deleteFamiliaProductoApiV1FamiliasProductoFamiliaProductoIdDelete,
  getAllCentrosDeServicioApiV1CentrosDeServicioGet,
  getCentroDeServicioApiV1CentrosDeServicioCentroDeServicioIdGet,
  createCentroDeServicioApiV1CentrosDeServicioPost,
  updateCentroDeServicioApiV1CentrosDeServicioCentroDeServicioIdPatch,
  deleteCentroDeServicioApiV1CentrosDeServicioCentroDeServicioIdDelete,
  getAllMovimientosApiV1MovimientosInventarioGet,
  getMovimientoApiV1MovimientosInventarioMovimientoIdGet,
  createMovimientoApiV1MovimientosInventarioPost,
  deleteMovimientoApiV1MovimientosInventarioMovimientoIdDelete,
  getAllGruposColaFifoApiV1GruposColaFifoGet,
  getGrupoColaFifoApiV1GruposColaFifoGrupoColaFifoIdGet,
  createGrupoColaFifoApiV1GruposColaFifoPost,
  updateGrupoColaFifoApiV1GruposColaFifoGrupoColaFifoIdPut,
  deleteGrupoColaFifoApiV1GruposColaFifoGrupoColaFifoIdDelete,
  getGrupoColaFifoFamiliasApiV1GruposColaFifoGrupoIdFamiliasGet,
  createGrupoColaFifoFamiliaApiV1GruposColaFifoGrupoIdFamiliasPost,
  deleteGrupoColaFifoFamiliaApiV1GruposColaFifoGrupoIdFamiliasGrupoFamiliaIdDelete,
  getAllUbicacionesApiV1UbicacionesGet,
  getUbicacionApiV1UbicacionesUbicacionIdGet,
  createUbicacionApiV1UbicacionesPost,
  updateUbicacionApiV1UbicacionesUbicacionIdPatch,
  deleteUbicacionApiV1UbicacionesUbicacionIdDelete,
  getAllUsersApiV1UsuariosGet,
  getAllRolesApiV1RolesGet,
  getAllGuiasApiV1GuiasGet,
  getGuiaByIdApiV1GuiasGuiaIdGet,
  createGuiaApiV1GuiasPost,
  updateGuiaApiV1GuiasGuiaIdPatch,
  deleteGuiaApiV1GuiasGuiaIdDelete,
  // Diagnosticos
  getDiagnosticosIncidenteApiV1IncidentesIncidenteIdDiagnosticosGet,
  createDiagnosticoApiV1IncidentesIncidenteIdDiagnosticosPost,
  updateDiagnosticoApiV1IncidentesIncidenteIdDiagnosticosDiagnosticoIdPatch,
  deleteDiagnosticoApiV1IncidentesIncidenteIdDiagnosticosDiagnosticoIdDelete,
  getDiagnosticoDraftApiV1IncidentesIncidenteIdDiagnosticosDraftGet,
  createDiagnosticoDraftApiV1IncidentesIncidenteIdDiagnosticosDraftPost,
  // Other SDK functions as needed
} from "@/generated_sdk";


type ActionHandler<K extends ActionName> = (input: ActionRegistry[K]["input"]) => Promise<ActionRegistry[K]["output"]>;

const notImplemented = (action: string) => async () => {
  throw new Error(`Action "${action}" is not implemented yet`);
};

// =============================================================================
// CLIENTES HANDLERS
// =============================================================================
const clientesHandlers: Record<string, ActionHandler<any>> = {
  "clientes.list": async (input) => {
    const { skip = 0, limit = 50, search = "" } = input;
    const response = await listClientesApiV1ClientesGet({
      query: { skip, limit, search },
      responseStyle: 'data',
    });
    // The SDK returns { results, total, skip, limit }, match apiBackendAction output
    return { results: response.results, total: response.total };
  },
  "clientes.get": async (input) => {
    const response = await getClienteApiV1ClientesClienteIdGet({
      path: { cliente_id: input.id },
      responseStyle: 'data',
    });
    return { result: response.result };
  },
  "clientes.create": async (input) => {
    const response = await createClienteApiV1ClientesPost({
      body: input,
      responseStyle: 'data',
    });
    return { result: response.result };
  },
  "clientes.update": async (input) => {
    const { id, data: updateData } = input as any;
    const response = await updateClienteApiV1ClientesClienteIdPatch({
      path: { cliente_id: id },
      body: updateData,
      responseStyle: 'data',
    });
    return { result: response.result };
  },
  "clientes.delete": async (input) => {
    await deleteClienteApiV1ClientesClienteIdDelete({
      path: { cliente_id: input.id },
      responseStyle: 'data',
    });
    return { status: "deleted", id: input.id };
  },
  "clientes.search": async (input) => {
    const { search, limit = 10, skip = 0 } = input as any;
    const response = await listClientesApiV1ClientesGet({
      query: { search, limit, skip },
      responseStyle: 'data',
    });
    return { results: response.results, total: response.total };
  },
  "clientes.getByCodigo": notImplemented("clientes.getByCodigo"), // This action is not directly in SDK, requires a custom search
};

// =============================================================================
// PRODUCTOS HANDLERS
// =============================================================================
const productosHandlers: Record<string, ActionHandler<any>> = {
  "productos.list": async (input) => {
    const { skip = 0, limit = 50 } = input;
    const response = await listProductosApiV1ProductosGet({
      query: { skip, limit },
      responseStyle: 'data',
    });
    return { results: response.results, total: response.total };
  },
  "productos.get": async (input) => {
    const response = await getProductoApiV1ProductosProductoIdGet({
      path: { producto_id: input.id },
      responseStyle: 'data',
    });
    return { result: response.result };
  },
  "productos.create": async (input) => {
    const response = await createProductoApiV1ProductosPost({
      body: input,
      responseStyle: 'data',
    });
    return { result: response.result };
  },
  "productos.update": async (input) => {
    const { id, ...updateData } = input as any;
    const response = await updateProductoApiV1ProductosProductoIdPatch({
      path: { producto_id: id },
      body: updateData,
      responseStyle: 'data',
    });
    return { result: response.result };
  },
  "productos.delete": async (input) => {
    await deleteProductoApiV1ProductosProductoIdDelete({
      path: { producto_id: input.id },
      responseStyle: 'data',
    });
    return { status: "deleted", id: input.id };
  },
  "productos.getByCodigo": notImplemented("productos.getByCodigo"), // This action is not directly in SDK, requires a custom search
  "productos.listAlternativos": notImplemented("productos.listAlternativos"), // Custom logic not in SDK directly
};

// =============================================================================
// INCIDENTES HANDLERS
// =============================================================================
const incidentesHandlers: Record<string, ActionHandler<any>> = {
  "incidentes.list": async (input) => {
    const { skip = 0, limit = 100 } = input;
    const response = await getIncidentesApiV1IncidentesGet({
      query: { skip, limit },
      responseStyle: 'data',
    });
    // SDK IncidenteSchema already includes nested objects, so no manual mapping needed
    return { results: response.results };
  },
  "incidentes.get": async (input) => {
    const response = await getIncidenteApiV1IncidentesIncidenteIdGet({
      path: { incidente_id: input.id },
      responseStyle: 'data',
    });
    return { result: response.result };
  },
  "incidentes.create": async (input) => {
    const response = await createIncidenteApiV1IncidentesPost({
      body: input,
      responseStyle: 'data',
    });
    return { result: response.result };
  },
  "incidentes.update": async (input) => {
    const { id, ...updateData } = input as any;
    const response = await updateIncidenteApiV1IncidentesIncidenteIdPatch({
      path: { incidente_id: id },
      body: updateData,
      responseStyle: 'data',
    });
    return { result: response.result };
  },
  "incidentes.delete": async (input) => {
    await deleteIncidenteApiV1IncidentesIncidenteIdDelete({
      path: { incidente_id: input.id },
      responseStyle: 'data',
    });
    return { status: "deleted", id: input.id };
  },
};

// =============================================================================
// SIMPLE LIST HANDLERS (read-only)
// =============================================================================
const diagnosticosHandlers: Record<string, ActionHandler<any>> = {
  "diagnosticos.list": async (input) => {
    // The SDK's list endpoint for diagnosticos is tied to an incidente_id.
    // Assuming input will contain incidente_id for this action.
    const { incidente_id, skip = 0, limit = 100 } = input as any;
    if (!incidente_id) throw new Error("An incidente_id is required to list diagnosticos.");

    const response = await getDiagnosticosIncidenteApiV1IncidentesIncidenteIdDiagnosticosGet({
      path: { incidente_id },
      query: { skip, limit },
      responseStyle: 'data',
    });
    return { results: response.results, total: response.total };
  },
  "diagnosticos.get": async (input) => {
    const { incidente_id, id } = input as any;
    if (!incidente_id) throw new Error("An incidente_id is required to get a diagnostico.");
    const response = await getDiagnosticoApiV1IncidentesIncidenteIdDiagnosticosDiagnosticoIdGet({
      path: { incidente_id, diagnostico_id: id },
      responseStyle: 'data',
    });
    return { result: response.result };
  },
  "diagnosticos.create": async (input) => {
    const { incidente_id, ...createData } = input as any;
    if (!incidente_id) throw new Error("An incidente_id is required to create a diagnostico.");
    const response = await createDiagnosticoApiV1IncidentesIncidenteIdDiagnosticosPost({
      path: { incidente_id },
      body: createData,
      responseStyle: 'data',
    });
    return { result: response.result };
  },
  "diagnosticos.update": async (input) => {
    const { id, data: updateData } = input as any;
    const { data, error } = await supabase.from("diagnosticos").update({ ...updateData, updated_at: new Date().toISOString() }).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  "diagnosticos.delete": async (input) => {
    const { error } = await supabase.from("diagnosticos").delete().eq("id", input.id);
    if (error) throw error;
    return { status: "deleted", id: input.id };
  },
  "diagnosticos.search": async (input) => { 
    const { incidente_id, tecnico_id, search } = input as any;
    let query = supabase.from("diagnosticos").select("*");
    if (incidente_id) query = query.eq("incidente_id", incidente_id);
    if (tecnico_id) query = query.eq("tecnico_id", tecnico_id);
    if (search) query = query.ilike("recomendaciones", `%${search}%`);
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    return { results: data || [] };
  },
  "repuestos.list": async () => { const { data, error } = await supabase.from("repuestos").select("*").order("codigo").limit(100); if (error) throw error; return { results: data || [], total: data?.length || 0 }; },
  "repuestos.get": async (input) => { const { data, error } = await supabase.from("repuestos").select("*").eq("id", input.id).maybeSingle(); if (error) throw error; return { result: data }; },
  "repuestos.create": notImplemented("repuestos.create"),
  "repuestos.update": notImplemented("repuestos.update"),
  "repuestos.delete": notImplemented("repuestos.delete"),
  "repuestos.search": async (input) => { const { search = "", limit = 20 } = input; let query = supabase.from("repuestos").select("id, codigo, descripcion, clave").limit(limit); if (search) query = query.or(`codigo.ilike.%${search}%,descripcion.ilike.%${search}%,clave.ilike.%${search}%`); const { data, error } = await query; if (error) throw error; return { results: data || [] }; },
  "bodegas.list": async () => { const { data, error } = await supabase.from("bodegas").select("*").order("nombre"); if (error) throw error; return { results: data || [], total: data?.length || 0 }; },
  "bodegas.get": async (input) => { const { data, error } = await supabase.from("bodegas").select("*").eq("id", input.id).maybeSingle(); if (error) throw error; return { result: data }; },
  "bodegas.create": notImplemented("bodegas.create"),
  "bodegas.update": notImplemented("bodegas.update"),
  "bodegas.delete": notImplemented("bodegas.delete"),
  "inventarios.list": async (input) => { const { centro_servicio_id, codigo_repuesto, bodega, offset = 0, limit = 50 } = input as any; let query = supabase.from("inventario").select("*", { count: "exact" }); if (centro_servicio_id) query = query.eq("centro_servicio_id", centro_servicio_id); if (codigo_repuesto) query = query.ilike("codigo_repuesto", `%${codigo_repuesto}%`); if (bodega) query = query.eq("bodega", bodega); const { data, error, count } = await query.range(offset, offset + limit - 1).order("codigo_repuesto"); if (error) throw error; return { data: data || [], count: count || 0 }; },
  "inventarios.get": async (input) => { const { data, error } = await supabase.from("inventario").select("*").eq("id", input.id).maybeSingle(); if (error) throw error; return { result: data }; },
  "inventarios.create": notImplemented("inventarios.create"),
  "inventarios.update": notImplemented("inventarios.update"),
  "inventarios.delete": notImplemented("inventarios.delete"),
  "movimientos_inventario.list": async (input) => { const { centro_servicio_id, tipo_movimiento, offset = 0, limit = 50 } = input as any; let query = supabase.from("movimientos_inventario").select("*", { count: "exact" }); if (centro_servicio_id) query = query.eq("centro_servicio_id", centro_servicio_id); if (tipo_movimiento) query = query.eq("tipo_movimiento", tipo_movimiento); const { data, error, count } = await query.range(offset, offset + limit - 1).order("created_at", { ascending: false }); if (error) throw error; return { data: data || [], count: count || 0 }; },
  "movimientos_inventario.get": async (input) => { const { data, error } = await supabase.from("movimientos_inventario").select("*").eq("id", input.id).maybeSingle(); if (error) throw error; return { result: data }; },
  "movimientos_inventario.create": notImplemented("movimientos_inventario.create"),
  "solicitudes_repuestos.list": async () => { const { data, error } = await supabase.from("solicitudes_repuestos").select("*").order("created_at", { ascending: false }); if (error) throw error; return { data: data || [], count: data?.length || 0 }; },
  "solicitudes_repuestos.get": async (input) => { const { data, error } = await supabase.from("solicitudes_repuestos").select("*").eq("id", input.id).maybeSingle(); if (error) throw error; return { result: data }; },
  "solicitudes_repuestos.create": notImplemented("solicitudes_repuestos.create"),
  "solicitudes_repuestos.update": notImplemented("solicitudes_repuestos.update"),
  "solicitudes_repuestos.delete": notImplemented("solicitudes_repuestos.delete"),
  "pedidos_bodega_central.list": async () => { const { data, error } = await supabase.from("pedidos_bodega_central").select("*").order("created_at", { ascending: false }); if (error) throw error; return { data: data || [], count: data?.length || 0 }; },
  "pedidos_bodega_central.get": async (input) => { const { data, error } = await supabase.from("pedidos_bodega_central").select("*").eq("id", input.id).maybeSingle(); if (error) throw error; return { result: data }; },
  "pedidos_bodega_central.create": notImplemented("pedidos_bodega_central.create"),
  "pedidos_bodega_central.update": notImplemented("pedidos_bodega_central.update"),
  "pedidos_bodega_central.delete": notImplemented("pedidos_bodega_central.delete"),
  "embarques.list": async () => { const { data, error } = await supabase.from("embarques").select("*").order("fecha_llegada", { ascending: false }); if (error) throw error; return { data: data || [], count: data?.length || 0 }; },
  "embarques.get": async (input) => { const { data, error } = await supabase.from("embarques").select("*").eq("id", input.id).maybeSingle(); if (error) throw error; return { result: data }; },
  "embarques.create": notImplemented("embarques.create"),
  "embarques.update": notImplemented("embarques.update"),
  "embarques.delete": notImplemented("embarques.delete"),
  "importaciones.list": async () => { const { data, error } = await supabase.from("importaciones").select("*").order("fecha_llegada", { ascending: false }); if (error) throw error; return { data: data || [], count: data?.length || 0 }; },
  "importaciones.get": async (input) => { const { data, error } = await supabase.from("importaciones").select("*").eq("id", input.id).maybeSingle(); if (error) throw error; return { result: data }; },
  "importaciones.create": notImplemented("importaciones.create"),
  "importaciones.update": notImplemented("importaciones.update"),
  "importaciones.delete": notImplemented("importaciones.delete"),
  "ubicaciones.list": async (input) => {
    const { skip = 0, limit = 100, search, bodega_id } = input || {};
    const response = await getAllUbicacionesApiV1UbicacionesGet({
      query: { skip, limit, q: search, bodega_id },
      responseStyle: 'data',
    });
    return { results: response.results, total: response.total };
  },
  "ubicaciones.get": async (input) => { const { data, error } = await supabase.from("ubicaciones").select("*").eq("id", input.id).maybeSingle(); if (error) throw error; return { result: data }; },
  "ubicaciones.create": notImplemented("ubicaciones.create"),
  "ubicaciones.update": notImplemented("ubicaciones.update"),
  "ubicaciones.delete": notImplemented("ubicaciones.delete"),
  "transitos_bodega.list": async () => { const { data, error } = await supabase.from("transitos_bodega").select("*").order("fecha_envio", { ascending: false }); if (error) throw error; return { data: data || [], count: data?.length || 0 }; },
  "transitos_bodega.get": async (input) => { const { data, error } = await supabase.from("transitos_bodega").select("*").eq("id", input.id).maybeSingle(); if (error) throw error; return { result: data }; },
  "transitos_bodega.create": notImplemented("transitos_bodega.create"),
  "transitos_bodega.update": notImplemented("transitos_bodega.update"),
  "transitos_bodega.delete": notImplemented("transitos_bodega.delete"),
  "usuarios.list": async (input) => {
    const { skip = 0, limit = 100 } = input || {};
    const response = await getAllUsersApiV1UsuariosGet({
      query: { skip, limit },
      responseStyle: 'data',
    });
    return { results: response.results, total: response.total };
  },
  "roles.list": async (input) => {
    // Note: The /api/v1/roles/ endpoint currently does not support filtering parameters in openapi.json.
    // Future backend updates could introduce a 'q' parameter for versatile searching.
    const response = await getAllRolesApiV1RolesGet({
      responseStyle: 'data',
    });
    return { items: response };
  },
  "fallas.list": async (input) => {
    const { skip = 0, limit = 100, search, producto_id } = input || {};
    const response = await getAllFallasApiV1FallasGet({
      query: { skip, limit, q: search, producto_id },
      responseStyle: 'data',
    });
    return { results: response.results, total: response.total };
  },
  "causas.list": async (input) => {
    const { skip = 0, limit = 100, search, familia_id } = input || {};
    const response = await getAllCausasApiV1CausasGet({
      query: { skip, limit, q: search, familia_id },
      responseStyle: 'data',
    });
    return { results: response.results, total: response.total };
  },
  "accesorios.list": async (input) => {
    const { skip = 0, limit = 100, search, familia_id, producto_id } = input || {};
    const response = await getAllAccesoriosApiV1AccesoriosGet({
      query: { skip, limit, q: search, familia_id, producto_id },
      responseStyle: 'data',
    });
    return { results: response.results, total: response.total };
  },
  "accesorios.create": notImplemented("accesorios.create"),
  "guias.list": async (input) => {
    const { skip = 0, limit = 100, incidente_id, estado, centro_de_servicio_origen_id, centro_de_servicio_destino_id, search } = input || {};
    const response = await getAllGuiasApiV1GuiasGet({
      query: { skip, limit, incidente_id, estado, centro_de_servicio_origen_id, centro_de_servicio_destino_id, q: search },
      responseStyle: 'data',
    });
    return { results: response.results, total: response.total };
  },
  "presupuestos.list": async (input) => { const incidente_id = (input as any).incidente_id; let query = supabase.from("presupuestos").select("*"); if (incidente_id) query = query.eq("incidente_id", incidente_id); const { data, error } = await query.order("created_at", { ascending: false }); if (error) throw error; return { data: data || [], count: data?.length || 0 }; },
  "presupuestos.get": async (input) => { const { data, error } = await supabase.from("presupuestos").select("*").eq("id", input.id).maybeSingle(); if (error) throw error; return data; },
  "presupuestos.create": notImplemented("presupuestos.create"),
  "presupuestos.update": notImplemented("presupuestos.update"),
  "presupuestos.delete": notImplemented("presupuestos.delete"),
  "familias_producto.list": async (input) => {
    const { skip = 0, limit = 100 } = input || {};
    const response = await getGrandparentFamiliasProductoApiV1FamiliasProductoAbuelosGet({
      query: { skip, limit },
      responseStyle: 'data',
    });
    return { results: response.results, total: response.total };
  },
  "centros_de_servicio.list": async (input) => {
    const { skip = 0, limit = 100, search } = input || {};
    // Note: The /api/v1/centros-de-servicio/ endpoint currently does not explicitly support
    // an 'activo' filter in openapi.json. If needed, the backend and openapi.json
    // should be updated to include it, possibly as part of the 'q' parameter.
    const response = await getAllCentrosDeServicioApiV1CentrosDeServicioGet({
      query: { skip, limit, q: search },
      responseStyle: 'data',
    });
    return { items: response.results, total: response.total };
  },
    "grupos_cola_fifo.list": async (input) => {
      const { skip = 0, limit = 300, centro_servicio_id } = input || {};
      // Note: The /api/v1/grupos-cola-fifo/ endpoint currently does not explicitly support
      // a 'q' parameter for versatile searching in openapi.json.
      const response = await getAllGruposColaFifoApiV1GruposColaFifoGet({
        query: { skip, limit, centro_de_servicio_id },
        responseStyle: 'data',
      });
      return { results: response, total: response.length };
    },  "grupos_cola_fifo.get": async (input) => { const { data, error } = await supabase.from("grupos_cola_fifo").select("*").eq("id", input.id).maybeSingle(); if (error) throw error; return { result: data }; },
  "grupos_cola_fifo.create": async (input) => { const { data, error } = await supabase.from("grupos_cola_fifo").insert(input as any).select().single(); if (error) throw error; return data; },
  "grupos_cola_fifo.update": async (input) => { const { id, data: updateData } = input as any; const { data, error } = await supabase.from("grupos_cola_fifo").update(updateData).eq("id", id).select().single(); if (error) throw error; return data; },
  "grupos_cola_fifo.delete": async (input) => { const { error } = await supabase.from("grupos_cola_fifo").delete().eq("id", input.id); if (error) throw error; return { status: "deleted", id: input.id }; },
  "grupos_cola_fifo_familias.list": async (input) => {
    const { grupo_id, skip = 0, limit = 300 } = input || {};
    if (!grupo_id) throw new Error("A grupo_id is required to list grupo_cola_fifo_familias.");
    // Note: The /api/v1/grupos-cola-fifo/{grupo_id}/familias endpoint currently does not explicitly support
    // a 'q' parameter for versatile searching in openapi.json.
    const response = await getGrupoColaFifoFamiliasApiV1GruposColaFifoGrupoIdFamiliasGet({
      path: { grupo_id },
      query: { skip, limit },
      responseStyle: 'data',
    });
    return { results: response, total: response.length };
  },
  "grupos_cola_fifo_familias.get": async (input) => { const { data, error } = await supabase.from("grupos_cola_fifo_familias").select("*").eq("id", input.id).maybeSingle(); if (error) throw error; return { result: data }; },
  "grupos_cola_fifo_familias.create": async (input) => { const { data, error } = await supabase.from("grupos_cola_fifo_familias").insert(input as any).select().single(); if (error) throw error; return data; },
  "grupos_cola_fifo_familias.update": async (input) => { const { id, data: updateData } = input as any; const { data, error } = await supabase.from("grupos_cola_fifo_familias").update(updateData).eq("id", id).select().single(); if (error) throw error; return data; },
  "grupos_cola_fifo_familias.delete": async (input) => { const { error } = await supabase.from("grupos_cola_fifo_familias").delete().eq("id", input.id); if (error) throw error; return { status: "deleted", id: input.id }; },
};

// =============================================================================
// MOSTRADOR MODULE HANDLERS
// =============================================================================
const mostradorHandlers: Record<string, ActionHandler<any>> = {
  // Cotizaciones
  "cotizaciones.create": async (input) => {
    const { data, error } = await supabase.from("cotizaciones").insert(input as any).select().single();
    if (error) throw error;
    return data;
  },
  "cotizaciones.list": async (input) => {
    const { skip = 0, limit = 50 } = input || {};
    const { data, error } = await supabase.from("cotizaciones").select("*").range(skip, skip + limit - 1).order("created_at", { ascending: false });
    if (error) throw error;
    return { results: data || [] };
  },
  // Notificaciones Cliente
  "notificaciones_cliente.list": async (input) => {
    const { incidente_id } = input || {} as any;
    let query = (supabase as any).from("notificaciones_cliente").select("*");
    if (incidente_id) query = query.eq("incidente_id", incidente_id);
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    return { results: data || [] };
  },
  "notificaciones_cliente.create": async (input) => {
    const insertData = Array.isArray(input) ? input : [input];
    const { data, error } = await (supabase as any).from("notificaciones_cliente").insert(insertData).select();
    if (error) throw error;
    return { results: data || [] };
  },
  // Incidente Fotos
  "incidente_fotos.list": async (input) => {
    const { incidente_id } = input as any;
    let query = supabase.from("incidente_fotos").select("*");
    if (incidente_id) query = query.eq("incidente_id", incidente_id);
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    return { results: data || [] };
  },
  "incidente_fotos.create": async (input) => {
    const insertData = Array.isArray(input) ? input : [input];
    const { data, error } = await supabase.from("incidente_fotos").insert(insertData as any).select();
    if (error) throw error;
    return { results: data || [] };
  },
  // Incidente Accesorios
  "incidente_accesorios.list": async (input) => {
    const { incidente_id } = input as any;
    const { data, error } = await supabase
      .from("incidente_accesorios")
      .select("accesorios:accesorio_id(nombre)")
      .eq("incidente_id", incidente_id);
    if (error) throw error;
    return { results: data || [] };
  },
  // Incidente Tecnico
  "incidente_tecnico.list": async (input) => {
    const { incidente_id, es_principal, tecnico_id } = input as any;
    let query = supabase.from("incidente_tecnico").select("*");
    if (incidente_id) query = query.eq("incidente_id", incidente_id);
    if (es_principal !== undefined) query = query.eq("es_principal", es_principal);
    if (tecnico_id) query = query.eq("tecnico_id", tecnico_id);
    const { data, error } = await query;
    if (error) throw error;
    return { results: data || [] };
  },
  // Usuarios - get single
  "usuarios.get": async (input) => {
    const { data, error } = await supabase.from("usuarios").select("*").eq("id", input.id).maybeSingle();
    if (error) throw error;
    return { result: data };
  },
  // Centros de Servicio - get single
  "centros_de_servicio.get": async (input) => {
    const { data, error } = await supabase.from("centros_de_servicio").select("*").eq("id", input.id).maybeSingle();
    if (error) throw error;
    return { result: data };
  },
  // Direcciones Envio
  "direcciones_envio.list": async (input) => {
    const { cliente_id } = input as any;
    let query = (supabase as any).from("direcciones_envio").select("*");
    if (cliente_id) query = query.eq("cliente_id", cliente_id);
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    return { results: data || [] };
  },
  "direcciones_envio.get": async (input) => {
    const { data, error } = await (supabase as any).from("direcciones_envio").select("*").eq("id", input.id).maybeSingle();
    if (error) throw error;
    return { result: data };
  },
  // Guias - with filters
  "guias.search": async (input) => {
    const { incidente_codigo, incidente_id, estado, limit = 50 } = input as any;
    let query = supabase.from("guias").select("*");
    // Filter by incidente_id (preferred) or fallback to incidente_codigo text search
    if (incidente_id) {
      query = query.eq("incidente_id", incidente_id);
    } else if (incidente_codigo) {
      // Use textual search in the jsonb array since contains has issues with text arrays
      query = query.or(`incidente_id.not.is.null`);
    }
    if (estado) query = query.eq("estado", estado);
    const { data, error } = await query.order("fecha_guia", { ascending: false }).limit(limit);
    if (error) throw error;
    // If filtering by codigo, do it client-side since JSONB array contains is problematic
    let results = data || [];
    if (incidente_codigo && !incidente_id) {
      results = results.filter((g: any) => {
        const codigos = g.incidentes_codigos;
        if (Array.isArray(codigos)) return codigos.includes(incidente_codigo);
        return false;
      });
    }
    return { results };
  },
  // Clientes - get by codigo
  "clientes.getByCodigo": async (input) => {
    const { codigo } = input as any;
    const { data, error } = await supabase.from("clientes").select("*").eq("codigo", codigo).maybeSingle();
    if (error) throw error;
    return { result: data };
  },
  // Productos - get by codigo
  "productos.getByCodigo": async (input) => {
    const { codigo } = input as any;
    const { data, error } = await supabase.from("productos").select("*").eq("codigo", codigo).maybeSingle();
    if (error) throw error;
    return { result: data };
  },
  // Solicitudes Repuestos - search by incidente
  "solicitudes_repuestos.search": async (input) => {
    const { incidente_id, estado, limit = 50 } = input as any;
    let query = supabase.from("solicitudes_repuestos").select("*");
    if (incidente_id) query = query.eq("incidente_id", incidente_id);
    if (estado) query = query.ilike("estado", `%${estado}%`);
    const { data, error } = await query.order("created_at", { ascending: false }).limit(limit);
    if (error) throw error;
    return { results: data || [] };
  },
  // Inventario - search by codigos
  "inventarios.search": async (input) => {
    const { codigos_repuesto, centro_servicio_id } = input as any;
    let query = supabase.from("inventario").select("codigo_repuesto, costo_unitario, descripcion");
    if (codigos_repuesto?.length) query = query.in("codigo_repuesto", codigos_repuesto);
    if (centro_servicio_id) query = query.eq("centro_servicio_id", centro_servicio_id);
    const { data, error } = await query;
    if (error) throw error;
    return { results: data || [] };
  },
};

// =============================================================================
// CALIDAD MODULE HANDLERS
// =============================================================================
const calidadHandlers: Record<string, ActionHandler<any>> = {
  "auditorias_calidad.list": async (input) => {
    const { skip = 0, limit = 100 } = input || {};
    const { data, error } = await supabase.from("auditorias_calidad").select("*").range(skip, skip + limit - 1).order("fecha_auditoria", { ascending: false });
    if (error) throw error;
    return { results: data || [] };
  },
  "auditorias_calidad.get": async (input) => {
    const { data, error } = await supabase.from("auditorias_calidad").select("*").eq("id", input.id).maybeSingle();
    if (error) throw error;
    return { result: data };
  },
  "auditorias_calidad.create": async (input) => {
    const { data, error } = await supabase.from("auditorias_calidad").insert(input as any).select().single();
    if (error) throw error;
    return data;
  },
  "auditorias_calidad.update": async (input) => {
    const { id, data: updateData } = input as any;
    const { data, error } = await supabase.from("auditorias_calidad").update(updateData).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  "auditorias_calidad.delete": async (input) => {
    const { error } = await supabase.from("auditorias_calidad").delete().eq("id", input.id);
    if (error) throw error;
    return { status: "deleted", id: input.id };
  },
  "defectos_calidad.list": async (input) => {
    const { skip = 0, limit = 100 } = input || {};
    const { data, error } = await supabase.from("defectos_calidad").select("*").range(skip, skip + limit - 1).order("created_at", { ascending: false });
    if (error) throw error;
    return { results: data || [] };
  },
  "defectos_calidad.get": async (input) => {
    const { data, error } = await supabase.from("defectos_calidad").select("*").eq("id", input.id).maybeSingle();
    if (error) throw error;
    return { result: data };
  },
  "defectos_calidad.create": async (input) => {
    const { data, error } = await supabase.from("defectos_calidad").insert(input as any).select().single();
    if (error) throw error;
    return data;
  },
  "defectos_calidad.update": async (input) => {
    const { id, data: updateData } = input as any;
    const { data, error } = await supabase.from("defectos_calidad").update(updateData).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  "defectos_calidad.delete": async (input) => {
    const { error } = await supabase.from("defectos_calidad").delete().eq("id", input.id);
    if (error) throw error;
    return { status: "deleted", id: input.id };
  },
};

// =============================================================================
// GARANTIAS MANUALES HANDLERS
// =============================================================================
const garantiasHandlers: Record<string, ActionHandler<any>> = {
  "garantias_manuales.list": async (input) => {
    const { skip = 0, limit = 100, created_by } = input || {};
    let query = supabase.from("garantias_manuales").select("*");
    if (created_by) query = query.eq("created_by", created_by);
    const { data, error } = await query.range(skip, skip + limit - 1).order("created_at", { ascending: false });
    if (error) throw error;
    return { results: data || [] };
  },
  "garantias_manuales.get": async (input) => {
    const { data, error } = await supabase.from("garantias_manuales").select("*").eq("id", input.id).maybeSingle();
    if (error) throw error;
    return { result: data };
  },
  "garantias_manuales.create": async (input) => {
    const { data, error } = await supabase.from("garantias_manuales").insert(input as any).select().single();
    if (error) throw error;
    return data;
  },
  "garantias_manuales.update": async (input) => {
    const { id, data: updateData } = input as any;
    const { data, error } = await supabase.from("garantias_manuales").update(updateData).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  "garantias_manuales.delete": async (input) => {
    const { error } = await supabase.from("garantias_manuales").delete().eq("id", input.id);
    if (error) throw error;
    return { status: "deleted", id: input.id };
  },
};

// =============================================================================
// SAC MODULE HANDLERS
// =============================================================================
const sacHandlers: Record<string, ActionHandler<any>> = {
  "asignaciones_sac.list": async (input) => {
    const { user_id, incidente_id, activo } = input || {};
    let query = supabase.from("asignaciones_sac").select("*");
    if (user_id) query = query.eq("user_id", user_id);
    if (incidente_id) query = query.eq("incidente_id", incidente_id);
    if (activo !== undefined) query = query.eq("activo", activo);
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    return { results: data || [] };
  },
  "asignaciones_sac.get": async (input) => {
    const { data, error } = await supabase.from("asignaciones_sac").select("*").eq("id", input.id).maybeSingle();
    if (error) throw error;
    return { result: data };
  },
  "asignaciones_sac.create": async (input) => {
    const { data, error } = await supabase.from("asignaciones_sac").insert(input as any).select().single();
    if (error) throw error;
    return data;
  },
  "asignaciones_sac.update": async (input) => {
    const { id, data: updateData } = input as any;
    const { data, error } = await supabase.from("asignaciones_sac").update(updateData).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  "asignaciones_sac.delete": async (input) => {
    const { error } = await supabase.from("asignaciones_sac").delete().eq("id", input.id);
    if (error) throw error;
    return { status: "deleted", id: input.id };
  },
};

// =============================================================================
// NOTIFICACIONES HANDLERS (sistema interno)
// =============================================================================
const notificacionesHandlers: Record<string, ActionHandler<any>> = {
  "notificaciones.list": async (input) => {
    const { usuario_id, leido, tipo } = input || {};
    let query = (supabase as any).from("notificaciones").select("*");
    if (usuario_id) query = query.eq("usuario_id", usuario_id);
    if (leido !== undefined) query = query.eq("leido", leido);
    if (tipo) query = query.eq("tipo", tipo);
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    return { results: data || [] };
  },
  "notificaciones.get": async (input) => {
    const { data, error } = await (supabase as any).from("notificaciones").select("*").eq("id", input.id).maybeSingle();
    if (error) throw error;
    return { result: data };
  },
  "notificaciones.create": async (input) => {
    const { data, error } = await (supabase as any).from("notificaciones").insert(input as any).select().single();
    if (error) throw error;
    return data;
  },
  "notificaciones.update": async (input) => {
    const { id, data: updateData } = input as any;
    const { data, error } = await (supabase as any).from("notificaciones").update(updateData).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  "notificaciones.delete": async (input) => {
    const { error } = await (supabase as any).from("notificaciones").delete().eq("id", input.id);
    if (error) throw error;
    return { status: "deleted", id: input.id };
  },
  "notificaciones.markAsRead": async (input) => {
    const { id } = input;
    const { data, error } = await (supabase as any).from("notificaciones").update({ leido: true, fecha_leido: new Date().toISOString() }).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
};

// =============================================================================
// SOLICITUDES CAMBIO HANDLERS
// =============================================================================
const solicitudesCambioHandlers: Record<string, ActionHandler<any>> = {
  "solicitudes_cambio.list": async (input) => {
    const { skip = 0, limit = 100, estado } = input || {};
    let query = (supabase as any).from("solicitudes_cambio").select("*");
    if (estado) query = query.eq("estado", estado);
    const { data, error } = await query.range(skip, skip + limit - 1).order("created_at", { ascending: false });
    if (error) throw error;
    return { results: data || [] };
  },
  "solicitudes_cambio.get": async (input) => {
    const { data, error } = await (supabase as any).from("solicitudes_cambio").select("*").eq("id", input.id).maybeSingle();
    if (error) throw error;
    return { result: data };
  },
  "solicitudes_cambio.create": async (input) => {
    const { data, error } = await (supabase as any).from("solicitudes_cambio").insert(input as any).select().single();
    if (error) throw error;
    return data;
  },
  "solicitudes_cambio.update": async (input) => {
    const { id, data: updateData } = input as any;
    const { data, error } = await (supabase as any).from("solicitudes_cambio").update(updateData).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  "solicitudes_cambio.delete": async (input) => {
    const { error } = await (supabase as any).from("solicitudes_cambio").delete().eq("id", input.id);
    if (error) throw error;
    return { status: "deleted", id: input.id };
  },
};

// =============================================================================
// INCIDENTE TECNICO EXTENDED HANDLERS
// =============================================================================
const incidenteTecnicoHandlers: Record<string, ActionHandler<any>> = {
  "incidente_tecnico.get": async (input) => {
    const { data, error } = await supabase.from("incidente_tecnico").select("*").eq("id", input.id).maybeSingle();
    if (error) throw error;
    return { result: data };
  },
  "incidente_tecnico.create": async (input) => {
    const { data, error } = await supabase.from("incidente_tecnico").insert(input as any).select().single();
    if (error) throw error;
    return data;
  },
  "incidente_tecnico.update": async (input) => {
    const { id, data: updateData } = input as any;
    const { data, error } = await supabase.from("incidente_tecnico").update(updateData).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  "incidente_tecnico.delete": async (input) => {
    const { error } = await supabase.from("incidente_tecnico").delete().eq("id", input.id);
    if (error) throw error;
    return { status: "deleted", id: input.id };
  },
  "incidente_tecnico.search": async (input) => {
    const { tecnico_id, es_activo } = input || {};
    let query = (supabase as any).from("incidente_tecnico").select("*");
    if (tecnico_id) query = query.eq("tecnico_id", tecnico_id);
    if (es_activo !== undefined) query = query.eq("es_activo", es_activo);
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    return { results: data || [] };
  },
};

// =============================================================================
// DIAGNOSTICO FALLAS/CAUSAS HANDLERS
// =============================================================================
const diagnosticoAsociacionesHandlers: Record<string, ActionHandler<any>> = {
  "diagnostico_fallas.list": async (input) => {
    const { diagnostico_id } = input;
    const { data, error } = await supabase
      .from("diagnostico_fallas")
      .select("*, falla:fallas(id, nombre)")
      .eq("diagnostico_id", diagnostico_id);
    if (error) throw error;
    return { results: data || [] };
  },
  "diagnostico_fallas.create": async (input) => {
    const { data, error } = await supabase.from("diagnostico_fallas").insert(input as any).select().single();
    if (error) throw error;
    return data;
  },
  "diagnostico_fallas.delete": async (input) => {
    const { diagnostico_id, falla_id } = input;
    let query = supabase.from("diagnostico_fallas").delete().eq("diagnostico_id", diagnostico_id);
    if (falla_id) query = query.eq("falla_id", falla_id);
    const { error } = await query;
    if (error) throw error;
    return { status: "deleted" };
  },
  "diagnostico_fallas.deleteByDiagnostico": async (input) => {
    const { diagnostico_id } = input;
    const { error } = await supabase.from("diagnostico_fallas").delete().eq("diagnostico_id", diagnostico_id);
    if (error) throw error;
    return { status: "deleted" };
  },
  "diagnostico_fallas.createBatch": async (input) => {
    const { data, error } = await supabase.from("diagnostico_fallas").insert(input as any).select();
    if (error) throw error;
    return data || [];
  },
  "diagnostico_causas.list": async (input) => {
    const { diagnostico_id } = input;
    const { data, error } = await supabase
      .from("diagnostico_causas")
      .select("*, causa:causas(id, nombre)")
      .eq("diagnostico_id", diagnostico_id);
    if (error) throw error;
    return { results: data || [] };
  },
  "diagnostico_causas.create": async (input) => {
    const { data, error } = await supabase.from("diagnostico_causas").insert(input as any).select().single();
    if (error) throw error;
    return data;
  },
  "diagnostico_causas.delete": async (input) => {
    const { diagnostico_id, causa_id } = input;
    let query = supabase.from("diagnostico_causas").delete().eq("diagnostico_id", diagnostico_id);
    if (causa_id) query = query.eq("causa_id", causa_id);
    const { error } = await query;
    if (error) throw error;
    return { status: "deleted" };
  },
  "diagnostico_causas.deleteByDiagnostico": async (input) => {
    const { diagnostico_id } = input;
    const { error } = await supabase.from("diagnostico_causas").delete().eq("diagnostico_id", diagnostico_id);
    if (error) throw error;
    return { status: "deleted" };
  },
  "diagnostico_causas.createBatch": async (input) => {
    const { data, error } = await supabase.from("diagnostico_causas").insert(input as any).select();
    if (error) throw error;
    return data || [];
  },
};

// =============================================================================
// USUARIOS EXTENDED HANDLERS
// =============================================================================
const usuariosExtendedHandlers: Record<string, ActionHandler<any>> = {
  "usuarios.search": async (input) => {
    const { search, rol, email, skip = 0, limit = 100 } = input || {};
    // Note: The /api/v1/usuarios/ endpoint currently does not support a 'q' parameter in openapi.json.
    // This call is structured to align with future backend updates that will enable versatile searching via 'q'.
    const qParams = new URLSearchParams();
    if (search) {
      qParams.append("q", search);
    }
    if (rol) {
      qParams.append("rol", rol);
    }
    if (email) {
      qParams.append("email", email);
    }

    const queryString = qParams.toString();

    // Call the updated 'usuarios.list' handler, passing 'q' for backend to parse
    const listInput: any = { skip, limit };
    if (queryString) {
        listInput.q = queryString; // Pass as 'q' for backend to parse
    }

    const { results, total } = await handlers["usuarios.list"](listInput);
    return { results, total };
  },
  "usuarios.getByEmail": async (input) => {
    const { email } = input;
    const { data, error } = await (supabase as any).from("usuarios").select("*").eq("email", email).maybeSingle();
    if (error) throw error;
    return { result: data };
  },
};

// =============================================================================
// TRANSITOS BODEGA EXTENDED
// =============================================================================
const transitosExtendedHandlers: Record<string, ActionHandler<any>> = {
  "transitos_bodega.search": async (input) => {
    const { estado, bodega_origen_id, bodega_destino_id } = input || {};
    let query = (supabase as any).from("transitos_bodega").select("*");
    if (estado) query = query.eq("estado", estado);
    if (bodega_origen_id) query = query.eq("bodega_origen_id", bodega_origen_id);
    if (bodega_destino_id) query = query.eq("bodega_destino_id", bodega_destino_id);
    const { data, error } = await query.order("fecha_envio", { ascending: false });
    if (error) throw error;
    return { results: data || [] };
  },
};

// =============================================================================
// CENTROS SUPERVISOR HANDLERS
// =============================================================================
const centrosSupervisorHandlers: Record<string, ActionHandler<any>> = {
  "centros_supervisor.list": async (input) => {
    const { supervisor_id } = input || {};
    let query = supabase.from("centros_supervisor").select("*");
    if (supervisor_id) query = query.eq("supervisor_id", supervisor_id);
    const { data, error } = await query;
    if (error) throw error;
    return { results: data || [] };
  },
  "centros_supervisor.create": async (input) => {
    const { data, error } = await supabase.from("centros_supervisor").insert(input as any).select().single();
    if (error) throw error;
    return data;
  },
  "centros_supervisor.delete": async (input) => {
    const { id, supervisor_id } = input;
    let query = supabase.from("centros_supervisor").delete();
    if (id) query = query.eq("id", id);
    if (supervisor_id) query = query.eq("supervisor_id", supervisor_id);
    const { error } = await query;
    if (error) throw error;
    return { status: "deleted" };
  },
};

// =============================================================================
// SOLICITUDES TRANSFERENCIA MAQUINAS
// =============================================================================
const solicitudesTransferenciaHandlers: Record<string, ActionHandler<any>> = {
  "solicitudes_transferencia_maquinas.list": async (input) => {
    const { estado, centro_origen_id, centro_destino_id } = input || {};
    let query = (supabase as any).from("solicitudes_transferencia_maquinas").select(`*, incidentes:incidente_id(codigo, producto_id)`);
    if (estado) query = query.eq("estado", estado);
    if (centro_origen_id) query = query.eq("centro_origen_id", centro_origen_id);
    if (centro_destino_id) query = query.eq("centro_destino_id", centro_destino_id);
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    return { results: data || [] };
  },
  "solicitudes_transferencia_maquinas.get": async (input) => {
    const { data, error } = await (supabase as any).from("solicitudes_transferencia_maquinas").select("*").eq("id", input.id).maybeSingle();
    if (error) throw error;
    return { result: data };
  },
  "solicitudes_transferencia_maquinas.create": async (input) => {
    const { data, error } = await (supabase as any).from("solicitudes_transferencia_maquinas").insert(input).select().single();
    if (error) throw error;
    return data;
  },
  "solicitudes_transferencia_maquinas.update": async (input) => {
    const { id, data: updateData } = input as any;
    const { data, error } = await (supabase as any).from("solicitudes_transferencia_maquinas").update(updateData).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
};

// =============================================================================
// USER ROLES HANDLERS
// =============================================================================
const userRolesHandlers: Record<string, ActionHandler<any>> = {
  "user_roles.list": async (input) => {
    const { user_id, role } = input || {};
    let query = (supabase as any).from("user_roles").select("*");
    if (user_id) query = query.eq("user_id", user_id);
    if (role) query = query.eq("role", role);
    const { data, error } = await query;
    if (error) throw error;
    return { results: data || [] };
  },
};

// =============================================================================
// REPUESTOS RELACIONES HANDLERS
// =============================================================================
const repuestosRelacionesHandlers: Record<string, ActionHandler<any>> = {
  "repuestos_relaciones.list": async (input) => {
    const { limit = 1000, offset = 0 } = input || {};
    const { data, error } = await (supabase as any)
      .from("repuestos_relaciones")
      .select("*")
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return { results: data || [] };
  },
};

// =============================================================================
// CONFIGURACION FIFO CENTRO HANDLERS
// =============================================================================
const configuracionFifoHandlers: Record<string, ActionHandler<any>> = {
  "configuracion_fifo_centro.list": async (input) => {
    const { centro_servicio_id, activo } = input || {};
    let query = (supabase as any).from("configuracion_fifo_centro").select("*");
    if (centro_servicio_id) query = query.eq("centro_servicio_id", centro_servicio_id);
    if (activo !== undefined) query = query.eq("activo", activo);
    const { data, error } = await query;
    if (error) throw error;
    return { results: data || [] };
  },
  "configuracion_fifo_centro.create": async (input) => {
    const { data, error } = await (supabase as any).from("configuracion_fifo_centro").insert(input).select().single();
    if (error) throw error;
    return data;
  },
  "configuracion_fifo_centro.update": async (input) => {
    const { id, data: updateData } = input as any;
    const { data, error } = await (supabase as any).from("configuracion_fifo_centro").update(updateData).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  "configuracion_fifo_centro.delete": async (input) => {
    const { error } = await (supabase as any).from("configuracion_fifo_centro").delete().eq("id", input.id);
    if (error) throw error;
    return { status: "deleted", id: input.id };
  },
};

// =============================================================================
// MEDIA HANDLERS
// =============================================================================
const mediaHandlers: Record<string, ActionHandler<any>> = {
  "media.list": async (input) => {
    const { incidente_id } = input || {};
    let query = supabase.from("media").select("*");
    if (incidente_id) query = query.eq("incidente_id", incidente_id);
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    return { results: data || [] };
  },
  "media.create": async (input) => {
    const { data, error } = await supabase.from("media").insert(input as any).select().single();
    if (error) throw error;
    return data;
  },
};

// =============================================================================
// PEDIDOS BODEGA CENTRAL EXTENDED HANDLERS
// =============================================================================
const pedidosBodegaExtendedHandlers: Record<string, ActionHandler<any>> = {
  "pedidos_bodega_central.create": async (input) => {
    const { data, error } = await supabase.from("pedidos_bodega_central").insert(input as any).select().single();
    if (error) throw error;
    return data;
  },
  "pedidos_bodega_central.update": async (input) => {
    const { id, data: updateData } = input as any;
    const { data, error } = await supabase.from("pedidos_bodega_central").update(updateData).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  "pedidos_bodega_central.search": async (input) => {
    const { incidente_id, estado } = input || {};
    let query = supabase.from("pedidos_bodega_central").select("*");
    if (incidente_id) query = query.eq("incidente_id", incidente_id);
    if (estado) query = query.eq("estado", estado);
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    return { results: data || [] };
  },
};

// =============================================================================
// DIAGNOSTICOS CRUD HANDLERS (implementar los que faltan)
// =============================================================================
const diagnosticosWriteHandlers: Record<string, ActionHandler<any>> = {
  "diagnosticos.create": async (input) => {
    const { data, error } = await supabase.from("diagnosticos").insert(input as any).select().single();
    if (error) throw error;
    return data;
  },
  "diagnosticos.update": async (input) => {
    const { id, data: updateData } = input as any;
    const { data, error } = await supabase.from("diagnosticos").update({ ...updateData, updated_at: new Date().toISOString() }).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  "diagnosticos.delete": async (input) => {
    const { error } = await supabase.from("diagnosticos").delete().eq("id", input.id);
    if (error) throw error;
    return { status: "deleted", id: input.id };
  },
};

// =============================================================================
// GUIAS HANDLERS
// =============================================================================
const guiasHandlers: Record<string, ActionHandler<any>> = {
  "guias.list": async (input) => {
    const { skip = 0, limit = 100 } = input || {};
    const { data, error } = await supabase.from("guias").select("*").range(skip, skip + limit - 1).order("fecha_guia", { ascending: false });
    if (error) throw error;
    return { results: data || [] };
  },
  "guias.get": async (input) => {
    const { data, error } = await supabase.from("guias").select("*").eq("id", input.id).maybeSingle();
    if (error) throw error;
    return { result: data };
  },
  "guias.create": async (input) => {
    const { data, error } = await supabase.from("guias").insert(input as any).select().single();
    if (error) throw error;
    return data;
  },
  "guias.update": async (input) => {
    const { id, data: updateData } = input as any;
    const { data, error } = await supabase.from("guias").update(updateData).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
};

// =============================================================================
// SOLICITUDES REPUESTOS EXTENDED HANDLERS
// =============================================================================
const solicitudesRepuestosExtendedHandlers: Record<string, ActionHandler<any>> = {
  "solicitudes_repuestos.update": async (input) => {
    const { id, data: updateData } = input as any;
    const { data, error } = await supabase.from("solicitudes_repuestos").update(updateData).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  "solicitudes_repuestos.search": async (input) => {
    const { incidente_id, estado } = input || {};
    let query = supabase.from("solicitudes_repuestos").select("*");
    if (incidente_id) query = query.eq("incidente_id", incidente_id);
    if (estado) query = query.eq("estado", estado);
    const { data, error } = await query.order("updated_at", { ascending: true });
    if (error) throw error;
    return { results: data || [] };
  },
  "solicitudes_repuestos.create": async (input) => {
    const { data, error } = await supabase.from("solicitudes_repuestos").insert(input as any).select().single();
    if (error) throw error;
    return data;
  },
};

// =============================================================================
// INVENTARIO HANDLERS
// =============================================================================
const inventarioGeneralHandlers: Record<string, ActionHandler<any>> = {
  "inventario.list": async (input) => {
    const { centro_servicio_id } = input || {};
    let query = (supabase as any).from("inventario").select("*");
    if (centro_servicio_id) query = query.eq("centro_servicio_id", centro_servicio_id);
    const { data, error } = await query;
    if (error) throw error;
    return { results: data || [] };
  },
};

// =============================================================================
// CDS TABLES HANDLERS (CDS_Fallas, CDS_Causas, CDS_Familias)
// =============================================================================
const cdsHandlers: Record<string, ActionHandler<any>> = {
  "cds_fallas.list": async () => {
    const { data, error } = await supabase.from("fallas").select("id, nombre, familia_id").order("nombre");
    if (error) throw error;
    return { results: data || [] };
  },
  "cds_causas.list": async () => {
    const { data, error } = await supabase.from("causas").select("id, nombre, familia_id").order("nombre");
    if (error) throw error;
    return { results: data || [] };
  },
  "cds_familias.list": async () => {
    const { data, error } = await supabase.from("familias_producto").select("id, nombre, parent_id");
    if (error) throw error;
    // Map to expected format for compatibility
    return { results: (data || []).map((f: any) => ({ id: f.id, Categoria: f.nombre, Padre: f.parent_id })) };
  },
};

// =============================================================================
// REPUESTOS EXTENDED HANDLERS
// =============================================================================
const repuestosExtendedHandlers: Record<string, ActionHandler<any>> = {
  "repuestos.listByProducto": async (input) => {
    const { codigo_producto } = input as any;
    const { data, error } = await supabase.from("repuestos").select("*").eq("codigo_producto", codigo_producto).order("descripcion");
    if (error) throw error;
    return { results: data || [] };
  },
};

// =============================================================================
// INVENTARIOS EXTENDED HANDLERS
// =============================================================================
const inventariosExtendedHandlers: Record<string, ActionHandler<any>> = {
  "inventarios.listByCodigos": async (input) => {
    const { centro_servicio_id, codigos } = input as any;
    if (!codigos?.length) return { results: [] };
    const { data, error } = await supabase
      .from("inventario")
      .select("codigo_repuesto, cantidad, ubicacion_legacy")
      .eq("centro_servicio_id", centro_servicio_id)
      .in("codigo_repuesto", codigos);
    if (error) throw error;
    return { results: data || [] };
  },
};

// =============================================================================
// PRODUCTOS EXTENDED HANDLERS
// =============================================================================
const productosExtendedHandlers: Record<string, ActionHandler<any>> = {
  "productos.listAlternativos": async (input) => {
    const { exclude_familia_id, descontinuado = false } = input as any;
    let query = (supabase as any).from("productos").select("*, familia_padre:CDS_Familias!productos_familia_padre_id_fkey(id, Categoria, Padre)").eq("descontinuado", descontinuado);
    if (exclude_familia_id) query = query.neq("familia_padre_id", exclude_familia_id);
    const { data, error } = await query.order("descripcion");
    if (error) throw error;
    return { results: data || [] };
  },
};

// =============================================================================
// HANDLERS MAP
// =============================================================================
// AUTH HANDLERS
// =============================================================================
const authHandlers: Record<string, ActionHandler<any>> = {
  "auth.login": async (input) => {
    const { email, password } = input;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return { success: true, message: "Login exitoso" };
  },
  "auth.logout": async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  },
  "auth.getSession": async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return { session: data.session };
  },
  "auth.getUser": async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return { user: data.user };
  },
  "auth.me": async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return { result: null };
    
    const { data, error } = await supabase
      .from("usuarios")
      .select(`
        id, nombre, apellido, email, telefono, activo,
        centro_de_servicio_id, empresa_id, cliente_id,
        centro_de_servicio:centros_de_servicio(id, nombre, codigo),
        usuario_roles(
          rol:roles(id, nombre, slug)
        )
      `)
      .eq("email", user.email)
      .maybeSingle();
    
    if (error) throw error;
    
    const roles = data?.usuario_roles?.map((ur: any) => ur.rol) || [];
    return { result: data ? { ...data, roles } : null };
  },
};

// =============================================================================
// STORAGE HANDLERS
// =============================================================================
const storageHandlers: Record<string, ActionHandler<any>> = {
  "storage.upload": async (input) => {
    const { bucket, path, file, options } = input;
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, options);
    
    if (error) throw error;
    
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);
    
    return { url: urlData.publicUrl, storage_path: data.path };
  },
  "storage.delete": async (input) => {
    const { bucket, paths } = input;
    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (error) throw error;
    return { success: true };
  },
  "storage.getPublicUrl": async (input) => {
    const { bucket, path } = input;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return { publicUrl: data.publicUrl };
  },
};

// =============================================================================
// RPC HANDLERS
// =============================================================================
const rpcHandlers: Record<string, ActionHandler<any>> = {
  "rpc.generarCodigoIncidente": async () => {
    const { data, error } = await supabase.rpc("generar_codigo_incidente");
    if (error) throw error;
    return { codigo: data };
  },
  "rpc.generarNumeroGuia": async () => {
    // Generate guide number based on max existing HPC-* number
    const { data } = await supabase
      .from("guias")
      .select("numero_guia")
      .like("numero_guia", "HPC-%")
      .order("id", { ascending: false })
      .limit(1);

    let nextNumber = 1;
    if (data && data.length > 0 && data[0].numero_guia) {
      const match = data[0].numero_guia.match(/HPC-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    return { numero: `HPC-${String(nextNumber).padStart(8, "0")}` };
  },
};

// =============================================================================
// DIRECCIONES HANDLERS
// =============================================================================
const direccionesHandlers: Record<string, ActionHandler<any>> = {
  "direcciones.get": async (input) => {
    const { data, error } = await supabase
      .from("direcciones")
      .select("*")
      .eq("id", input.id)
      .maybeSingle();
    if (error) throw error;
    return { result: data };
  },
};

// =============================================================================
// GUIAS EXTENDED HANDLERS
// =============================================================================
const guiasExtendedHandlers: Record<string, ActionHandler<any>> = {
  "guias.create": async (input) => {
    const { data, error } = await supabase
      .from("guias")
      .insert(input as any)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  "guias.getMaxNumero": async (input) => {
    const { prefix } = input as { prefix: string };
    const { data } = await supabase
      .from("guias")
      .select("numero_guia")
      .like("numero_guia", `${prefix}%`)
      .order("id", { ascending: false })
      .limit(1);
    return { numero: data?.[0]?.numero_guia || null };
  },
};

//
const handlers: Partial<Record<ActionName, ActionHandler<any>>> = {
  ...clientesHandlers,
  ...productosHandlers,
  ...incidentesHandlers,
  // ...simpleHandlers,
  ...mostradorHandlers,
  ...calidadHandlers,
  ...garantiasHandlers,
  ...sacHandlers,
  ...notificacionesHandlers,
  ...solicitudesCambioHandlers,
  ...incidenteTecnicoHandlers,
  ...diagnosticoAsociacionesHandlers,
  ...usuariosExtendedHandlers,
  ...transitosExtendedHandlers,
  ...centrosSupervisorHandlers,
  ...solicitudesTransferenciaHandlers,
  ...userRolesHandlers,
  ...repuestosRelacionesHandlers,
  ...configuracionFifoHandlers,
  ...mediaHandlers,
  ...pedidosBodegaExtendedHandlers,
  ...diagnosticosWriteHandlers,
  ...guiasHandlers,
  ...solicitudesRepuestosExtendedHandlers,
  ...inventarioGeneralHandlers,
  ...cdsHandlers,
  ...repuestosExtendedHandlers,
  ...inventariosExtendedHandlers,
  ...productosExtendedHandlers,
  ...authHandlers,
  ...storageHandlers,
  ...rpcHandlers,
  ...direccionesHandlers,
  ...guiasExtendedHandlers,
};

// =============================================================================
// MAIN FUNCTION
// =============================================================================
export async function apiBackendAction<K extends ActionName>(
  action: K,
  input: ActionRegistry[K]["input"],
): Promise<ActionRegistry[K]["output"]> {
  const handler = handlers[action];
  if (!handler) throw new Error(`Unknown action: ${action}`);
  return handler(input);
}
