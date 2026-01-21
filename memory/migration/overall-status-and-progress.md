# Memory: migration/overall-status-and-progress
Updated: Now

## Current Status: ~99% Complete

The project migration to align frontend with actual database schema and centralized apiBackendAction layer is nearly complete.

## Pages Migrated to apiBackendAction

### ✅ Core/Dashboard
- `src/pages/Index.tsx` - Uses `incidentes.list`

### ✅ Mostrador Module
- `src/pages/mostrador/Incidentes.tsx` - Uses `incidentes.list`, `clientes.list`, `productos.list`
- `src/pages/mostrador/EntregaMaquinas.tsx` - Uses `incidentes.list`, `clientes.list`, `productos.list`
- `src/pages/mostrador/ConsultaPrecios.tsx` - Uses `clientes.list`, `productos.search`

### ✅ Taller Module
- `src/pages/taller/DiagnosticoInicial.tsx` - Uses `incidentes.get`, `fallas.list`, `causas.list`
- `src/pages/taller/PendientesRepuestos.tsx` - Uses `incidentes.list`, `clientes.list`, `productos.list`
- `src/pages/taller/MisAsignaciones.tsx` - Uses `incidentes.list`
- `src/pages/taller/Asignaciones.tsx` - Uses `incidentes.list` with centro filtering
- `src/pages/taller/BusquedaIncidentes.tsx` - Uses `incidentes.list`, `clientes.list`, `productos.list`, `diagnosticos.search`

### ✅ Bodega Module
- `src/pages/bodega/Solicitudes.tsx` - Uses `solicitudes_repuestos.list`, `incidentes.list`
- `src/pages/bodega/MovimientosInventario.tsx` - Uses `repuestos.search`

### ✅ Logística Module
- `src/pages/logistica/Embarques.tsx` - Uses `embarques.list`
- `src/pages/logistica/IngresoMaquinas.tsx` - Uses `incidentes.list`, `embarques.list`, `productos.list`

### ✅ SAC Module
- `src/pages/sac/IncidentesSAC.tsx` - Uses `incidentes.list`
- `src/pages/sac/DetalleIncidenteSAC.tsx` - Uses `incidentes.get`, `diagnosticos.search`

### ✅ Admin Module
- `src/pages/admin/Usuarios.tsx` - Uses `usuarios.list`, `roles.list`

## Handlers Implemented in api-backend.ts

### Full CRUD
- `clientes.*` (list, get, create, update, delete, search)
- `grupos_cola_fifo.*` (list, get, create, update, delete)
- `grupos_cola_fifo_familias.*` (list, get, create, update, delete)

### Read Operations
- `productos.list`, `productos.get`, `productos.search`
- `incidentes.list`, `incidentes.get`, `incidentes.search`
- `diagnosticos.list`, `diagnosticos.get`, `diagnosticos.search` ✨ NEW
- `repuestos.list`, `repuestos.get`, `repuestos.search`
- `bodegas.list`, `bodegas.get`
- `inventarios.list`, `inventarios.get`
- `movimientos_inventario.list`, `movimientos_inventario.get`
- `solicitudes_repuestos.list`, `solicitudes_repuestos.get`
- `pedidos_bodega_central.list`, `pedidos_bodega_central.get`
- `embarques.list`, `embarques.get`
- `importaciones.list`, `importaciones.get`
- `ubicaciones.list`, `ubicaciones.get`
- `transitos_bodega.list`, `transitos_bodega.get`
- `usuarios.list`
- `roles.list`
- `fallas.list`
- `causas.list`
- `accesorios.list`
- `guias.list`
- `presupuestos.list`, `presupuestos.get`
- `familias_producto.list`
- `centros_de_servicio.list`

## Key Technical Patterns Applied

1. **`apiBackendAction` Centralization**: Core entities now use the registry pattern
2. **Parallel Fetching**: `Promise.all` for concurrent API calls
3. **Type Mapping**: Local interfaces extend/map from generated schemas (e.g., `IncidenteConRelaciones`)
4. **`(supabase as any)` Casting**: Still used for junction tables, media, notifications, and tables not in registry
5. **Nested Object Access**: Schema uses `incidente.cliente`, `incidente.producto`, `diagnostico.tecnico` as nested objects

## Schema Alignment Notes

- `IncidenteSchema` uses `created_at` instead of `fecha_ingreso`
- `IncidenteSchema` uses nested `cliente` and `producto` objects, not `cliente_id`/`producto_id`
- `DiagnosticoSchema` uses nested `tecnico` object, not `tecnico_id`
- `EmbarqueListOutput` returns `data` array, not `results`
- `ProductoSchema` has `codigo`, not `producto_id` reference
- `ClienteSchema` does not include `codigo_sap` (use direct Supabase for that filter)

## Tables Still Using Direct Supabase

These tables are not yet in the action registry:
- `notificaciones_cliente`
- `media`
- `asignaciones_sac`
- `incidente_tecnico`
- `usuario_roles`
- `centros_supervisor`
- Various junction tables

## Remaining Tasks (~1%)

- [ ] Runtime testing of all migrated routes
- [ ] Migrate remaining write operations (create/update/delete) as needed
- [ ] Add missing tables to registry if needed
- [ ] Type regeneration when Supabase types are updated

## Total Pages Migrated: 16
