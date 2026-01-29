// API Backend utilities
// Typed backend action facade over Supabase operations

import type { ActionRegistry, ActionName } from "./api-registry";
import { list } from "../infra/list";
import type { AuthenticatedUser } from "./types";
import { API_BASE_URL } from "@/config/api";



// import { supabase } from "@/lib/supabase";



type ActionHandler<K extends ActionName> = (input: ActionRegistry[K]["input"]) => Promise<ActionRegistry[K]["output"]>;

const notImplemented = (action: string) => async () => {
  throw new Error(`Action "${action}" is not implemented yet`);
};

// Generic fetch utility that includes credentials
export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, credentials: 'include' });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || response.statusText);
  }

  return response.json();
}

const ordenesHandlers: Record<string, ActionHandler<any>> = {
  "ordenes.notify": async (input) => {
    const { order_id, message } = input;
    const url = `${API_BASE_URL}/api/v1/ordenes/${order_id}/notify`;
    await apiFetch<any>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    return { success: true };
  },
};

// =============================================================================
// CLIENTES HANDLERS
// =============================================================================
const clientesHandlers: Record<string, ActionHandler<any>> = {
  "clientes.list": (input) =>
    list<any>("clientes", input),
  "clientes.get": async (input) => {
    const url = `${API_BASE_URL}/api/v1/clientes/${input.id}`;
    const response = await apiFetch<any>(url);
    return { result: response };
  },
  "clientes.create": async (input) => {
    const url = `${API_BASE_URL}/api/v1/clientes/`;
    const response = await apiFetch<any>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return { result: response };
  },
  "clientes.update": async (input) => {
    const { id, data: updateData } = input as any;
    const url = `${API_BASE_URL}/api/v1/clientes/${id}`;
    const response = await apiFetch<any>(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    return { result: response };
  },
  "clientes.delete": async (input) => {
    const url = `${API_BASE_URL}/api/v1/clientes/${input.id}`;
    await apiFetch<any>(url, {
      method: 'DELETE',
    });
    return { status: "deleted", id: input.id };
  },
  "clientes.search": (input) =>
    list<any>("clientes", input),
  "clientes.getByCodigo": notImplemented("clientes.getByCodigo"), // This action is not directly in SDK, requires a custom search
};

// =============================================================================
// PRODUCTOS HANDLERS
// =============================================================================
const productosHandlers: Record<string, ActionHandler<any>> = {
  "productos.list": (input) =>
    list<any>("productos", input),
  "productos.get": async (input) => {
    const url = `${API_BASE_URL}/api/v1/productos/${input.id}`;
    const response = await apiFetch<any>(url);
    return { result: response };
  },
  "productos.create": async (input) => {
    const url = `${API_BASE_URL}/api/v1/productos/`;
    const response = await apiFetch<any>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return { result: response };
  },
  "productos.update": async (input) => {
    const { id, ...updateData } = input as any;
    const url = `${API_BASE_URL}/api/v1/productos/${id}`;
    const response = await apiFetch<any>(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    return { result: response };
  },
  "productos.delete": async (input) => {
    const url = `${API_BASE_URL}/api/v1/productos/${input.id}`;
    await apiFetch<any>(url, {
      method: 'DELETE',
    });
    return { status: "deleted", id: input.id };
  },
  "productos.search": (input) =>
    list<any>("productos", { ...input, search: input.search }),
  "productos.getByCodigo": async (input) => {
    const { codigo } = input;
    const url = `${API_BASE_URL}/api/v1/productos/?codigo=${codigo}`;
    const response = await apiFetch<any>(url);
    // Assuming the backend returns a list, and we need the first one
    return { result: response.results && response.results.length > 0 ? response.results[0] : null };
  },
  "productos.listAlternativos": async (input) => {
    const { exclude_familia_id, descontinuado = false } = input as any;
    let url = `${API_BASE_URL}/api/v1/productos/?descontinuado=${descontinuado}`;
    if (exclude_familia_id) {
      url += `&exclude_familia_id=${exclude_familia_id}`;
    }
    const response = await apiFetch<any>(url);
    return { results: response.results };
  },
};

// =============================================================================
// INCIDENTES HANDLERS
// =============================================================================

// =============================================================================
// CENTROS DE SERVICIO HANDLERS
// =============================================================================
const centrosDeServicioHandlers: Record<string, ActionHandler<any>> = {
  "centros_de_servicio.list": async (input) => {
    const { results, total } = await list<any>("centros-de-servicio", input);
    return { items: results, total };
  },
  "centros_de_servicio.get": async (input) => {
    const url = `${API_BASE_URL}/api/v1/centros-de-servicio/${input.id}`;
    const response = await apiFetch<any>(url);
    return { result: response };
  },
};

const incidentesHandlers: Record<string, ActionHandler<any>> = {
  "incidentes.list": (input) =>
    list<any>("incidentes", input),
  "incidentes.get": async (input) => {
    const url = `${API_BASE_URL}/api/v1/incidentes/${input.id}`;
    const response = await apiFetch<any>(url);
    return { result: response };
  },
  "incidentes.create": async (input) => {
    const url = `${API_BASE_URL}/api/v1/incidentes/`;
    const response = await apiFetch<any>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return { result: response };
  },
  "incidentes.update": async (input) => {
    const { id, ...updateData } = input as any;
    const url = `${API_BASE_URL}/api/v1/incidentes/${id}`;
    const response = await apiFetch<any>(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    return { result: response };
  },
  "incidentes.delete": async (input) => {
    const url = `${API_BASE_URL}/api/v1/incidentes/${input.id}`;
    await apiFetch<any>(url, {
      method: 'DELETE',
    });
    return { status: "deleted", id: input.id };
  },
  "incidentes.listMyAssigned": (input) =>
    list<any>("incidentes/mis-asignaciones", input),
  "incidentes.search": async (input) => {
    const { search, limit = 50 } = input as any;
    const { results } = await list<any>("incidentes", { q: search, limit });
    return { results: results || [] };
  },
};

// =============================================================================
// AUDITORIA HANDLERS (preguntas, respuestas)
// =============================================================================
const auditoriaHandlers: Record<string, ActionHandler<any>> = {
  "preguntas_auditoria.list": async (input) => {
    const { seccion, activo, familia_producto_id } = input as any;
    const params: Record<string, any> = {};
    if (seccion) params.seccion = seccion;
    if (activo !== undefined) params.activo = activo;
    if (familia_producto_id) params.familia_producto_id = familia_producto_id;
    const { results } = await list<any>("preguntas-auditoria", params);
    return { results: results || [] };
  },
  "auditoria_respuestas.createBatch": async (input) => {
    const url = `${API_BASE_URL}/api/v1/auditoria-respuestas/batch`;
    return apiFetch<any>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },
};

// =============================================================================
// VERIFICACIONES REINCIDENCIA HANDLERS
// =============================================================================
const verificacionesReincidenciaHandlers: Record<string, ActionHandler<any>> = {
  "verificaciones_reincidencia.getByIncidente": async (input) => {
    const { incidente_id } = input as any;
    const { results } = await list<any>("verificaciones-reincidencia", { incidente_id });
    return { result: results && results.length > 0 ? results[0] : null };
  },
  "verificaciones_reincidencia.create": async (input) => {
    const url = `${API_BASE_URL}/api/v1/verificaciones-reincidencia/`;
    return apiFetch<any>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },
};

// =============================================================================
// SIMPLE LIST HANDLERS (read-only)
// =============================================================================
const diagnosticosHandlers: Record<string, ActionHandler<any>> = {
  "diagnosticos.list": (input) => {
    const { incidente_id, ...rest } = input as any;
    if (!incidente_id) throw new Error("An incidente_id is required to list diagnosticos.");
    return list<any>(`incidentes/${incidente_id}/diagnosticos`, rest);
  },
  "diagnosticos.get": async (input) => {
    const { incidente_id, id } = input as any;
    if (!incidente_id) throw new Error("An incidente_id is required to get a diagnostico.");
    const url = `${API_BASE_URL}/api/v1/incidentes/${incidente_id}/diagnosticos/${id}`;
    const response = await apiFetch<any>(url);
    return { result: response };
  },
  "diagnosticos.create": async (input) => {
    const { incidente_id, ...createData } = input as any;
    if (!incidente_id) throw new Error("An incidente_id is required to create a diagnostico.");
    const url = `${API_BASE_URL}/api/v1/incidentes/${incidente_id}/diagnosticos/`;
    const response = await apiFetch<any>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createData),
    });
    return { result: response };
  },
  "diagnosticos.update": async (input) => {
    const { incidente_id, id, data: updateData } = input as any;
    if (!incidente_id) throw new Error("An incidente_id is required to update a diagnostico.");
    const url = `${API_BASE_URL}/api/v1/incidentes/${incidente_id}/diagnosticos/${id}`;
    const response = await apiFetch<any>(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updateData, updated_at: new Date().toISOString() }),
    });
    return { result: response };
  },
  "diagnosticos.delete": async (input) => {
    const { incidente_id, id } = input as any;
    if (!incidente_id) throw new Error("An incidente_id is required to delete a diagnostico.");
    const url = `${API_BASE_URL}/api/v1/incidentes/${incidente_id}/diagnosticos/${id}`;
    await apiFetch<any>(url, {
      method: 'DELETE',
    });
    return { status: "deleted", id: id };
  },
    "diagnosticos.search": (input) =>
      list<any>("diagnosticos/search", input),  "repuestos.list": (input) =>
    list<any>("repuestos", input),
  "repuestos.get": async (input) => {
    const url = `${API_BASE_URL}/api/v1/repuestos/${input.id}`;
    const response = await apiFetch<any>(url);
    return { result: response };
  },
  "repuestos.create": notImplemented("repuestos.create"),
  "repuestos.update": notImplemented("repuestos.update"),
  "repuestos.delete": notImplemented("repuestos.delete"),
  "repuestos.search": (input) =>
    list<any>("repuestos/search", input),
  "bodegas.list": (input) =>
    list<any>("bodegas", input),
  "bodegas.get": async (input) => {
    const url = `${API_BASE_URL}/api/v1/bodegas/${input.id}`;
    const response = await apiFetch<any>(url);
    return { result: response };
  },
  "bodegas.create": notImplemented("bodegas.create"),
  "bodegas.update": notImplemented("bodegas.update"),
  "bodegas.delete": notImplemented("bodegas.delete"),
  "inventarios.list": (input) => {
    const { offset, ...rest } = input as any;
    return list<any>("inventarios", { skip: offset, ...rest });
  },
  "inventarios.get": async (input) => {
    const url = `${API_BASE_URL}/api/v1/inventarios/${input.id}`;
    const response = await apiFetch<any>(url);
    return { result: response };
  },
  "inventarios.create": notImplemented("inventarios.create"),
  "inventarios.update": notImplemented("inventarios.update"),
  "inventarios.delete": notImplemented("inventarios.delete"),
  "movimientos_inventario.list": (input) => {
    const { offset, ...rest } = input as any;
    return list<any>("movimientos-inventario", { skip: offset, ...rest });
  },
  "movimientos_inventario.get": async (input) => {
    const url = `${API_BASE_URL}/api/v1/movimientos-inventario/${input.id}`;
    const response = await apiFetch<any>(url);
    return { result: response };
  },
  "movimientos_inventario.create": notImplemented("movimientos_inventario.create"),
  "solicitudes_repuestos.list": (input) =>
    list<any>("solicitudes-repuestos", input),
  "solicitudes_repuestos.get": async (input) => {
    const url = `${API_BASE_URL}/api/v1/solicitudes-repuestos/${input.id}`;
    const response = await apiFetch<any>(url);
    return { result: response };
  },
  "solicitudes_repuestos.create": notImplemented("solicitudes_repuestos.create"),
  "solicitudes_repuestos.update": notImplemented("solicitudes_repuestos.update"),
  "solicitudes_repuestos.delete": notImplemented("solicitudes_repuestos.delete"),
  "pedidos_bodega_central.list": (input) =>
    list<any>("pedidos-bodega-central", input),
  "pedidos_bodega_central.get": async (input) => {
    const url = `${API_BASE_URL}/api/v1/pedidos-bodega-central/${input.id}`;
    const response = await apiFetch<any>(url);
    return { result: response };
  },
  "pedidos_bodega_central.create": notImplemented("pedidos_bodega_central.create"),
  "pedidos_bodega_central.update": notImplemented("pedidos_bodega_central.update"),
  "pedidos_bodega_central.delete": notImplemented("pedidos_bodega_central.delete"),
  "embarques.list": (input) =>
    list<any>("embarques", input),
  "embarques.get": async (input) => {
    const url = `${API_BASE_URL}/api/v1/embarques/${input.id}`;
    const response = await apiFetch<any>(url);
    return { result: response };
  },
  "embarques.create": notImplemented("embarques.create"),
  "embarques.update": notImplemented("embarques.update"),
  "embarques.delete": notImplemented("embarques.delete"),
  "importaciones.list": (input) =>
    list<any>("importaciones", input),
  "importaciones.get": async (input) => {
    const url = `${API_BASE_URL}/api/v1/importaciones/${input.id}`;
    const response = await apiFetch<any>(url);
    return { result: response };
  },
  "importaciones.create": notImplemented("importaciones.create"),
  "importaciones.update": notImplemented("importaciones.update"),
  "importaciones.delete": notImplemented("importaciones.delete"),
  "ubicaciones.list": (input) =>
    list<any>("ubicaciones", input),
  "ubicaciones.get": async (input) => {
    const url = `${API_BASE_URL}/api/v1/ubicaciones/${input.id}`;
    const response = await apiFetch<any>(url);
    return { result: response };
  },
  "ubicaciones.create": notImplemented("ubicaciones.create"),
  "ubicaciones.update": notImplemented("ubicaciones.update"),
  "ubicaciones.delete": notImplemented("ubicaciones.delete"),
  "transitos_bodega.list": (input) =>
    list<any>("transitos-bodega", input),
  "transitos_bodega.get": async (input) => {
    const url = `${API_BASE_URL}/api/v1/transitos-bodega/${input.id}`;
    const response = await apiFetch<any>(url);
    return { result: response };
  },
  "transitos_bodega.create": notImplemented("transitos_bodega.create"),
  "transitos_bodega.update": notImplemented("transitos_bodega.update"),
  "transitos_bodega.delete": notImplemented("transitos_bodega.delete"),
  "usuarios.list": (input) =>
    list<any>("usuarios", input),
  "roles.list": async (input) => {
    // Note: The /api/v1/roles/ endpoint currently does not support filtering parameters in openapi.json.
    // Future backend updates could introduce a 'q' parameter for versatile searching.
    const url = `${API_BASE_URL}/api/v1/roles/`;
    const response = await apiFetch<any>(url);
    return { items: response };
  },
  "fallas.list": (input) =>
    list<any>("fallas", input),
  "causas.list": (input) =>
    list<any>("causas", input),
  "accesorios.list": (input) =>
    list<any>("accesorios", input),
  "accesorios.create": notImplemented("accesorios.create"),
  "guias.list": async (input) => {
    const { skip = 0, limit = 100, incidente_id, estado, centro_de_servicio_origen_id, centro_de_servicio_destino_id, search } = input || {};
    let url = `${API_BASE_URL}/api/v1/guias/?skip=${skip}&limit=${limit}`;
    const params = new URLSearchParams();
    if (incidente_id) params.append("incidente_id", incidente_id.toString());
    if (estado) params.append("estado", estado);
    if (centro_de_servicio_origen_id) params.append("centro_de_servicio_origen_id", centro_de_servicio_origen_id.toString());
    if (centro_de_servicio_destino_id) params.append("centro_de_servicio_destino_id", centro_de_servicio_destino_id.toString());
    if (search) params.append("q", search);
    if (params.toString()) {
      url += `&${params.toString()}`;
    }
    const response = await apiFetch<any>(url);
    return { results: response.results, total: response.total };
  },
  "presupuestos.list": (input) =>
    list<any>("presupuestos", input),
  "presupuestos.get": async (input) => {
    const url = `${API_BASE_URL}/api/v1/presupuestos/${input.id}`;
    const response = await apiFetch<any>(url);
    return { result: response };
  },
  "presupuestos.create": notImplemented("presupuestos.create"),
  "presupuestos.update": notImplemented("presupuestos.update"),
  "presupuestos.delete": notImplemented("presupuestos.delete"),
  "familias_producto.list": (input) =>
    list<any>("familias-producto/abuelos", input),
  "grupos_cola_fifo.get": async (input) => {
    const url = `${API_BASE_URL}/api/v1/grupos-cola-fifo/${input.id}`;
    const response = await apiFetch<any>(url);
    return { result: response };
  },
  "grupos_cola_fifo.create": async (input) => {
    const url = `${API_BASE_URL}/api/v1/grupos-cola-fifo/`;
    const response = await apiFetch<any>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return response;
  },
  "grupos_cola_fifo.update": async (input) => {
    const { id, data: updateData } = input as any;
    const url = `${API_BASE_URL}/api/v1/grupos-cola-fifo/${id}`;
    const response = await apiFetch<any>(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    return response;
  },
  "grupos_cola_fifo.delete": async (input) => {
    const url = `${API_BASE_URL}/api/v1/grupos-cola-fifo/${input.id}`;
    await apiFetch<any>(url, {
      method: 'DELETE',
    });
    return { status: "deleted", id: input.id };
  },
  "grupos_cola_fifo_familias.list": async (input) => {
    const { grupo_id, skip = 0, limit = 300 } = input || {};
    if (!grupo_id) throw new Error("A grupo_id is required to list grupo_cola_fifo_familias.");
    const params = new URLSearchParams({ skip: skip.toString(), limit: limit.toString() });
    const url = `${API_BASE_URL}/api/v1/grupos-cola-fifo/${grupo_id}/familias?${params.toString()}`;
    const response = await apiFetch<any>(url);
    return { results: response, total: response.length };
  },
  "grupos_cola_fifo_familias.get": async (input) => {
    const { grupo_id, id } = input;
    if (!grupo_id) throw new Error("A grupo_id is required to get a grupo_cola_fifo_familia.");
    const url = `${API_BASE_URL}/api/v1/grupos-cola-fifo/${grupo_id}/familias/${id}`;
    const response = await apiFetch<any>(url);
    return { result: response };
  },
  "grupos_cola_fifo_familias.create": async (input) => {
    const { grupo_id, ...createData } = input;
    if (!grupo_id) throw new Error("A grupo_id is required to create a grupo_cola_fifo_familia.");
    const url = `${API_BASE_URL}/api/v1/grupos-cola-fifo/${grupo_id}/familias`;
    const response = await apiFetch<any>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createData),
    });
    return response;
  },
  "grupos_cola_fifo_familias.update": async (input) => {
    const { grupo_id, id, data: updateData } = input;
    if (!grupo_id) throw new Error("A grupo_id is required to update a grupo_cola_fifo_familia.");
    const url = `${API_BASE_URL}/api/v1/grupos-cola-fifo/${grupo_id}/familias/${id}`;
    const response = await apiFetch<any>(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    return response;
  },
  "grupos_cola_fifo_familias.delete": async (input) => {
    const { grupo_id, id } = input;
    if (!grupo_id) throw new Error("A grupo_id is required to delete a grupo_cola_fifo_familia.");
    const url = `${API_BASE_URL}/api/v1/grupos-cola-fifo/${grupo_id}/familias/${id}`;
    await apiFetch<any>(url, {
      method: 'DELETE',
    });
    return { status: "deleted", id: id };
  },
};

