# Memory: migration/overall-status-and-progress
Updated: Now

## Progreso General de Migración

```
██████████████████████████████████████████████████████████░░ 80% (60/75 páginas migradas)
```

**Total de archivos en src/pages:** 75
**Páginas 100% migradas o híbridas:** 60  
**Páginas con imports Supabase restantes:** 15

---

## ✅ Páginas 100% Libres de Supabase (43)

| # | Página | Actions Usadas |
|---|--------|----------------|
| 1 | `src/pages/Index.tsx` | `incidentes.list` |
| 2 | `src/pages/Productos.tsx` | Placeholder |
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
| 20 | `src/pages/logistica/DanosTransporte.tsx` | `incidentes.list` |
| 21 | `src/pages/gerencia/DashboardGerente.tsx` | `incidentes.list`, `inventarios.list` |
| 22 | `src/pages/gerencia/DashboardSupervisorRegional.tsx` | `incidentes.list` |
| 23 | `src/pages/gerencia/AprobacionesGarantia.tsx` | `solicitudes_cambio.list/update`, `incidentes.update` |
| 24 | `src/pages/calidad/DashboardSupervisorCalidad.tsx` | `incidentes.list` |
| 25 | `src/pages/calidad/ControlCalidadDashboard.tsx` | `incidentes.list` |
| 26 | `src/pages/calidad/VerificacionReincidencias.tsx` | `incidentes.list` |
| 27 | `src/pages/calidad/AuditoriasCalidad.tsx` | `auditorias_calidad.*` |
| 28 | `src/pages/calidad/AnalisisDefectos.tsx` | `defectos_calidad.*` |
| 29 | `src/pages/sac/DashboardSupervisorSAC.tsx` | `incidentes.list`, `usuarios.list` |
| 30 | `src/pages/sac/DetalleIncidenteSAC.tsx` | `incidentes.get`, `diagnosticos.search` |
| 31 | `src/pages/sac/IncidentesSAC.tsx` | `incidentes.list`, `asignaciones_sac.*` |
| 32 | `src/pages/taller/DashboardJefeTaller.tsx` | `incidentes.list`, `usuarios.list`, `diagnosticos.list` |
| 33 | `src/pages/taller/ConfiguracionColas.tsx` | `grupos_cola_fifo.*`, `familias_producto.list` |
| 34 | `src/pages/taller/MisAsignaciones.tsx` | `incidentes.list`, `notificaciones.*` |
| 35 | `src/pages/taller/DiagnosticoInicial.tsx` | `incidentes.get`, `diagnosticos.*`, `fallas.list`, `causas.list` |
| 36 | `src/pages/taller/WaterspiderEntrega.tsx` | `incidentes.get/update`, `clientes.get` |
| 37 | `src/pages/taller/RevisionStockCemaco.tsx` | `incidentes.list/update` |
| 38 | `src/pages/taller/AprobacionesStockCemaco.tsx` | `incidentes.list/update` |
| 39 | `src/pages/taller/Solicitudes.tsx` | `diagnosticos.list/update`, `usuarios.list` |
| 40 | `src/pages/taller/Reasignaciones.tsx` | `incidentes.list/update`, `incidente_tecnico.*` |
| 41 | `src/pages/taller/CambioGarantia.tsx` | `incidentes.get`, `inventarios.list`, `productos.list` |
| 42 | `src/pages/taller/DetallePendienteRepuesto.tsx` | `incidentes.get`, `solicitudes_repuestos.list` |
| 43 | `src/pages/taller/PedidosBodegaCentral.tsx` | `pedidos_bodega_central.*`, `incidentes.list` |

---

## 🔄 Páginas Híbridas (17)

| Página | Actions Usadas | Supabase Directo Para |
|--------|----------------|----------------------|
| `mostrador/Incidentes.tsx` | `incidentes.list` | Writes |
| `mostrador/EntregaMaquinas.tsx` | `incidentes.list`, `clientes.list` | Updates |
| `mostrador/ConsultaPrecios.tsx` | `clientes.list`, `productos.search` | `cotizaciones` insert |
| `mostrador/SeguimientoIncidente.tsx` | `incidentes.get`, `diagnosticos.search` | N/A (fully migrated) |
| `mostrador/DetalleEntrega.tsx` | `incidentes.get`, `diagnosticos.search` | Updates |
| `bodega/ConsultaCardex.tsx` | `repuestos.search` | movimientos_inventario queries |
| `bodega/Solicitudes.tsx` | `solicitudes_repuestos.list` | Updates |
| `bodega/InventarioNuevo.tsx` | `inventarios.list`, `centros_de_servicio.list` | Complex queries |
| `taller/Asignaciones.tsx` | `familias_producto.list` | Complex incidente logic |
| `taller/Transferencias.tsx` | `solicitudes_transferencia_maquinas.*` | Status updates |
| `taller/BusquedaIncidentes.tsx` | `incidentes.list`, `diagnosticos.search` | `media` table |
| `taller/WaterspiderPendientes.tsx` | `incidentes.list`, `clientes.list` | Updates |
| `logistica/GarantiasManuales.tsx` | `garantias_manuales.*` | Storage uploads |
| `logistica/IngresoMaquinas.tsx` | `incidentes.list`, `embarques.list` | Media uploads, updates |
| `logistica/Guias.tsx` | `guias.list/create`, `clientes.list` | RPC, edge functions |
| `logistica/FaltanteAccesorios.tsx` | `incidentes.list`, `repuestos.search` | N/A |
| `mostrador/HerramientasManuales.tsx` | `herramientas_manuales.*` | Storage |

---

## ❌ Páginas Pendientes (15)

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

### Read Operations
- `productos.*`, `incidentes.*`, `diagnosticos.*`, `repuestos.*`
- `bodegas.*`, `inventarios.*`, `movimientos_inventario.*`
- `solicitudes_repuestos.*`, `notificaciones.*`
- `usuarios.list`, `roles.list`, `fallas.list`, `causas.list`
- `accesorios.list`, `guias.list`, `presupuestos.*`
- `familias_producto.list`, `centros_de_servicio.list`
- `centros_supervisor.list`, `diagnostico_fallas.*`, `diagnostico_causas.*`
