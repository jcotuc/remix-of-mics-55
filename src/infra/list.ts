// infra/list.ts
import { apiFetch } from "../lib/api-backend";
import { buildListUrl } from "./buildUrl";

export interface ListInput {
  skip?: number;
  limit?: number;
  q?: string;
  // allow unknown filters
  [key: string]: any;
}

export interface ListOutput<T> {
  results: T[];
  total: number;
}

export async function list<T>(
  resource: string,
  input: ListInput = {}
): Promise<ListOutput<T>> {
  const { url } = buildListUrl(resource, input);
  const response = await apiFetch<any>(url);

  // normalize / assert
  if (!Array.isArray(response.results) || typeof response.total !== "number") {
    throw new Error(
      `Invalid list response for ${resource}: expected { results, total }`
    );
  }

  return {
    results: response.results as T[],
    total: response.total
  };
}