// =============================================================================
// MOSTRADOR MODULE HANDLERS
// =============================================================================
const mostradorHandlers: Record<string, ActionHandler<any>> = {
  // Cotizaciones
  "cotizaciones.create": async (input) => {
    const url = `${API_BASE_URL}/api/v1/cotizaciones/`;
    const response = await apiFetch<any>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return response;
  },
  "cotizaciones.list": (input) =>
    list<any>("cotizaciones", input),
  // Notificaciones Cliente
  "notificaciones_cliente.list": (input) =>
    list<any>("notificaciones-cliente", input),
  "notificaciones_cliente.create": async (input) => {
    const insertData = Array.isArray(input) ? input : [input];
    const url = `${API_BASE_URL}/api/v1/notificaciones-cliente/`;
    const response = await apiFetch<any>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(insertData),
    });
    return { results: response.results || [] };
  },
  // Incidente Fotos
  "incidente_fotos.list": (input) =>
    list<any>("incidente-fotos", input),
  "incidente_fotos.create": async (input) => {
    const insertData = Array.isArray(input) ? input : [input];
    const url = `${API_BASE_URL}/api/v1/incidente-fotos/`;
    const response = await apiFetch<any>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(insertData),
    });
    return { results: response.results || [] };
  },
  "incidente_accesorios.list": (input) =>
    list<any>("incidente-accesorios", { ...input, select: "accesorios:accesorio_id(nombre)" }),
  "incidente_tecnico.list": (input) =>
    list<any>("incidente-tecnico", input),
  "usuarios.get": async (input) => {
    const url = `${API_BASE_URL}/api/v1/usuarios/${input.id}`;
    const response = await apiFetch<any>(url);
    return { result: response };
  },
  // Direcciones Envio
  "direcciones_envio.list": (input) =>
    list<any>("direcciones-envio", input),
  "direcciones_envio.get": async (input) => {
    const url = `${API_BASE_URL}/api/v1/direcciones-envio/${input.id}`;
    const response = await apiFetch<any>(url);
    return { result: response };
  },
  // Guias - with filters
  "guias.search": async (input) => {
    const { incidente_codigo, incidente_id, ...rest } = input as any;
    const { results } = await list<any>("guias/search", rest);

    // If filtering by codigo, do it client-side since JSONB array contains is problematic
    let filteredResults = results || [];
    if (incidente_codigo && !incidente_id) {
      filteredResults = filteredResults.filter((g: any) => {
        const codigos = g.incidentes_codigos;
        if (Array.isArray(codigos)) return codigos.includes(incidente_codigo);
        return false;
      });
    }
    return { results: filteredResults };
  },


  // Solicitudes Repuestos - search by incidente
  "solicitudes_repuestos.search": async (input) => {
    const { incidente_id, estado, limit = 50 } = input as any;
    const params = new URLSearchParams();
    if (incidente_id) params.append("incidente_id", incidente_id.toString());
    if (estado) params.append("estado", estado);
    params.append("limit", limit.toString());
    const url = `${API_BASE_URL}/api/v1/solicitudes-repuestos/search?${params.toString()}`;    const response = await apiFetch<any>(url);
    return { results: response.results || [] };
  },
  // Inventario - search by codigos
  "inventarios.search": async (input) => {
    const { codigos_repuesto, ...rest } = input as any;
    if (!codigos_repuesto?.length) return { results: [] };
    return list<any>("inventarios/search", { q: `codigo_repuesto=${codigos_repuesto.join(",")}`, ...rest });
  },
};

