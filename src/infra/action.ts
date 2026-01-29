// infra/action.ts
import { apiFetch } from "../lib/api-backend";

export async function action<T>(
  resource: string,
  id: string | number,
  actionName: string,
  data?: any
): Promise<T> {
  const url = `/api/v1/${resource}/${id}/actions/${actionName}`;
  return apiFetch<T>(url, {
    method: "POST",
    body: data
  });
}
