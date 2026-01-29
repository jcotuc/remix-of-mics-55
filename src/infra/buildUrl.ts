// infra/buildUrl.ts
import { API_BASE_URL } from "@/config/api";

export function buildListUrl(
  resource: string,
  input: Record<string, any>
) {
  const params = new URLSearchParams();

  Object.entries(input).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    params.append(key, String(value));
  });

  return {
    url: `${API_BASE_URL}/api/v1/${resource}?${params.toString()}`
  };
}