// =============================================================================
// CALIDAD MODULE HANDLERS
// =============================================================================
const calidadHandlers: Record<string, ActionHandler<any>> = {
  "auditorias_calidad.list": (input) =>
    list<any>("auditorias-calidad", input),
  "auditorias_calidad.get": async (input) => {
    const url = `${API_BASE_URL}/api/v1/auditorias-calidad/${input.id}`;
    const response = await apiFetch<any>(url);
    return { result: response };
  },
  "auditorias_calidad.create": async (input) => {
    const url = `${API_BASE_URL}/api/v1/auditorias-calidad/`;
    const response = await apiFetch<any>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return response;
  },
  "auditorias_calidad.update": async (input) => {
    const { id, data: updateData } = input as any;
    const url = `${API_BASE_URL}/api/v1/auditorias-calidad/${id}`;
    const response = await apiFetch<any>(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    return response;
  },
  "auditorias_calidad.delete": async (input) => {
    const url = `${API_BASE_URL}/api/v1/auditorias-calidad/${input.id}`;
    await apiFetch<any>(url, {
      method: 'DELETE',
    });
    return { status: "deleted", id: input.id };
  },
  "defectos_calidad.list": (input) =>
    list<any>("defectos-calidad", input),
  "defectos_calidad.get": async (input) => {
    const url = `${API_BASE_URL}/api/v1/defectos-calidad/${input.id}`;
    const response = await apiFetch<any>(url);
    return { result: response };
  },
  "defectos_calidad.create": async (input) => {
    const url = `${API_BASE_URL}/api/v1/defectos-calidad/`;
    const response = await apiFetch<any>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return response;
  },
  "defectos_calidad.update": async (input) => {
    const { id, data: updateData } = input as any;
    const url = `${API_BASE_URL}/api/v1/defectos-calidad/${id}`;
    const response = await apiFetch<any>(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    return response;
  },
  "defectos_calidad.delete": async (input) => {
    const url = `${API_BASE_URL}/api/v1/defectos-calidad/${input.id}`;
    await apiFetch<any>(url, {
      method: 'DELETE',
    });
    return { status: "deleted", id: input.id };
  },
};

// =============================================================================
// GARANTIAS MANUALES HANDLERS
// =============================================================================
const garantiasHandlers: Record<string, ActionHandler<any>> = {
  "garantias_manuales.list": (input) =>
    list<any>("garantias-manuales", input),
  "garantias_manuales.get": async (input) => {
    const url = `${API_BASE_URL}/api/v1/garantias-manuales/${input.id}`;
    const response = await apiFetch<any>(url);
    return { result: response };
  },
  "garantias_manuales.create": async (input) => {
    const url = `${API_BASE_URL}/api/v1/garantias-manuales/`;
    const response = await apiFetch<any>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return response;
  },
  "garantias_manuales.update": async (input) => {
    const { id, data: updateData } = input as any;
    const url = `${API_BASE_URL}/api/v1/garantias-manuales/${id}`;
    const response = await apiFetch<any>(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    return response;
  },
  "garantias_manuales.delete": async (input) => {
    const url = `${API_BASE_URL}/api/v1/garantias-manuales/${input.id}`;
    await apiFetch<any>(url, {
      method: 'DELETE',
    });
    return { status: "deleted", id: input.id };
  },
};

// =============================================================================
// SAC MODULE HANDLERS
// =============================================================================
const sacHandlers: Record<string, ActionHandler<any>> = {
  "asignaciones_sac.list": (input) =>
    list<any>("asignaciones-sac", input),
  "asignaciones_sac.get": async (input) => {
    const url = `${API_BASE_URL}/api/v1/asignaciones-sac/${input.id}`;
    const response = await apiFetch<any>(url);
    return { result: response };
  },
  "asignaciones_sac.create": async (input) => {
    const url = `${API_BASE_URL}/api/v1/asignaciones-sac/`;
    const response = await apiFetch<any>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return response;
  },
  "asignaciones_sac.update": async (input) => {
    const { id, data: updateData } = input as any;
    const url = `${API_BASE_URL}/api/v1/asignaciones-sac/${id}`;
    const response = await apiFetch<any>(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    return response;
  },
  "asignaciones_sac.delete": async (input) => {
    const url = `${API_BASE_URL}/api/v1/asignaciones-sac/${input.id}`;
    await apiFetch<any>(url, {
      method: 'DELETE',
    });
    return { status: "deleted", id: input.id };
  },
};

// =============================================================================
// NOTIFICACIONES HANDLERS (sistema interno)
// =============================================================================
const notificacionesHandlers: Record<string, ActionHandler<any>> = {
  "notificaciones.list": (input) =>
    list<any>("notificaciones", input),
  "notificaciones.get": async (input) => {
    const url = `${API_BASE_URL}/api/v1/notificaciones/${input.id}`;
    const response = await apiFetch<any>(url);
    return { result: response };
  },
  "notificaciones.create": async (input) => {
    const url = `${API_BASE_URL}/api/v1/notificaciones/`;
    const response = await apiFetch<any>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return response;
  },
  "notificaciones.update": async (input) => {
    const { id, data: updateData } = input as any;
    const url = `${API_BASE_URL}/api/v1/notificaciones/${id}`;
    const response = await apiFetch<any>(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    return response;
  },
  "notificaciones.delete": async (input) => {
    const url = `${API_BASE_URL}/api/v1/notificaciones/${input.id}`;
    await apiFetch<any>(url, {
      method: 'DELETE',
    });
    return { status: "deleted", id: input.id };
  },
  "notificaciones.markAsRead": async (input) => {
    const { id } = input;
    const url = `${API_BASE_URL}/api/v1/notificaciones/${id}/mark-as-read`;
    const response = await apiFetch<any>(url, {
      method: 'POST',
    });
    return response;
  },
};

// =============================================================================
// SOLICITUDES CAMBIO HANDLERS
// =============================================================================
const solicitudesCambioHandlers: Record<string, ActionHandler<any>> = {
  "solicitudes_cambio.list": (input) =>
    list<any>("solicitudes-cambio", input),
  "solicitudes_cambio.get": async (input) => {
    const url = `${API_BASE_URL}/api/v1/solicitudes-cambio/${input.id}`;
    const response = await apiFetch<any>(url);
    return { result: response };
  },
  "solicitudes_cambio.create": async (input) => {
    const url = `${API_BASE_URL}/api/v1/solicitudes-cambio/`;
    const response = await apiFetch<any>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return response;
  },
  "solicitudes_cambio.update": async (input) => {
    const { id, data: updateData } = input as any;
    const url = `${API_BASE_URL}/api/v1/solicitudes-cambio/${id}`;
    const response = await apiFetch<any>(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    return response;
  },
  "solicitudes_cambio.delete": async (input) => {
    const url = `${API_BASE_URL}/api/v1/solicitudes-cambio/${input.id}`;
    await apiFetch<any>(url, {
      method: 'DELETE',
    });
    return { status: "deleted", id: input.id };
  },
};

// =============================================================================
// INCIDENTE TECNICO EXTENDED HANDLERS
// =============================================================================
const incidenteTecnicoHandlers: Record<string, ActionHandler<any>> = {
  "incidente_tecnico.get": async (input) => {
    const url = `${API_BASE_URL}/api/v1/incidente-tecnico/${input.id}`;
    const response = await apiFetch<any>(url);
    return { result: response };
  },
  "incidente_tecnico.create": async (input) => {
    const url = `${API_BASE_URL}/api/v1/incidente-tecnico/`;
    const response = await apiFetch<any>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return response;
  },
  "incidente_tecnico.update": async (input) => {
    const { id, data: updateData } = input as any;
    const url = `${API_BASE_URL}/api/v1/incidente-tecnico/${id}`;
    const response = await apiFetch<any>(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    return response;
  },
  "incidente_tecnico.delete": async (input) => {
    const url = `${API_BASE_URL}/api/v1/incidente-tecnico/${input.id}`;
    await apiFetch<any>(url, {
      method: 'DELETE',
    });
    return { status: "deleted", id: input.id };
  },
  "incidente_tecnico.search": (input) =>
    list<any>("incidente-tecnico/search", input),
};

// =============================================================================
// DIAGNOSTICO FALLAS/CAUSAS HANDLERS
// =============================================================================
const diagnosticoAsociacionesHandlers: Record<string, ActionHandler<any>> = {
  "diagnostico_fallas.list": (input) => {
    const { diagnostico_id, ...rest } = input;
    return list<any>(`diagnosticos/${diagnostico_id}/fallas`, { ...rest, select: "*, falla:fallas(id, nombre)" });
  },
  "diagnostico_fallas.create": async (input) => {
    const { diagnostico_id, ...createData } = input;
    const url = `${API_BASE_URL}/api/v1/diagnosticos/${diagnostico_id}/fallas`;
    const response = await apiFetch<any>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createData),
    });
    return response;
  },
  "diagnostico_fallas.delete": async (input) => {
    const { diagnostico_id, falla_id } = input;
    const url = `${API_BASE_URL}/api/v1/diagnosticos/${diagnostico_id}/fallas/${falla_id}`;
    await apiFetch<any>(url, {
      method: 'DELETE',
    });
    return { status: "deleted" };
  },
  "diagnostico_fallas.deleteByDiagnostico": async (input) => {
    const { diagnostico_id } = input;
    const url = `${API_BASE_URL}/api/v1/diagnosticos/${diagnostico_id}/fallas`;
    await apiFetch<any>(url, {
      method: 'DELETE',
    });
    return { status: "deleted" };
  },
  "diagnostico_fallas.createBatch": async (input) => {
    const { diagnostico_id, ...createData } = input;
    const url = `${API_BASE_URL}/api/v1/diagnosticos/${diagnostico_id}/fallas/batch`;
    const response = await apiFetch<any>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createData),
    });
    return response.results || [];
  },
  "diagnostico_causas.list": (input) => {
    const { diagnostico_id, ...rest } = input;
    return list<any>(`diagnosticos/${diagnostico_id}/causas`, { ...rest, select: "*, causa:causas(id, nombre)" });
  },
  "diagnostico_causas.create": async (input) => {
    const { diagnostico_id, ...createData } = input;
    const url = `${API_BASE_URL}/api/v1/diagnosticos/${diagnostico_id}/causas`;
    const response = await apiFetch<any>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createData),
    });
    return response;
  },
  "diagnostico_causas.delete": async (input) => {
    const { diagnostico_id, causa_id } = input;
    const url = `${API_BASE_URL}/api/v1/diagnosticos/${diagnostico_id}/causas/${causa_id}`;
    await apiFetch<any>(url, {
      method: 'DELETE',
    });
    return { status: "deleted" };
  },
  "diagnostico_causas.deleteByDiagnostico": async (input) => {
    const { diagnostico_id } = input;
    const url = `${API_BASE_URL}/api/v1/diagnosticos/${diagnostico_id}/causas`;
    await apiFetch<any>(url, {
      method: 'DELETE',
    });
    return { status: "deleted" };
  },
  "diagnostico_causas.createBatch": async (input) => {
    const { diagnostico_id, ...createData } = input;
    const url = `${API_BASE_URL}/api/v1/diagnosticos/${diagnostico_id}/causas/batch`;
    const response = await apiFetch<any>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createData),
    });
    return response.results || [];
  },
};

