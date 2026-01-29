// infra/get.ts
import { apiFetch } from "../lib/api-backend";

export async function get<T>(
  resource: string,
  id: string | number
): Promise<T> {
  const url = `/api/v1/${resource}/${id}`;
  return apiFetch<T>(url);
}
