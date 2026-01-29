# API Implementation Plan: Standardizing `apiBackendAction` Handlers

## Goal
To standardize all frontend API interactions within the `apiBackendAction` function in `src/lib/api-backend.ts`. This ensures consistency, simplifies maintenance, and provides a clear pattern for implementing new endpoints.

## Strategy

The strategy revolves around two primary utilities: `apiFetch` for direct entity operations and `list` for collection-based operations.

1.  **Standardize on `apiFetch` for CRUD Operations:**
    *   All handlers for direct CRUD (Create, Read, Update, Delete) operations on single entities **must** use the `apiFetch` utility from `src/lib/api-backend.ts`.
    *   Handlers are responsible for manually constructing the full, RESTful API endpoint URL (e.g., `/api/v1/productos/<id>`).
    *   The `method`, `headers`, and `body` for the request must be explicitly provided in the `options` argument to `apiFetch`.
    *   **This approach is the required standard.** Usage of any auto-generated SDK functions is deprecated and has been removed.

2.  **Standardize on `list` for Collection Queries:**
    *   All handlers that retrieve collections of data (e.g., lists of clients, products with filters) **must** use the `list` utility from `src/infra/list.ts`.
    *   This utility is responsible for centralizing the logic for pagination (`limit`, `skip`), sorting, and filtering.

3.  **Flexible `q` Parameter for Filtering:**
    *   For complex filtering and searching within `list`-based handlers, the frontend input parameters should be consolidated into a single `q` query parameter.
    *   **Backend Expectation:** The backend API is expected to parse the `q` parameter to apply versatile filtering (e.g., `key=value&key2=value2`).
    *   **Frontend Translation:** The `apiBackendAction` handler is responsible for translating its input object into the `q` string format.

## Correct Implementation Examples

### Example 1: `apiFetch` for a `get` operation (`clientes.get`)
```typescript
// Correct: Manually constructed URL passed to apiFetch
"clientes.get": async (input) => {
  const url = `${API_BASE_URL}/api/v1/clientes/${input.id}`;
  const response = await apiFetch<any>(url);
  return { result: response };
},
```

### Example 2: `apiFetch` for an `update` operation (`productos.update`)
```typescript
// Correct: Manually constructed URL and request options for PATCH
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
```

### Example 3: `list` utility for a `list` operation (`productos.list`)
```typescript
// Correct: Uses the centralized 'list' utility
"productos.list": (input) =>
  list<any>("productos", input),
```

## Backend API Requirements (Ongoing)

This section tracks features required from the backend API, as defined in `src/openapi.json`, that are not yet implemented.

*   **`GET /api/v1/usuarios/`:** This endpoint needs a `q` query parameter to allow for versatile searching and filtering, which will simplify the `usuarios.search` handler.
*   **`GET /api/v1/centros-de-servicio/`:** This endpoint requires a filter for `activo` status, preferably within the `q` parameter, to allow filtering for active service centers.