// =============================================================================
// USUARIOS EXTENDED HANDLERS
// =============================================================================
const usuariosExtendedHandlers: Record<string, ActionHandler<any>> = {
  "usuarios.search": (input) =>
    list<any>("usuarios", input),
  "usuarios.getByEmail": async (input) => {
    const { email } = input;
    const url = `/api/v1/usuarios/?q=email=${email}`;
    const response = await apiFetch<any>(url);
    return { result: response.results && response.results.length > 0 ? response.results[0] : null };
  },
};

// =============================================================================
// TRANSITOS BODEGA EXTENDED
// =============================================================================
const transitosExtendedHandlers: Record<string, ActionHandler<any>> = {
  "transitos_bodega.search": (input) =>
    list<any>("transitos-bodega/search", input),
};

// =============================================================================
// CENTROS SUPERVISOR HANDLERS
// =============================================================================
const centrosSupervisorHandlers: Record<string, ActionHandler<any>> = {
  "centros_supervisor.list": (input) =>
    list<any>("centros-supervisor", input),
  "centros_supervisor.create": async (input) => {
    const url = `${API_BASE_URL}/api/v1/centros-supervisor/`;
    const response = await apiFetch<any>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return response;
  },
  "centros_supervisor.delete": async (input) => {
    const { id, supervisor_id } = input;
    const params = new URLSearchParams();
    if (supervisor_id) params.append("supervisor_id", supervisor_id.toString());
    let url = `${API_BASE_URL}/api/v1/centros-supervisor/${id}`;
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    await apiFetch<any>(url, {
      method: 'DELETE',
    });
    return { status: "deleted", id: id };
  },
};

