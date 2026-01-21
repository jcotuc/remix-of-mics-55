// API Backend utilities
// Typed backend action facade over Supabase operations

import { supabase } from "@/integrations/supabase/client";
import type { ActionRegistry, ActionName } from "./api-registry";

type ActionHandler<K extends ActionName> = (input: ActionRegistry[K]["input"]) => Promise<ActionRegistry[K]["output"]>;

const notImplemented = (action: string) => async () => {
  throw new Error(`Action "${action}" is not implemented yet`);
};

// =============================================================================
// CLIENTES HANDLERS
// =============================================================================
const clientesHandlers: Record<string, ActionHandler<any>> = {
  "clientes.list": async (input) => {
    const { skip = 0, limit = 50 } = input;
    const { data, error } = await supabase.from("clientes").select("*, direcciones(*)").range(skip, skip + limit - 1).order("created_at", { ascending: false });
    if (error) throw error;
    return { results: data || [] };
  },
  "clientes.get": async (input) => {
    const { data, error } = await supabase.from("clientes").select("*, direcciones(*)").eq("id", input.id).maybeSingle();
    if (error) throw error;
    return { result: data };
  },
  "clientes.create": async (input) => {
    const { data, error } = await supabase.from("clientes").insert(input as any).select("*, direcciones(*)").single();
    if (error) throw error;
    return data;
  },
  "clientes.update": async (input) => {
    const { id, data: updateData } = input as any;
    const { data, error } = await supabase.from("clientes").update(updateData).eq("id", id).select("*, direcciones(*)").single();
    if (error) throw error;
    return data;
  },
  "clientes.delete": async (input) => {
    const { error } = await supabase.from("clientes").delete().eq("id", input.id);
    if (error) throw error;
    return { status: "deleted", id: input.id };
  },
  "clientes.search": async (input) => {
    const { search = "", limit = 20 } = input;
    let query = supabase.from("clientes").select("id, codigo, nombre, nit").limit(limit);
    if (search) query = query.or(`nombre.ilike.%${search}%,codigo.ilike.%${search}%,nit.ilike.%${search}%`);
    const { data, error } = await query;
    if (error) throw error;
    return { results: data || [] };
  },
};

// =============================================================================
// PRODUCTOS HANDLERS
// =============================================================================
const productosHandlers: Record<string, ActionHandler<any>> = {
  "productos.list": async (input) => {
    const { skip = 0, limit = 50 } = input;
    const { data, error } = await supabase.from("productos").select("*").range(skip, skip + limit - 1).order("created_at", { ascending: false });
    if (error) throw error;
    return { results: data || [], total: data?.length || 0 };
  },
  "productos.get": async (input) => {
    const { data, error } = await supabase.from("productos").select("*").eq("id", input.id).maybeSingle();
    if (error) throw error;
    return { result: data };
  },
  "productos.create": notImplemented("productos.create"),
  "productos.update": notImplemented("productos.update"),
  "productos.delete": notImplemented("productos.delete"),
  "productos.search": async (input) => {
    const { search = "", limit = 20 } = input;
    let query = supabase.from("productos").select("id, codigo, descripcion, sku, marca, modelo").limit(limit);
    if (search) query = query.or(`codigo.ilike.%${search}%,descripcion.ilike.%${search}%,sku.ilike.%${search}%`);
    const { data, error } = await query;
    if (error) throw error;
    return { results: data || [] };
  },
};

