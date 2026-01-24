/**
 * API Registry Template
 * 
 * Este archivo define los contratos tipados para todas las acciones de backend.
 * Copiar a: src/lib/api-registry.ts
 * 
 * INSTRUCCIONES:
 * 1. Copiar este archivo a tu proyecto
 * 2. Reemplazar las entidades de ejemplo con las de tu proyecto
 * 3. Importar tipos reales desde tu schema de Supabase
 */

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS BASE - Personalizar según tu proyecto
// ═══════════════════════════════════════════════════════════════════════════

// Importar tipos de Supabase (ajustar path según tu proyecto)
// import type { Database } from "@/integrations/supabase/types";

// Tipos de ejemplo - reemplazar con tus tipos reales
interface User {
  id: string;
  email: string;
}

interface Session {
  user: User;
  access_token: string;
}

interface UserProfile {
  id: number;
  nombre: string;
  email: string;
  roles: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// ENTIDADES DE EJEMPLO - Reemplazar con las de tu proyecto
// ═══════════════════════════════════════════════════════════════════════════

interface ExampleEntity {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface ExampleEntityInput {
  name: string;
  description?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// ACTION REGISTRY - El corazón del sistema de tipos
// ═══════════════════════════════════════════════════════════════════════════

export interface ActionRegistry {
  // ─────────────────────────────────────────────────────────────────────────
  // AUTH ACTIONS - Siempre incluir estas
  // ─────────────────────────────────────────────────────────────────────────
  
  "auth.login": {
    input: { email: string; password: string };
    output: { session: Session };
  };
  
  "auth.logout": {
    input: Record<string, never>;
    output: void;
  };
  
  "auth.getUser": {
    input: Record<string, never>;
    output: { user: User | null };
  };
  
  "auth.getSession": {
    input: Record<string, never>;
    output: { session: Session | null };
  };
  
  "auth.me": {
    input: Record<string, never>;
    output: { result: UserProfile | null };
  };

  // ─────────────────────────────────────────────────────────────────────────
  // STORAGE ACTIONS - Siempre incluir estas
  // ─────────────────────────────────────────────────────────────────────────
  
  "storage.upload": {
    input: {
      bucket: string;
      path: string;
      file: File;
      options?: {
        cacheControl?: string;
        contentType?: string;
        upsert?: boolean;
      };
    };
    output: {
      url: string;
      storage_path: string;
    };
  };
  
  "storage.delete": {
    input: {
      bucket: string;
      paths: string[];
    };
    output: void;
  };
  
  "storage.getPublicUrl": {
    input: {
      bucket: string;
      path: string;
    };
    output: {
      publicUrl: string;
    };
  };

  // ─────────────────────────────────────────────────────────────────────────
  // ENTITY ACTIONS - Copiar y adaptar para cada entidad
  // ─────────────────────────────────────────────────────────────────────────
  
  // Ejemplo: ExampleEntity
  "examples.list": {
    input: {
      limit?: number;
      offset?: number;
      filters?: {
        search?: string;
        status?: string;
      };
    };
    output: {
      results: ExampleEntity[];
      total?: number;
    };
  };
  
  "examples.get": {
    input: { id: number };
    output: { result: ExampleEntity };
  };
  
  "examples.create": {
    input: ExampleEntityInput;
    output: ExampleEntity;
  };
  
  "examples.update": {
    input: {
      id: number;
      data: Partial<ExampleEntityInput>;
    };
    output: ExampleEntity;
  };
  
  "examples.delete": {
    input: { id: number };
    output: void;
  };
  
  "examples.search": {
    input: {
      search: string;
      limit?: number;
    };
    output: {
      results: ExampleEntity[];
    };
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RPC ACTIONS - Para funciones de base de datos
  // ─────────────────────────────────────────────────────────────────────────
  
  "rpc.exampleFunction": {
    input: { param1: string; param2?: number };
    output: { result: string };
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER TYPES - No modificar
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Nombre de acción válido
 */
export type ActionName = keyof ActionRegistry;

/**
 * Tipo de input para una acción específica
 */
export type ActionInput<T extends ActionName> = ActionRegistry[T]["input"];

/**
 * Tipo de output para una acción específica
 */
export type ActionOutput<T extends ActionName> = ActionRegistry[T]["output"];

// ═══════════════════════════════════════════════════════════════════════════
// GUÍA DE USO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * CÓMO AGREGAR UNA NUEVA ENTIDAD:
 * 
 * 1. Definir el tipo de la entidad (importar de Supabase types si existe)
 * 2. Definir el tipo de input para create/update
 * 3. Agregar las acciones al ActionRegistry siguiendo el patrón:
 * 
 *    "[entidad].list": { input: {...}; output: { results: Entidad[] } };
 *    "[entidad].get": { input: { id: number }; output: { result: Entidad } };
 *    "[entidad].create": { input: EntidadInput; output: Entidad };
 *    "[entidad].update": { input: { id: number; data: Partial<EntidadInput> }; output: Entidad };
 *    "[entidad].delete": { input: { id: number }; output: void };
 * 
 * 4. Implementar los handlers correspondientes en api-backend.ts
 */