// =============================================================================
// SOLICITUDES TRANSFERENCIA MAQUINAS
// =============================================================================
const solicitudesTransferenciaHandlers: Record<string, ActionHandler<any>> = {
  "solicitudes_transferencia_maquinas.list": (input) =>
    list<any>("solicitudes-transferencia-maquinas", input),
  "solicitudes_transferencia_maquinas.get": async (input) => {
    const url = `${API_BASE_URL}/api/v1/solicitudes-transferencia-maquinas/${input.id}`;
    const response = await apiFetch<any>(url);
    return { result: response };
  },
  "solicitudes_transferencia_maquinas.create": async (input) => {
    const url = `${API_BASE_URL}/api/v1/solicitudes-transferencia-maquinas/`;
    const response = await apiFetch<any>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return response;
  },
  "solicitudes_transferencia_maquinas.update": async (input) => {
    const { id, data: updateData } = input as any;
    const url = `${API_BASE_URL}/api/v1/solicitudes-transferencia-maquinas/${id}`;
    const response = await apiFetch<any>(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    return response;
  },
};

// =============================================================================
// USER ROLES HANDLERS
// =============================================================================
const userRolesHandlers: Record<string, ActionHandler<any>> = {
  "user_roles.list": (input) =>
    list<any>("user-roles", input),
};

// =============================================================================
// REPUESTOS RELACIONES HANDLERS
// =============================================================================
const repuestosRelacionesHandlers: Record<string, ActionHandler<any>> = {
  "repuestos_relaciones.list": (input) => {
    const { offset, ...rest } = input || {};
    return list<any>("repuestos-relaciones", { skip: offset, ...rest });
  },
};

// =============================================================================
// CONFIGURACION FIFO CENTRO HANDLERS
// =============================================================================
const configuracionFifoHandlers: Record<string, ActionHandler<any>> = {
  "configuracion_fifo_centro.list": (input) =>
    list<any>("configuracion-fifo-centro", input),
  "configuracion_fifo_centro.create": async (input) => {
    const url = `${API_BASE_URL}/api/v1/configuracion-fifo-centro/`;
    const response = await apiFetch<any>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return response;
  },
  "configuracion_fifo_centro.update": async (input) => {
    const { id, data: updateData } = input as any;
    const url = `${API_BASE_URL}/api/v1/configuracion-fifo-centro/${id}`;
    const response = await apiFetch<any>(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    return response;
  },
  "configuracion_fifo_centro.delete": async (input) => {
    const url = `${API_BASE_URL}/api/v1/configuracion-fifo-centro/${input.id}`;
    await apiFetch<any>(url, {
      method: 'DELETE',
    });
    return { status: "deleted", id: input.id };
  },
};

// =============================================================================
// MEDIA HANDLERS
// =============================================================================
const mediaHandlers: Record<string, ActionHandler<any>> = {
  "media.list": (input) =>
    list<any>("media", input),
  "media.create": async (input) => {
    const url = `${API_BASE_URL}/api/v1/media/`;
    const response = await apiFetch<any>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return response;
  },
};

// =============================================================================
// PEDIDOS BODEGA CENTRAL EXTENDED HANDLERS
// =============================================================================
const pedidosBodegaExtendedHandlers: Record<string, ActionHandler<any>> = {
  "pedidos_bodega_central.create": async (input) => {
    const url = `${API_BASE_URL}/api/v1/pedidos-bodega-central/`;
    const response = await apiFetch<any>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return response;
  },
  "pedidos_bodega_central.update": async (input) => {
    const { id, data: updateData } = input as any;
    const url = `${API_BASE_URL}/api/v1/pedidos-bodega-central/${id}`;
    const response = await apiFetch<any>(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    return response;
  },
  "pedidos_bodega_central.search": (input) =>
    list<any>("pedidos-bodega-central/search", input),
};

// =============================================================================
// DIAGNOSTICOS CRUD HANDLERS (implementar los que faltan)
// =============================================================================
const diagnosticosWriteHandlers: Record<string, ActionHandler<any>> = {
  "diagnosticos.create": async (input) => {
    const url = `${API_BASE_URL}/api/v1/diagnosticos/`;
    const response = await apiFetch<any>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return response;
  },
  "diagnosticos.update": async (input) => {
    const { id, data: updateData } = input as any;
    const url = `${API_BASE_URL}/api/v1/diagnosticos/${id}`;
    const response = await apiFetch<any>(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updateData, updated_at: new Date().toISOString() }),
    });
    return response;
  },
  "diagnosticos.delete": async (input) => {
    const url = `${API_BASE_URL}/api/v1/diagnosticos/${input.id}`;
    await apiFetch<any>(url, {
      method: 'DELETE',
    });
    return { status: "deleted", id: input.id };
  },
};

