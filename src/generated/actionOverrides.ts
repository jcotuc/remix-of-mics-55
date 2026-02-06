// Manual overrides for actions that don't fit the auto-generated patterns.
// Edit this file to customize specific action handlers.
//
// This file is NOT auto-generated and will not be overwritten.

import * as sdk from "@/generated_sdk";
import { apiFetch } from "./utils";
import { API_BASE_URL } from "@/config/api";

type ActionHandler = (input: any) => Promise<any>;

/**
 * Manual overrides for actions that need custom handling.
 * These take precedence over auto-generated handlers.
 */
export const actionOverrides: Record<string, ActionHandler> = {
  // AUTH - Custom response transformation
  "auth.me": async () => {
    const response = await sdk.readUserMeApiV1AuthMeGet();
    const user = response.data;
    if (!user) return { result: null };
    // Transform usuario_roles to roles array for convenience
    const roles = (user as any).usuario_roles?.map((ur: any) => ur.rol) || [];
    return { result: { ...user, roles } };
  },

  "auth.login": async (input) => {
    const response = await sdk.loginUserApiV1AuthLoginPost({ body: input });
    return { success: true, message: "Login exitoso", user: response.data };
  },

  "auth.logout": async () => {
    await sdk.logoutApiV1AuthLogoutPost();
    return { success: true };
  },

  // RPC FUNCTIONS - Not standard REST
  "rpc.generarCodigoIncidente": async () => {
    const response = await apiFetch<{ codigo: string }>(
      `${API_BASE_URL}/api/v1/rpc/generar_codigo_incidente`,
      { method: "POST" }
    );
    return { codigo: response.codigo };
  },

  "rpc.generarNumeroGuia": async () => {
    const response = await apiFetch<{ numero: string }>(
      `${API_BASE_URL}/api/v1/rpc/generar_numero_guia`,
      { method: "POST" }
    );
    return { numero: response.numero };
  },

  // STORAGE - Supabase-specific, not our backend
  "storage.upload": async () => {
    throw new Error("storage.upload must be implemented with Supabase client");
  },

  "storage.delete": async () => {
    throw new Error("storage.delete must be implemented with Supabase client");
  },

  "storage.getPublicUrl": async () => {
    throw new Error("storage.getPublicUrl must be implemented with Supabase client");
  },

  // DIAGNOSTICOS - Nested under incidentes
  "diagnosticos.list": async (input) => {
    const { incidente_id, ...rest } = input;
    if (!incidente_id) throw new Error("incidente_id is required for diagnosticos.list");
    const response = await sdk.getDiagnosticosIncidenteApiV1IncidentesIncidenteIdDiagnosticosGet({
      path: { incidente_id },
      query: rest,
    });
    return response.data;
  },

  "diagnosticos.create": async (input) => {
    const { incidente_id, ...createData } = input;
    if (!incidente_id) throw new Error("incidente_id is required for diagnosticos.create");
    const response = await sdk.createDiagnosticoApiV1IncidentesIncidenteIdDiagnosticosPost({
      path: { incidente_id },
      body: createData,
    });
    return { result: response.data };
  },

  // GRUPOS COLA FIFO FAMILIAS - Nested under grupos-cola-fifo
  "grupos_cola_fifo_familias.list": async (input) => {
    const { grupo_id, ...rest } = input;
    if (!grupo_id) throw new Error("grupo_id is required");
    const response = await sdk.getGrupoColaFifoFamiliasApiV1GruposColaFifoGrupoIdFamiliasGet({
      path: { grupo_id },
      query: rest,
    });
    return { results: response.data, total: (response.data as any[])?.length || 0 };
  },

  "grupos_cola_fifo_familias.create": async (input) => {
    const { grupo_id, ...createData } = input;
    if (!grupo_id) throw new Error("grupo_id is required");
    const response = await sdk.createGrupoColaFifoFamiliaApiV1GruposColaFifoGrupoIdFamiliasPost({
      path: { grupo_id },
      body: createData,
    });
    return response.data;
  },

  "grupos_cola_fifo_familias.delete": async (input) => {
    const { grupo_id, id } = input;
    if (!grupo_id) throw new Error("grupo_id is required");
    await sdk.deleteGrupoColaFifoFamiliaApiV1GruposColaFifoGrupoIdFamiliasGrupoFamiliaIdDelete({
      path: { grupo_id, grupo_familia_id: id },
    });
    return { status: "deleted", id };
  },
};
