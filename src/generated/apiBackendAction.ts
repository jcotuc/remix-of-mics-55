// API Backend Action - Main entry point for all backend operations
// This file is mostly static, imports from generated files.

import { actionMap } from "./generated/actionMap.gen";
import type { ActionRegistry, ActionName } from "./generated/actionRegistry.gen";

/**
 * Execute a typed backend action.
 *
 * @example
 * const { results, total } = await apiBackendAction("clientes.list", { limit: 50 });
 * const { result } = await apiBackendAction("clientes.get", { id: 123 });
 */
export async function apiBackendAction<K extends ActionName>(
  action: K,
  input: ActionRegistry[K]["input"]
): Promise<ActionRegistry[K]["output"]> {
  const handler = actionMap[action];
  if (!handler) {
    throw new Error(`Unknown action: ${action}`);
  }
  return handler(input);
}

// Re-export types for convenience
export type { ActionRegistry, ActionName };
