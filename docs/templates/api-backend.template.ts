/**
 * API Backend Template
 * 
 * Este archivo implementa los handlers para todas las acciones definidas en api-registry.ts
 * Copiar a: src/lib/api-backend.ts
 * 
 * INSTRUCCIONES:
 * 1. Copiar este archivo a tu proyecto
 * 2. Implementar los handlers para cada acción de tu ActionRegistry
 * 3. Ajustar los imports según tu estructura de proyecto
 */

import { supabase } from "@/integrations/supabase/client";
import type { ActionRegistry, ActionName, ActionInput, ActionOutput } from "./api-registry";

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL - Punto único de entrada
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ejecuta una acción de backend tipada
 * 
 * @example
 * // Consultar lista
 * const { results } = await apiBackendAction("examples.list", { limit: 10 });
 * 
 * // Obtener uno
 * const { result } = await apiBackendAction("examples.get", { id: 123 });
 * 
 * // Crear
 * const created = await apiBackendAction("examples.create", { name: "Test" });
 * 
 * // Actualizar
 * const updated = await apiBackendAction("examples.update", { id: 123, data: { name: "Updated" } });
 */
export async function apiBackendAction<T extends ActionName>(
  action: T,
  input: ActionInput<T>
): Promise<ActionOutput<T>> {
  console.log(`[API] ${action}`, input);

  // Lookup del handler
  const handler = actionHandlers[action];
  
  if (!handler) {
    throw new Error(`Action not implemented: ${action}`);
  }

  try {
    const result = await handler(input as never);
    return result as ActionOutput<T>;
  } catch (error) {
    console.error(`[API Error] ${action}:`, error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HANDLERS - Implementación de cada acción
// ═══════════════════════════════════════════════════════════════════════════

type ActionHandler<T extends ActionName> = (input: ActionInput<T>) => Promise<ActionOutput<T>>;

const actionHandlers: { [K in ActionName]: ActionHandler<K> } = {
  // ─────────────────────────────────────────────────────────────────────────
  // AUTH HANDLERS
  // ─────────────────────────────────────────────────────────────────────────
  
  "auth.login": async (input) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });
    if (error) throw error;
    return { session: data.session! };
  },

  "auth.logout": async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  "auth.getUser": async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return { user };
  },

  "auth.getSession": async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return { session };
  },

  "auth.me": async () => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) return { result: null };

    // Ajustar esta query según tu tabla de usuarios/perfiles
    const { data: profile, error: profileError } = await supabase
      .from("usuarios") // Cambiar nombre de tabla
      .select("id, nombre, email") // Ajustar campos
      .eq("auth_id", user.id) // Ajustar campo de relación
      .single();

    if (profileError) throw profileError;
    
    return { 
      result: {
        ...profile,
        roles: [], // Cargar roles si aplica
      }
    };
  },

  // ─────────────────────────────────────────────────────────────────────────
  // STORAGE HANDLERS
  // ─────────────────────────────────────────────────────────────────────────
  
  "storage.upload": async (input) => {
    const { data, error } = await supabase.storage
      .from(input.bucket)
      .upload(input.path, input.file, input.options);

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(input.bucket)
      .getPublicUrl(data.path);

    return {
      url: urlData.publicUrl,
      storage_path: data.path,
    };
  },

  "storage.delete": async (input) => {
    const { error } = await supabase.storage
      .from(input.bucket)
      .remove(input.paths);

    if (error) throw error;
  },

  "storage.getPublicUrl": async (input) => {
    const { data } = supabase.storage
      .from(input.bucket)
      .getPublicUrl(input.path);

    return { publicUrl: data.publicUrl };
  },

  // ─────────────────────────────────────────────────────────────────────────
  // EXAMPLE ENTITY HANDLERS - Reemplazar con tus entidades
  // ─────────────────────────────────────────────────────────────────────────
  
  "examples.list": async (input) => {
    let query = supabase
      .from("examples") // Cambiar nombre de tabla
      .select("*", { count: "exact" });

    // Aplicar filtros
    if (input.filters?.search) {
      query = query.ilike("name", `%${input.filters.search}%`);
    }
    if (input.filters?.status) {
      query = query.eq("status", input.filters.status);
    }

    // Paginación
    if (input.limit) {
      query = query.limit(input.limit);
    }
    if (input.offset) {
      query = query.range(input.offset, input.offset + (input.limit || 10) - 1);
    }

    // Ordenamiento por defecto
    query = query.order("created_at", { ascending: false });

    const { data, error, count } = await query;
    if (error) throw error;

    return { 
      results: data || [],
      total: count ?? undefined,
    };
  },

  "examples.get": async (input) => {
    const { data, error } = await supabase
      .from("examples")
      .select("*")
      .eq("id", input.id)
      .single();

    if (error) throw error;
    return { result: data };
  },

  "examples.create": async (input) => {
    const { data, error } = await supabase
      .from("examples")
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  "examples.update": async (input) => {
    const { data, error } = await supabase
      .from("examples")
      .update(input.data)
      .eq("id", input.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  "examples.delete": async (input) => {
    const { error } = await supabase
      .from("examples")
      .delete()
      .eq("id", input.id);

    if (error) throw error;
  },

  "examples.search": async (input) => {
    const { data, error } = await supabase
      .from("examples")
      .select("*")
      .ilike("name", `%${input.search}%`)
      .limit(input.limit || 10);

    if (error) throw error;
    return { results: data || [] };
  },

  // ─────────────────────────────────────────────────────────────────────────
  // RPC HANDLERS - Para funciones de base de datos
  // ─────────────────────────────────────────────────────────────────────────
  
  "rpc.exampleFunction": async (input) => {
    const { data, error } = await supabase
      .rpc("example_function", { // Nombre de la función en DB
        p_param1: input.param1,
        p_param2: input.param2,
      });

    if (error) throw error;
    return { result: data };
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// GUÍA DE IMPLEMENTACIÓN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * CÓMO AGREGAR UN HANDLER PARA UNA NUEVA ENTIDAD:
 * 
 * 1. Asegurarse de que la acción está definida en api-registry.ts
 * 
 * 2. Agregar el handler al objeto actionHandlers siguiendo el patrón:
 * 
 *    "[entidad].list": async (input) => {
 *      const { data, error } = await supabase
 *        .from("[tabla]")
 *        .select("*")
 *        .limit(input.limit || 50);
 *      if (error) throw error;
 *      return { results: data || [] };
 *    },
 * 
 * 3. Para queries complejas con joins:
 * 
 *    "[entidad].get": async (input) => {
 *      const { data, error } = await supabase
 *        .from("[tabla]")
 *        .select(`
 *          *,
 *          relacion:tabla_relacionada(id, nombre),
 *          otra_relacion:otra_tabla(*)
 *        `)
 *        .eq("id", input.id)
 *        .single();
 *      if (error) throw error;
 *      return { result: data };
 *    },
 * 
 * 4. Para RPCs/funciones de base de datos:
 * 
 *    "rpc.[nombreFuncion]": async (input) => {
 *      const { data, error } = await supabase.rpc("[nombre_funcion_db]", {
 *        p_param: input.param,
 *      });
 *      if (error) throw error;
 *      return { result: data };
 *    },
 */