// =============================================================================
// GUIAS HANDLERS
// =============================================================================
const guiasHandlers: Record<string, ActionHandler<any>> = {
  "guias.list": (input) =>
    list<any>("guias", input),
  "guias.get": async (input) => {
    const url = `${API_BASE_URL}/api/v1/guias/${input.id}`;
    const response = await apiFetch<any>(url);
    return { result: response };
  },
  "guias.create": async (input) => {
    const url = `${API_BASE_URL}/api/v1/guias/`;
    const response = await apiFetch<any>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return response;
  },
  "guias.update": async (input) => {
    const { id, data: updateData } = input as any;
    const url = `${API_BASE_URL}/api/v1/guias/${id}`;
    const response = await apiFetch<any>(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    return response;
  },
};

// =============================================================================
// SOLICITUDES REPUESTOS EXTENDED HANDLERS
// =============================================================================
const solicitudesRepuestosExtendedHandlers: Record<string, ActionHandler<any>> = {
  "solicitudes_repuestos.update": async (input) => {
    const { id, data: updateData } = input as any;
    const url = `${API_BASE_URL}/api/v1/solicitudes-repuestos/${id}`;
    const response = await apiFetch<any>(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    return response;
  },
  "solicitudes_repuestos.search": (input) =>
    list<any>("solicitudes-repuestos/search", input),
  "solicitudes_repuestos.create": async (input) => {
    const url = `${API_BASE_URL}/api/v1/solicitudes-repuestos/`;
    const response = await apiFetch<any>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return response;
  },
};

// =============================================================================
// INVENTARIO HANDLERS
// =============================================================================
const inventarioGeneralHandlers: Record<string, ActionHandler<any>> = {
  "inventario.list": (input) =>
    list<any>("inventario", input),
};

// =============================================================================
// CDS TABLES HANDLERS (CDS_Fallas, CDS_Causas, CDS_Familias)
// =============================================================================
const cdsHandlers: Record<string, ActionHandler<any>> = {
  "cds_fallas.list": (input) =>
    list<any>("fallas", { ...input, select: "id,nombre,familia_id", order_by: "nombre" }),
  "cds_causas.list": (input) =>
    list<any>("causas", { ...input, select: "id,nombre,familia_id", order_by: "nombre" }),
  "cds_familias.list": async (input) => {
    const { results, total } = await list<any>("familias-producto", { ...input, select: "id,nombre,parent_id" });
    return { results: (results || []).map((f: any) => ({ id: f.id, Categoria: f.nombre, Padre: f.parent_id })), total };
  },
};

// =============================================================================
// REPUESTOS EXTENDED HANDLERS
// =============================================================================
const repuestosExtendedHandlers: Record<string, ActionHandler<any>> = {
  "repuestos.listByProducto": (input) =>
    list<any>("repuestos", input),
};

// =============================================================================
// INVENTARIOS EXTENDED HANDLERS
// =============================================================================
const inventariosExtendedHandlers: Record<string, ActionHandler<any>> = {
  "inventarios.listByCodigos": async (input) => {
    const { codigos, ...rest } = input as any;
    if (!codigos?.length) return { results: [] };
    return list<any>("inventario", { codigo_repuesto: codigos.join(","), ...rest });
  },
};

// =============================================================================
// PRODUCTOS EXTENDED HANDLERS
// =============================================================================
const productosExtendedHandlers: Record<string, ActionHandler<any>> = {
  "productos.listAlternativos": (input) =>
    list<any>("productos", input),
};

// =============================================================================
// HANDLERS MAP
// =============================================================================
// AUTH HANDLERS
// =============================================================================
const authHandlers: Record<string, ActionHandler<any>> = {
  "auth.login": async (input) => {
    const response = await apiFetch<any>(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return { success: true, message: "Login exitoso", user: response };
  },
  "auth.logout": async () => {
    await apiFetch<any>(`${API_BASE_URL}/api/v1/auth/logout`, {
      method: 'POST',
    });
    return { success: true };
  },
  "auth.getSession": async () => {
    const response = await apiFetch<any>(`${API_BASE_URL}/api/v1/auth/session`);
    return { session: response };
  },
  "auth.getUser": async () => {
    // const { data, error } = await supabase.auth.getUser();
    // if (error) throw error;
    // return { user: data.user };
  },
  "auth.me": async () => {
    const response = await apiFetch<any>(`${API_BASE_URL}/api/v1/auth/me`);
    const roles = response?.usuario_roles?.map((ur: any) => ur.rol) || [];
    return { result: response ? { ...response, roles } : null };
  },};

// =============================================================================
// STORAGE HANDLERS
// =============================================================================
const storageHandlers: Record<string, ActionHandler<any>> = {
  "storage.upload": async (input) => {
    // const { bucket, path, file, options } = input;
    // const { data, error } = await supabase.storage
    //   .from(bucket)
    //   .upload(path, file, options);
    
    // if (error) throw error;
    
    // const { data: urlData } = supabase.storage
    //   .from(bucket)
    //   .getPublicUrl(data.path);
    
    // return { url: urlData.publicUrl, storage_path: data.path };
  },
  "storage.delete": async (input) => {
    // const { bucket, paths } = input;
    // const { error } = await supabase.storage.from(bucket).remove(paths);
    // if (error) throw error;
    // return { success: true };
  },
  "storage.getPublicUrl": async (input) => {
    // const { bucket, path } = input;
    // const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    // return { publicUrl: data.publicUrl };
  },
};

// =============================================================================
// RPC HANDLERS
// =============================================================================
const rpcHandlers: Record<string, ActionHandler<any>> = {
  "rpc.generarCodigoIncidente": async () => {
    const response = await apiFetch<any>(`${API_BASE_URL}/api/v1/rpc/generar_codigo_incidente`, {
      method: 'POST',
    });
    return { codigo: response.codigo };
  },
  "rpc.generarNumeroGuia": async () => {
    const response = await apiFetch<any>(`${API_BASE_URL}/api/v1/rpc/generar_numero_guia`, {
      method: 'POST',
    });
    return { numero: response.numero };
  },};

// =============================================================================
// DIRECCIONES HANDLERS
// =============================================================================
const direccionesHandlers: Record<string, ActionHandler<any>> = {
  "direcciones.get": async (input) => {
    const url = `${API_BASE_URL}/api/v1/direcciones/${input.id}`;
    const response = await apiFetch<any>(url);
    return { result: response };
  },
};

// =============================================================================
// GUIAS EXTENDED HANDLERS
// =============================================================================
const guiasExtendedHandlers: Record<string, ActionHandler<any>> = {
  "guias.create": async (input) => {
    const url = `${API_BASE_URL}/api/v1/guias/`;
    const response = await apiFetch<any>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return response;
  },
  "guias.getMaxNumero": async (input) => {
    const { prefix } = input as { prefix: string };
    const url = `${API_BASE_URL}/api/v1/guias/max-numero?prefix=${prefix}`;
    const response = await apiFetch<any>(url);
    return { numero: response.numero || null };
  },};

//
const handlers: Partial<Record<ActionName, ActionHandler<any>>> = {
  ...clientesHandlers,
  ...productosHandlers,
  ...incidentesHandlers,
  ...ordenesHandlers,
  ...centrosDeServicioHandlers,
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
  ...auditoriaHandlers,
  ...verificacionesReincidenciaHandlers,
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
