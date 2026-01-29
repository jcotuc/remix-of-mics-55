# API Query Plan: Centralizing Filtering with the `q` Parameter

## Goal
To standardize and simplify frontend API interactions by centralizing filtering and search logic within the `apiBackendAction` function. This involves primarily using `list` endpoints from the generated SDK (/src/generated) and leveraging a flexible `q` query parameter for complex queries.

## Strategy

1.  **Prioritize `list` Endpoints:** All data retrieval operations, especially those involving filtering or searching, should be routed through `list` endpoints where applicable (e.g., `clientes.list`, `productos.list`).

2.  **Flexible `q` Parameter:** For `list` endpoints, the `apiBackendAction` will process frontend input (e.g., `search` strings, multiple filter criteria) and consolidate them into a single `q` query parameter for the underlying SDK function call.
    *   **Backend Expectation:** The backend API, as defined in `src/openapi.json`, is expected to implement the `q` parameter for `list` endpoints. This parameter should accept a string that the backend can parse to apply versatile filtering (e.g., `key=value&key2=value2` or a general search string).
    *   **Frontend Translation:** `apiBackendAction` will be responsible for translating various input properties into the `q` parameter format expected by the backend.

3.  **Consistency with `apiBackendAction`:** Instead of migrating `apiBackendAction` handlers that directly use `supabase.from(...)` to SDK functions, adapt `apiBackendAction` to `openapi.json` and continue using `apiBackendAction` for consistency.

4.  **Handling `.search` Actions:** If a dedicated `.search` action exists (e.g., `usuarios.search`), it should be refactored to internally call its corresponding `.list` SDK function, passing its search criteria via the `q` parameter.

5.  **Documentation of Discrepancies:** A running list will be maintained for cases where the `openapi.json` definition for an endpoint does not yet support the expected `q` parameter or other necessary filter criteria. These will be flagged for backend updates.

## Current Discrepancies / Backend Update Requirements

*   **`GET /api/v1/usuarios/` (for `usuarios.list`):** Currently, the `openapi.json` definition for `getAllUsersApiV1UsuariosGet` does not include a `q` query parameter for versatile searching.
    *   **Impact:** Until the backend and `openapi.json` are updated to support `q` for this endpoint, the `usuarios.search` functionality (once refactored to use `usuarios.list`) will not provide advanced filtering via `q`.
    *   **Action Needed (Backend):** Update the `GET /api/v1/usuarios/` endpoint in `src/openapi.json` to include a `q` query parameter, similar to how `GET /api/v1/incidentes/` handles it.

*   **`GET /api/v1/centros-de-servicio/` (for `centros_de_servicio.list`):** The `openapi.json` definition for `getAllCentrosDeServicioApiV1CentrosDeServicioGet` does not currently include an `activo` query parameter or equivalent in `q` for filtering by active status.
    *   **Impact:** The `centros_de_servicio.list` handler in the frontend can no longer directly filter by `activo=true` after migration to the SDK.
    *   **Action Needed (Backend):** Update the `GET /api/v1/centros-de-servicio/` endpoint in `src/openapi.json` to include an `activo` filter, possibly as part of the `q` parameter.

*   **`GET /api/v1/grupos-cola-fifo/` (for `grupos_cola_fifo.list`):** The `openapi.json` definition for `getAllGruposColaFifoApiV1GruposColaFifoGet` does not currently include a `q` query parameter for versatile searching.
    *   **Impact:** If versatile searching is required for `grupos_cola_fifo`, the frontend cannot currently pass a general search string via the `q` parameter to this endpoint.
    *   **Action Needed (Backend):** Update the `GET /api/v1/grupos-cola-fifo/` endpoint in `src/openapi.json` to include a `q` query parameter, similar to how `GET /api/v1/incidentes/` handles it.

*   **`GET /api/v1/grupos-cola-fifo/{grupo_id}/familias` (for `grupos_cola_fifo_familias.list`):** The `openapi.json` definition for `getGrupoColaFifoFamiliasApiV1GruposColaFifoGrupoIdFamiliasGet` does not currently include a `q` query parameter for versatile searching.
    *   **Impact:** If versatile searching is required for `grupos_cola_fifo_familias`, the frontend cannot currently pass a general search string via the `q` parameter to this endpoint.
    *   **Action Needed (Backend):** Update the `GET /api/v1/grupos-cola-fifo/{grupo_id}/familias` endpoint in `src/openapi.json` to include a `q` query parameter.

## Example of `q` parameter usage (Backend perspective for `incidentes.list`):

For `GET /api/v1/incidentes/`:
The `q` parameter can accept advanced search queries like:
`q=cliente.nombre=Pedro&observaciones=urgente`
`q=codigo=XYZ-ABC&propietario.dpi=1234567`

The `apiBackendAction` for `incidentes.list` is expected to take an `input` object, from which it will construct this `q` string.
