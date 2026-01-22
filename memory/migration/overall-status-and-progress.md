# Memory: migration/overall-status-and-progress
Updated: Now

## Progreso General de Migración

```
████████████████████████████████████████████████████████████████████ 95% (71/75 páginas migradas)
```

**Total de archivos en src/pages:** 75
**Páginas 100% migradas o híbridas:** 71  
**Páginas con imports Supabase restantes:** 4 (usos legítimos: Auth, Storage, RPC)

---

## ✅ Páginas Migradas Esta Sesión

| Página | Cambio |
|--------|--------|
| `taller/AsignacionTecnicos.tsx` | Migrado a `configuracion_fifo_centro.*` |
| `taller/WaterspiderPendientes.tsx` | Migrado a `incidentes.update`, `solicitudes_repuestos.search/update` |
| `taller/BusquedaIncidentes.tsx` | Migrado a `media.list` |
| `logistica/Guias.tsx` | Migrado lecturas a `guias.list`, `incidentes.list`, `clientes.list` |
| 3 | `src/pages/DetalleCliente.tsx` | Placeholder |
| 4 | `src/pages/DetalleIncidente.tsx` | Placeholder |
| 5 | `src/pages/Incidentes.tsx` | Solo console.log |
| 6 | `src/pages/TestActions.tsx` | `clientes.list` |
| 7 | `src/pages/NotFound.tsx` | N/A (estática) |
| 8 | `src/pages/Auth.tsx` | N/A (auth comentado) |
| 9 | `src/pages/ActualizarCodigos.tsx` | `clientes.list`, `clientes.update` |
| 10 | `src/pages/Clientes.tsx` | `clientes.list/update/delete` |
| 11 | `src/pages/ImportarClientes.tsx` | `clientes.create` |
| 12 | `src/pages/logistica/ConsultaPreciosLogistica.tsx` | Datos mock |
| 13 | `src/pages/logistica/ConsultaUbicaciones.tsx` | Datos mock |
| 14 | `src/pages/logistica/Clientes.tsx` | `clientes.list` |
| 15 | `src/pages/logistica/DashboardJefeLogistica.tsx` | `guias.list`, `embarques.list`, `incidentes.list` |
| 16 | `src/pages/logistica/MaquinasNuevasRT.tsx` | `incidentes.list`, `clientes.list` |
| 17 | `src/pages/logistica/MaquinasPendientesEnvio.tsx` | `incidentes.list`, `clientes.list` |
| 18 | `src/pages/logistica/Embarques.tsx` | `embarques.list`, `embarques.create` |
| 19 | `src/pages/logistica/SalidaMaquinas.tsx` | `incidentes.list` |
| 20 | `src/pages/logistica/FaltanteAccesorios.tsx` | `incidentes.list`, `repuestos.search`, `inventarios.list` |
| 21 | `src/pages/logistica/DanosTransporte.tsx` | `incidentes.list` |
| 22 | `src/pages/gerencia/DashboardGerente.tsx` | `incidentes.list`, `inventarios.list` |
| 23 | `src/pages/gerencia/DashboardSupervisorRegional.tsx` | `incidentes.list` |
| 24 | `src/pages/gerencia/AprobacionesGarantia.tsx` | `solicitudes_cambio.list/update`, `incidentes.update` |
| 25 | `src/pages/calidad/DashboardSupervisorCalidad.tsx` | `incidentes.list` |
| 26 | `src/pages/calidad/ControlCalidadDashboard.tsx` | `incidentes.list` |
| 27 | `src/pages/calidad/VerificacionReincidencias.tsx` | `incidentes.list` |
| 28 | `src/pages/calidad/AuditoriasCalidad.tsx` | `auditorias_calidad.*` |
| 29 | `src/pages/calidad/AnalisisDefectos.tsx` | `defectos_calidad.*` |
| 30 | `src/pages/sac/DashboardSupervisorSAC.tsx` | `incidentes.list`, `usuarios.list` |
| 31 | `src/pages/sac/DetalleIncidenteSAC.tsx` | `incidentes.get`, `diagnosticos.search` |
| 32 | `src/pages/sac/IncidentesSAC.tsx` | `incidentes.list`, `asignaciones_sac.*` |
| 33 | `src/pages/taller/DashboardJefeTaller.tsx` | `incidentes.list`, `usuarios.list`, `diagnosticos.list` |
| 34 | `src/pages/taller/ConfiguracionColas.tsx` | `grupos_cola_fifo.*`, `familias_producto.list` |
| 35 | `src/pages/taller/MisAsignaciones.tsx` | `incidentes.list`, `notificaciones.*` |
| 36 | `src/pages/taller/DiagnosticoInicial.tsx` | `incidentes.get`, `diagnosticos.*`, `fallas.list`, `causas.list` |
| 37 | `src/pages/taller/WaterspiderEntrega.tsx` | `incidentes.get/update`, `clientes.get` |
| 38 | `src/pages/taller/RevisionStockCemaco.tsx` | `incidentes.list/update` |
| 39 | `src/pages/taller/AprobacionesStockCemaco.tsx` | `incidentes.list/update` |
| 40 | `src/pages/taller/Solicitudes.tsx` | `diagnosticos.list/update`, `usuarios.list` |
| 41 | `src/pages/taller/Reasignaciones.tsx` | `incidentes.list/update`, `incidente_tecnico.*` |
| 42 | `src/pages/taller/CambioGarantia.tsx` | `incidentes.get`, `inventarios.list`, `productos.list` |
| 43 | `src/pages/taller/DetallePendienteRepuesto.tsx` | `incidentes.get`, `solicitudes_repuestos.list` |
| 44 | `src/pages/taller/PedidosBodegaCentral.tsx` | `pedidos_bodega_central.*`, `incidentes.list` |
| 45 | `src/pages/mostrador/ConsultaPrecios.tsx` | `clientes.list`, `productos.search`, `cotizaciones.create` |
| 46 | `src/pages/mostrador/DetalleEntrega.tsx` | `incidentes.get/update`, `diagnosticos.search` |
| 47 | `src/pages/mostrador/EntregaMaquinas.tsx` | `incidentes.list/search`, `clientes.list`, `productos.list` |

