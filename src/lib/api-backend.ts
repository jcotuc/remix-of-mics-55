// API Backend utilities
// Typed backend action facade over Supabase operations
// Clean interface for pages/components to call backend actions

import { supabase } from "@/integrations/supabase/client";
import type { ActionRegistry, ActionName } from "./api-registry";

// Handler type
type ActionHandler<K extends ActionName> = (input: ActionRegistry[K]["input"]) => Promise<ActionRegistry[K]["output"]>;

// Stub for unimplemented actions
const notImplemented = (action: string) => async () => {
  throw new Error(`Action "${action}" is not implemented yet`);
};

// =============================================================================
// CLIENTES HANDLERS (Implemented)
// =============================================================================

const clientesHandlers = {
  "clientes.list": async (input: ActionRegistry["clientes.list"]["input"]) => {
    const { skip = 0, limit = 50 } = input;
    const { data, error } = await supabase
      .from("clientes")
      .select("*, direcciones(*)")
      .range(skip, skip + limit - 1)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { results: data || [] };
  },

  "clientes.get": async (input: ActionRegistry["clientes.get"]["input"]) => {
    const { data, error } = await supabase
      .from("clientes")
      .select("*, direcciones(*)")
      .eq("id", input.id)
      .maybeSingle();

    if (error) throw error;
    return { result: data };
  },

  "clientes.create": async (input: ActionRegistry["clientes.create"]["input"]) => {
    const { data, error } = await supabase.from("clientes").insert(input).select("*, direcciones(*)").single();

    if (error) throw error;
    return data;
  },

  "clientes.update": async (input: ActionRegistry["clientes.update"]["input"]) => {
    const { id, data: updateData } = input;
    const { data, error } = await supabase
      .from("clientes")
      .update(updateData)
      .eq("id", id)
      .select("*, direcciones(*)")
      .single();

    if (error) throw error;
    return data;
  },

  "clientes.delete": async (input: ActionRegistry["clientes.delete"]["input"]) => {
    const { error } = await supabase.from("clientes").delete().eq("id", input.id);

    if (error) throw error;
    return { status: "deleted", id: input.id };
  },

  "clientes.search": async (input: ActionRegistry["clientes.search"]["input"]) => {
    const { search = "", limit = 20 } = input;
    let query = supabase.from("clientes").select("id, codigo, nombre, nit").limit(limit);

    if (search) {
      query = query.or(`nombre.ilike.%${search}%,codigo.ilike.%${search}%,nit.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { results: data || [] };
  },
} satisfies Record<string, ActionHandler<any>>;

// =============================================================================
// INCIDENTES HANDLERS (Implemented)
// =============================================================================

const incidentesHandlers = {
  "incidentes.list": async (input: ActionRegistry["incidentes.list"]["input"]) => {
    const { skip = 0, limit = 100 } = input;
    const { data, error } = await supabase
      .from("incidentes")
      .select(
        `
        *,
        clientes:cliente_id (*),
        productos:producto_id (*),
        centros_de_servicio:centro_de_servicio_id (*)
      `,
      )
      .range(skip, skip + limit - 1)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Transform to match expected schema
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

  "incidentes.get": async (input: ActionRegistry["incidentes.get"]["input"]) => {
    const { data, error } = await supabase
      .from("incidentes")
      .select(
        `
        *,
        clientes:cliente_id (*),
        productos:producto_id (*),
        centros_de_servicio:centro_de_servicio_id (*)
      `,
      )
      .eq("id", input.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return { result: null };

    return {
      result: {
        id: data.id,
        codigo: data.codigo,
        estado: data.estado,
        tipologia: data.tipologia,
        descripcion_problema: data.descripcion_problema,
        centro_de_servicio_id: data.centro_de_servicio_id,
        centro_de_servicio: data.centros_de_servicio,
        cliente: data.clientes,
        propietario: null,
        producto: data.productos,
        tracking_token: data.tracking_token,
        incidente_origen_id: data.incidente_origen_id,
        quiere_envio: data.quiere_envio,
        aplica_garantia: data.aplica_garantia,
        tipo_resolucion: data.tipo_resolucion,
        observaciones: data.observaciones,
        created_at: data.created_at,
        updated_at: data.updated_at,
      },
    };
  },

  "incidentes.create": notImplemented("incidentes.create"),
  "incidentes.update": notImplemented("incidentes.update"),
  "incidentes.delete": notImplemented("incidentes.delete"),

  "incidentes.search": async (input: ActionRegistry["incidentes.search"]["input"]) => {
    const { search = "", limit = 20 } = input;
    let query = supabase.from("incidentes").select("id, codigo, estado, tipologia, created_at").limit(limit);

    if (search) {
      query = query.or(`codigo.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { results: data || [] };
  },
} satisfies Record<string, ActionHandler<any>>;

// =============================================================================
// ACTION HANDLERS MAP
// =============================================================================

const handlers: Partial<Record<ActionName, ActionHandler<any>>> = {
  // Clientes (implemented)
  ...clientesHandlers,

  // Productos (stubs)
  "productos.list": notImplemented("productos.list"),
  "productos.get": notImplemented("productos.get"),
  "productos.create": notImplemented("productos.create"),
  "productos.update": notImplemented("productos.update"),
  "productos.delete": notImplemented("productos.delete"),
  "productos.search": notImplemented("productos.search"),

  // Incidentes (implemented)
  ...incidentesHandlers,

  // Diagnosticos (stubs)
  "diagnosticos.list": notImplemented("diagnosticos.list"),
  "diagnosticos.get": notImplemented("diagnosticos.get"),
  "diagnosticos.create": notImplemented("diagnosticos.create"),
  "diagnosticos.update": notImplemented("diagnosticos.update"),
  "diagnosticos.delete": notImplemented("diagnosticos.delete"),
  "diagnosticos.search": notImplemented("diagnosticos.search"),

  // Repuestos (stubs)
  "repuestos.list": notImplemented("repuestos.list"),
  "repuestos.get": notImplemented("repuestos.get"),
  "repuestos.create": notImplemented("repuestos.create"),
  "repuestos.update": notImplemented("repuestos.update"),
  "repuestos.delete": notImplemented("repuestos.delete"),
  "repuestos.search": notImplemented("repuestos.search"),

  // Bodegas (stubs)
  "bodegas.list": notImplemented("bodegas.list"),
  "bodegas.get": notImplemented("bodegas.get"),
  "bodegas.create": notImplemented("bodegas.create"),
  "bodegas.update": notImplemented("bodegas.update"),
  "bodegas.delete": notImplemented("bodegas.delete"),

  // Familias Producto (implemented)
  "familias_producto.list": async (input: ActionRegistry["familias_producto.list"]["input"]) => {
    const { data, error } = await supabase
      .from("familias_producto")
      .select("id, nombre, parent_id, created_at")
      .is("parent_id", null) // Solo familias abuelas (top-level)
      .order("nombre");

    if (error) throw error;
    return { results: data || [], total: data?.length || 0 };
  },

  // Centros de Servicio (implemented)
  "centros_de_servicio.list": async (input: ActionRegistry["centros_de_servicio.list"]["input"]) => {
    const { data, error } = await supabase
      .from("centros_de_servicio")
      .select("id, nombre, codigo, slug, direccion, telefono, correo, es_central, activo, responsable_id, empresa_id, created_at, updated_at")
      .eq("activo", true)
      .order("nombre");

    if (error) throw error;
    return { items: data || [] };
  },

  // Grupos Cola FIFO (implemented)
  "grupos_cola_fifo.list": async (input: ActionRegistry["grupos_cola_fifo.list"]["input"]) => {
    const { data, error } = await supabase
      .from("grupos_cola_fifo")
      .select("*")
      .order("orden");

    if (error) throw error;
    return { results: data || [], total: data?.length || 0 };
  },

  // Grupos Cola FIFO Familias (implemented)
  "grupos_cola_fifo_familias.list": async (input: ActionRegistry["grupos_cola_fifo_familias.list"]["input"]) => {
    const { data, error } = await supabase
      .from("grupos_cola_fifo_familias")
      .select("*");

    if (error) throw error;
    return { results: data || [], total: data?.length || 0 };
  },
};

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Type-safe backend action caller
 * @param action - Action name (e.g., "clientes.list")
 * @param input - Typed input based on the action's contract
 * @returns Typed output based on the action's contract
 */
export async function apiBackendAction<K extends ActionName>(
  action: K,
  input: ActionRegistry[K]["input"],
): Promise<ActionRegistry[K]["output"]> {
  const handler = handlers[action];

  if (!handler) {
    throw new Error(`Unknown action: ${action}`);
  }

  return handler(input);
}
