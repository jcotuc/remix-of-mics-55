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
  "incidentes.create": async (input) => {
    const { data, error } = await supabase.from("incidentes").insert(input as any).select().single();
    if (error) throw error;
    return data;
  },
  "incidentes.update": async (input) => {
    const { id, data: updateData } = input as any;
    const { data, error } = await supabase.from("incidentes").update(updateData).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  "incidentes.delete": async (input) => {
    const { error } = await supabase.from("incidentes").delete().eq("id", input.id);
    if (error) throw error;
    return { status: "deleted", id: input.id };
  },
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
  "diagnosticos.list": async (input) => { 
    const { skip = 0, limit = 100 } = input as any; 
    const { data, error } = await supabase.from("diagnosticos").select("*").range(skip, skip + limit - 1).order("created_at", { ascending: false }); 
    if (error) throw error; 
    return { results: data || [], total: data?.length || 0 }; 
  },
  "diagnosticos.get": async (input) => { 
    const { data, error } = await supabase.from("diagnosticos").select("*").eq("id", input.id).maybeSingle(); 
    if (error) throw error; 
    return { result: data }; 
  },
  "diagnosticos.create": async (input) => {
    const { data, error } = await supabase.from("diagnosticos").insert(input as any).select().single();
    if (error) throw error;
    return { id: data.id, ...data };
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
  "grupos_cola_fifo.list": async (input) => { 
    const { centro_servicio_id } = (input || {}) as any;
    let query = supabase.from("grupos_cola_fifo").select("*").order("orden"); 
    if (centro_servicio_id) query = query.eq("centro_servicio_id", centro_servicio_id);
    const { data, error } = await query; 
    if (error) throw error; 
    return { results: data || [], total: data?.length || 0 }; 
  },
  "grupos_cola_fifo.get": async (input) => { const { data, error } = await supabase.from("grupos_cola_fifo").select("*").eq("id", input.id).maybeSingle(); if (error) throw error; return { result: data }; },
  "grupos_cola_fifo.create": async (input) => { const { data, error } = await supabase.from("grupos_cola_fifo").insert(input as any).select().single(); if (error) throw error; return data; },
  "grupos_cola_fifo.update": async (input) => { const { id, data: updateData } = input as any; const { data, error } = await supabase.from("grupos_cola_fifo").update(updateData).eq("id", id).select().single(); if (error) throw error; return data; },
  "grupos_cola_fifo.delete": async (input) => { const { error } = await supabase.from("grupos_cola_fifo").delete().eq("id", input.id); if (error) throw error; return { status: "deleted", id: input.id }; },
  "grupos_cola_fifo_familias.list": async (input) => { 
    const { grupo_id } = (input || {}) as any;
    let query = supabase.from("grupos_cola_fifo_familias").select("*"); 
    if (grupo_id) query = query.eq("grupo_id", grupo_id);
    const { data, error } = await query; 
    if (error) throw error; 
    return { results: data || [], total: data?.length || 0 }; 
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
    const { incidente_codigo, estado, limit = 50 } = input as any;
    let query = supabase.from("guias").select("*");
    if (incidente_codigo) query = query.contains("incidentes_codigos", [incidente_codigo]);
    if (estado) query = query.eq("estado", estado);
    const { data, error } = await query.order("fecha_guia", { ascending: false }).limit(limit);
    if (error) throw error;
    return { results: data || [] };
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
    const { data, error } = await supabase.from("diagnostico_fallas").select("*").eq("diagnostico_id", diagnostico_id);
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
    const { data, error } = await supabase.from("diagnostico_causas").select("*").eq("diagnostico_id", diagnostico_id);
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
    const { search, rol, email } = input || {};
    let query = (supabase as any).from("usuarios").select("*");
    if (search) query = query.or(`nombre.ilike.%${search}%,apellido.ilike.%${search}%,email.ilike.%${search}%`);
    if (rol) query = query.eq("rol", rol);
    if (email) query = query.eq("email", email);
    const { data, error } = await query.order("nombre");
    if (error) throw error;
    return { results: data || [] };
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
const handlers: Partial<Record<ActionName, ActionHandler<any>>> = {
  ...clientesHandlers,
  ...productosHandlers,
  ...incidentesHandlers,
  ...simpleHandlers,
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
