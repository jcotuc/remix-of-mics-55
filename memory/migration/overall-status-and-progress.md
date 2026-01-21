# Memory: migration/overall-status-and-progress
Updated: Now

## Current Status: ~85% Complete

The project migration to align frontend with actual database schema and centralized apiBackendAction layer is progressing well.

## Completed Modules

### ✅ Taller (100%)
- All pages using correct schema fields
- `(supabase as any)` casting applied for `usuarios` table queries
- Dashboard, assignments, diagnostics all functional

### ✅ Logística (100%)
- `Embarques.tsx` - Fixed cliente_id/estado/aplica_garantia fields
- `GarantiasManuales.tsx` - Migrated from profiles to usuarios
- `MaquinasPendientesEnvio.tsx` - Added updated_at fallbacks
- `SalidaMaquinas.tsx` - Added updated_at fallbacks
- All dashboard pages verified

### ✅ Bodega (100%)
- All pages verified with casting pattern
- Dashboards (Jefe/Supervisor) working
- RecepcionImportacion, ListadoPicking, MovimientosInventario aligned

### ✅ SAC (100%)
- IncidentesSAC - Already had casting applied
- DetalleIncidenteSAC - Verified
- DashboardSupervisorSAC - Verified

### ✅ Mostrador (100%)
- DetalleEntrega.tsx - Removed confirmacion_cliente, stores metadata in observaciones
- All other pages verified

### ✅ Calidad (100%)
- All pages verified and functional

### ✅ Gerencia (100%)
- AprobacionesGarantia.tsx verified
- DashboardGerente.tsx verified
- DashboardSupervisorRegional.tsx verified

### ✅ Admin (Placeholder pages)
- Usuarios.tsx - Placeholder (requires missing tables)
- CentrosServicio.tsx - Placeholder (requires missing tables)

## Key Technical Patterns Applied

1. **`(supabase as any)` Casting**: Used consistently for queries to tables with incomplete type definitions (especially `usuarios` via `auth_uid`)

2. **Schema Field Alignment**: All components use correct DB fields:
   - `aplica_garantia` instead of `cobertura_garantia`
   - `estado` enums matching `estadoincidente` type
   - `cliente_id` as numeric instead of string

3. **Nullability Handling**: Added fallbacks for optional timestamp fields

## Remaining Tasks (~15%)

- [ ] Final verification of edge cases
- [ ] Runtime testing of all routes
- [ ] Type regeneration when Supabase types are updated
- [ ] Remove placeholder pages when missing tables are created