// =============================================================================
// INCIDENTES HANDLERS
// =============================================================================
const incidentesHandlers: Record<string, ActionHandler<any>> = {
  "incidentes.list": async (input) => {
    const { skip = 0, limit = 100 } = input;
    const { data, error } = await supabase.from("incidentes").select(`*, clientes:cliente_id (*), productos:producto_id (*), centros_de_servicio:centro_de_servicio_id (*)`).range(skip, skip + limit - 1).order("created_at", { ascending: false });
    if (error) throw error;
    const results = (data || []).map((row) => ({
      id: row.id,
      codigo: row.codigo,
      estado: row.estado,
      tipologia: row.tipologia,
      descripcion_problema: row.descripcion_problema,
      centro_de_servicio_id: row.centro_de_servicio_id,
      centro_de_servicio: row.centros_de_servicio,
      cliente: row.clientes,
      propietario: null,
      producto: row.productos,
      tracking_token: row.tracking_token,
      incidente_origen_id: row.incidente_origen_id,
      quiere_envio: row.quiere_envio,
      aplica_garantia: row.aplica_garantia,
      tipo_resolucion: row.tipo_resolucion,
      observaciones: row.observaciones,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
    return { results };
  },
  "incidentes.get": async (input) => {
    const { data, error } = await supabase.from("incidentes").select(`*, clientes:cliente_id (*), productos:producto_id (*), centros_de_servicio:centro_de_servicio_id (*)`).eq("id", input.id).maybeSingle();
    if (error) throw error;
    if (!data) return { result: null };
    return { result: { id: data.id, codigo: data.codigo, estado: data.estado, tipologia: data.tipologia, descripcion_problema: data.descripcion_problema, centro_de_servicio_id: data.centro_de_servicio_id, centro_de_servicio: data.centros_de_servicio, cliente: data.clientes, propietario: null, producto: data.productos, tracking_token: data.tracking_token, incidente_origen_id: data.incidente_origen_id, quiere_envio: data.quiere_envio, aplica_garantia: data.aplica_garantia, tipo_resolucion: data.tipo_resolucion, observaciones: data.observaciones, created_at: data.created_at, updated_at: data.updated_at } };
  },
  "incidentes.create": notImplemented("incidentes.create"),
  "incidentes.update": notImplemented("incidentes.update"),
  "incidentes.delete": notImplemented("incidentes.delete"),
  "incidentes.search": async (input) => {
    const { search = "", limit = 20 } = input;
    let query = supabase.from("incidentes").select("id, codigo, estado, tipologia, created_at").limit(limit);
    if (search) query = query.or(`codigo.ilike.%${search}%`);
    const { data, error } = await query;
    if (error) throw error;
    return { results: data || [] };
  },
};

// =============================================================================
// SIMPLE LIST HANDLERS (read-only)
// =============================================================================
const simpleHandlers: Record<string, ActionHandler<any>> = {
  "diagnosticos.list": async () => { const { data, error } = await supabase.from("diagnosticos").select("*").order("created_at", { ascending: false }); if (error) throw error; return { results: data || [], total: data?.length || 0 }; },
  "diagnosticos.get": async (input) => { const { data, error } = await supabase.from("diagnosticos").select("*").eq("id", input.id).maybeSingle(); if (error) throw error; return { result: data }; },
  "diagnosticos.create": notImplemented("diagnosticos.create"),
  "diagnosticos.update": notImplemented("diagnosticos.update"),
  "diagnosticos.delete": notImplemented("diagnosticos.delete"),
  "diagnosticos.search": notImplemented("diagnosticos.search"),
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
  "ubicaciones.list": async () => { const { data, error } = await supabase.from("ubicaciones").select("*").order("codigo"); if (error) throw error; return { data: data || [], count: data?.length || 0 }; },
  "ubicaciones.get": async (input) => { const { data, error } = await supabase.from("ubicaciones").select("*").eq("id", input.id).maybeSingle(); if (error) throw error; return { result: data }; },
  "ubicaciones.create": notImplemented("ubicaciones.create"),
  "ubicaciones.update": notImplemented("ubicaciones.update"),
  "ubicaciones.delete": notImplemented("ubicaciones.delete"),
  "transitos_bodega.list": async () => { const { data, error } = await supabase.from("transitos_bodega").select("*").order("fecha_envio", { ascending: false }); if (error) throw error; return { data: data || [], count: data?.length || 0 }; },
  "transitos_bodega.get": async (input) => { const { data, error } = await supabase.from("transitos_bodega").select("*").eq("id", input.id).maybeSingle(); if (error) throw error; return { result: data }; },
  "transitos_bodega.create": notImplemented("transitos_bodega.create"),
  "transitos_bodega.update": notImplemented("transitos_bodega.update"),
  "transitos_bodega.delete": notImplemented("transitos_bodega.delete"),
  "usuarios.list": async () => { const { data, error } = await supabase.from("usuarios").select("*").order("nombre"); if (error) throw error; return { results: data || [], total: data?.length || 0 }; },
  "roles.list": async () => { const { data, error } = await supabase.from("roles").select("*").order("nombre"); if (error) throw error; return { items: data || [] }; },
  "fallas.list": async () => { const { data, error } = await supabase.from("fallas").select("*").order("nombre"); if (error) throw error; return { results: data || [], total: data?.length || 0 }; },
  "causas.list": async () => { const { data, error } = await supabase.from("causas").select("*").order("nombre"); if (error) throw error; return { results: data || [], total: data?.length || 0 }; },
  "accesorios.list": async () => { const { data, error } = await supabase.from("accesorios").select("*").order("nombre"); if (error) throw error; return { results: data || [], total: data?.length || 0 }; },
  "accesorios.create": notImplemented("accesorios.create"),
  "guias.list": async () => { const { data, error } = await supabase.from("guias").select("*").order("created_at", { ascending: false }); if (error) throw error; return { results: data || [], total: data?.length || 0 }; },
  "presupuestos.list": async (input) => { const incidente_id = (input as any).incidente_id; let query = supabase.from("presupuestos").select("*"); if (incidente_id) query = query.eq("incidente_id", incidente_id); const { data, error } = await query.order("created_at", { ascending: false }); if (error) throw error; return { data: data || [], count: data?.length || 0 }; },
  "presupuestos.get": async (input) => { const { data, error } = await supabase.from("presupuestos").select("*").eq("id", input.id).maybeSingle(); if (error) throw error; return data; },
  "presupuestos.create": notImplemented("presupuestos.create"),
  "presupuestos.update": notImplemented("presupuestos.update"),
  "presupuestos.delete": notImplemented("presupuestos.delete"),
  "familias_producto.list": async () => { const { data, error } = await supabase.from("familias_producto").select("id, nombre, parent_id, created_at").is("parent_id", null).order("nombre"); if (error) throw error; return { results: data || [], total: data?.length || 0 }; },
  "centros_de_servicio.list": async () => { const { data, error } = await supabase.from("centros_de_servicio").select("*").eq("activo", true).order("nombre"); if (error) throw error; return { items: data || [] }; },
  "grupos_cola_fifo.list": async () => { const { data, error } = await supabase.from("grupos_cola_fifo").select("*").order("orden"); if (error) throw error; return { results: data || [], total: data?.length || 0 }; },
  "grupos_cola_fifo.get": async (input) => { const { data, error } = await supabase.from("grupos_cola_fifo").select("*").eq("id", input.id).maybeSingle(); if (error) throw error; return { result: data }; },
  "grupos_cola_fifo.create": async (input) => { const { data, error } = await supabase.from("grupos_cola_fifo").insert(input as any).select().single(); if (error) throw error; return data; },
  "grupos_cola_fifo.update": async (input) => { const { id, data: updateData } = input as any; const { data, error } = await supabase.from("grupos_cola_fifo").update(updateData).eq("id", id).select().single(); if (error) throw error; return data; },
  "grupos_cola_fifo.delete": async (input) => { const { error } = await supabase.from("grupos_cola_fifo").delete().eq("id", input.id); if (error) throw error; return { status: "deleted", id: input.id }; },
  "grupos_cola_fifo_familias.list": async () => { const { data, error } = await supabase.from("grupos_cola_fifo_familias").select("*"); if (error) throw error; return { results: data || [], total: data?.length || 0 }; },
  "grupos_cola_fifo_familias.get": async (input) => { const { data, error } = await supabase.from("grupos_cola_fifo_familias").select("*").eq("id", input.id).maybeSingle(); if (error) throw error; return { result: data }; },
  "grupos_cola_fifo_familias.create": async (input) => { const { data, error } = await supabase.from("grupos_cola_fifo_familias").insert(input as any).select().single(); if (error) throw error; return data; },
  "grupos_cola_fifo_familias.update": async (input) => { const { id, data: updateData } = input as any; const { data, error } = await supabase.from("grupos_cola_fifo_familias").update(updateData).eq("id", id).select().single(); if (error) throw error; return data; },
  "grupos_cola_fifo_familias.delete": async (input) => { const { error } = await supabase.from("grupos_cola_fifo_familias").delete().eq("id", input.id); if (error) throw error; return { status: "deleted", id: input.id }; },
};

// =============================================================================
// HANDLERS MAP
// =============================================================================
const handlers: Partial<Record<ActionName, ActionHandler<any>>> = {
  ...clientesHandlers,
  ...productosHandlers,
  ...incidentesHandlers,
  ...simpleHandlers,
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