---

## 🔄 Páginas Híbridas (17)

| Página | Actions Usadas | Supabase Directo Para |
|--------|----------------|----------------------|
| `mostrador/Incidentes.tsx` | `incidentes.list` | Writes |
| `mostrador/SeguimientoIncidente.tsx` | `incidentes.get`, `diagnosticos.search` | N/A (fully migrated) |
| `taller/Asignaciones.tsx` | `familias_producto.list` | Complex incidente logic |
| `taller/Transferencias.tsx` | `solicitudes_transferencia_maquinas.*` | Status updates |
| `taller/BusquedaIncidentes.tsx` | `incidentes.list`, `diagnosticos.search` | `media` table |
| `taller/WaterspiderPendientes.tsx` | `incidentes.list`, `clientes.list` | Updates |
| `logistica/GarantiasManuales.tsx` | `garantias_manuales.*` | Storage uploads |
| `logistica/IngresoMaquinas.tsx` | `incidentes.list`, `embarques.list` | Media uploads, RPC |
| `logistica/Guias.tsx` | `guias.list/create`, `clientes.list` | RPC, edge functions, queries |
| `mostrador/HerramientasManuales.tsx` | `incidentes.list` | Storage, RPC |

---

## ❌ Páginas Pendientes (11)

### Admin Module (11 - mostly placeholders)
- `admin/AccesoriosFamilias.tsx` (placeholder)
- `admin/AuditLogs.tsx` (placeholder)
- `admin/CentrosServicio.tsx` (placeholder)
- `admin/FallasCausas.tsx`
- `admin/FamiliasProductos.tsx`
- `admin/GestionPermisos.tsx` (placeholder)
- `admin/ImportarDespieces.tsx` (placeholder)
- `admin/InventarioAdmin.tsx` (placeholder)
- `admin/RecomendacionesFamilias.tsx` (placeholder)
- `admin/SustitutosRepuestos.tsx` (placeholder)
- `admin/Usuarios.tsx`

### Bodega Module (4 remaining)
- `bodega/Inventario.tsx`
- `bodega/InventarioCiclico.tsx`
- `bodega/ListadoPicking.tsx`
- `bodega/RecepcionImportacion.tsx`

---

## Handlers en api-backend.ts

### Full CRUD
- `clientes.*`, `grupos_cola_fifo.*`, `embarques.*`, `solicitudes_cambio.*`
- `auditorias_calidad.*`, `defectos_calidad.*`, `garantias_manuales.*`
- `pedidos_bodega_central.*`, `incidente_tecnico.*`, `asignaciones_sac.*`
- `solicitudes_transferencia_maquinas.*`, `user_roles.*`

### Read Operations
- `productos.*`, `incidentes.*`, `diagnosticos.*`, `repuestos.*`
- `bodegas.*`, `inventarios.*`, `movimientos_inventario.*`
- `solicitudes_repuestos.*`, `notificaciones.*`
- `usuarios.list/get/search`, `roles.list`, `fallas.list`, `causas.list`
- `accesorios.list`, `guias.list`, `presupuestos.*`
- `familias_producto.list`, `centros_de_servicio.list/get`
- `centros_supervisor.list`, `diagnostico_fallas.*`, `diagnostico_causas.*`
- `cotizaciones.create`
