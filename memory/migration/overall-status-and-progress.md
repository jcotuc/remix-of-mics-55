# Memory: migration/overall-status-and-progress
Updated: Now

## Progreso General de Migración

```
████████████████████████████████████████████░░ 47% (35/75 páginas migradas)
```

**Total de archivos en src/pages:** 75  
**Páginas 100% migradas o híbridas:** 35  
**Páginas con imports Supabase restantes:** 40

---

## ✅ Páginas 100% Libres de Supabase (27)

| # | Página | Actions Usadas |
|---|--------|----------------|
| 1 | `src/pages/Index.tsx` | `incidentes.list` |
| 2 | `src/pages/Productos.tsx` | Placeholder |
| 3 | `src/pages/DetalleCliente.tsx` | Placeholder |
| 4 | `src/pages/DetalleIncidente.tsx` | Placeholder |
| 5 | `src/pages/Incidentes.tsx` | Solo console.log |
| 6 | `src/pages/TestActions.tsx` | `clientes.list` |
| 7 | `src/pages/NotFound.tsx` | N/A (estática) |
| 8 | `src/pages/logistica/ConsultaPreciosLogistica.tsx` | Datos mock |
| 9 | `src/pages/logistica/ConsultaUbicaciones.tsx` | Datos mock |
| 10 | `src/pages/logistica/Clientes.tsx` | `clientes.list` |
| 11 | `src/pages/logistica/DashboardJefeLogistica.tsx` | `guias.list`, `embarques.list`, `incidentes.list` |
| 12 | `src/pages/logistica/MaquinasNuevasRT.tsx` | `incidentes.list`, `clientes.list` |
| 13 | `src/pages/logistica/MaquinasPendientesEnvio.tsx` | `incidentes.list`, `clientes.list` |
| 14 | `src/pages/logistica/Embarques.tsx` | `embarques.list`, `embarques.create` |
| 15 | `src/pages/logistica/SalidaMaquinas.tsx` | `incidentes.list` |
| 16 | `src/pages/gerencia/DashboardGerente.tsx` | `incidentes.list`, `inventarios.list` |
| 17 | `src/pages/gerencia/DashboardSupervisorRegional.tsx` | `incidentes.list` |
| 18 | `src/pages/calidad/DashboardSupervisorCalidad.tsx` | `incidentes.list` |
| 19 | `src/pages/calidad/ControlCalidadDashboard.tsx` | `incidentes.list` |
| 20 | `src/pages/calidad/VerificacionReincidencias.tsx` | `incidentes.list` |
| 21 | `src/pages/sac/DashboardSupervisorSAC.tsx` | `incidentes.list`, `usuarios.list` |
| 22 | `src/pages/taller/DashboardJefeTaller.tsx` | `incidentes.list`, `usuarios.list`, `diagnosticos.list` |
| 23 | `src/pages/taller/ConfiguracionColas.tsx` | `grupos_cola_fifo.*` |
| 24 | `src/pages/bodega/Despieces.tsx` | N/A |
| 25 | `src/pages/bodega/DetalleSolicitud.tsx` | N/A |
| 26 | `src/pages/bodega/DashboardJefeBodega.tsx` | N/A |
| 27 | `src/pages/bodega/DashboardSupervisorBodega.tsx` | N/A |

---

## 🔄 Páginas Híbridas (8)

| Página | Actions Usadas | Supabase Directo Para |
|--------|----------------|----------------------|
| `sac/IncidentesSAC.tsx` | `incidentes.list` | `asignaciones_sac` |
| `sac/DetalleIncidenteSAC.tsx` | `incidentes.get`, `diagnosticos.search` | `asignaciones_sac` updates |
| `taller/BusquedaIncidentes.tsx` | `incidentes.list`, `diagnosticos.search`, `clientes.list`, `productos.list` | `media` table |
| `taller/MisAsignaciones.tsx` | N/A (complex realtime) | Full Supabase (pending) |
| `mostrador/Incidentes.tsx` | `incidentes.list` | Writes |
| `mostrador/EntregaMaquinas.tsx` | `incidentes.list`, `clientes.list` | Updates |
| `mostrador/ConsultaPrecios.tsx` | `clientes.list`, `productos.search` | `cotizaciones` insert |
| `bodega/Solicitudes.tsx` | `solicitudes_repuestos.list` | Updates |

---

## ❌ Páginas Pendientes (40)

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

### Bodega Module (14)
- `bodega/ConsultaCardex.tsx`
- `bodega/DespachosDepartamentales.tsx`
- `bodega/DocumentosPendientes.tsx`
- `bodega/DocumentosUbicacion.tsx`
- `bodega/GestionRelacionesRepuestos.tsx`
- `bodega/GestionUbicaciones.tsx`
- `bodega/Importacion.tsx`
- `bodega/Inventario.tsx`
- `bodega/InventarioCiclico.tsx`
- `bodega/InventarioNuevo.tsx`
- `bodega/ListadoPicking.tsx`
- `bodega/RecepcionImportacion.tsx`
- `bodega/ReubicacionRepuestos.tsx`
- `bodega/StockDepartamento.tsx`

### Calidad Module (2)
- `calidad/AnalisisDefectos.tsx`
- `calidad/AuditoriasCalidad.tsx`

### Gerencia Module (1)
- `gerencia/AprobacionesGarantia.tsx`

### Logística Module (2)
- `logistica/DanosTransporte.tsx`
- `logistica/FaltanteAccesorios.tsx`
- `logistica/GarantiasManuales.tsx` (complex - storage)

### Mostrador Module (2)
- `mostrador/DetalleEntrega.tsx`
- `mostrador/SeguimientoIncidente.tsx`

### SAC Module (0 - all migrated)

### Taller Module (10)
- `taller/AprobacionesStockCemaco.tsx`
- `taller/AsignacionTecnicos.tsx`
- `taller/Asignaciones.tsx`
- `taller/CambioGarantia.tsx`
- `taller/DetallePendienteRepuesto.tsx`
- `taller/PedidosBodegaCentral.tsx`
- `taller/Reasignaciones.tsx`
- `taller/RevisionStockCemaco.tsx`
- `taller/Solicitudes.tsx`
- `taller/Transferencias.tsx`
- `taller/WaterspiderEntrega.tsx`
- `taller/WaterspiderPendientes.tsx`

### Root Pages (4)
- `ActualizarCodigos.tsx`
- `Auth.tsx`
- `Clientes.tsx`
- `ImportarClientes.tsx`

---

## Handlers en api-backend.ts

### Full CRUD
- `clientes.*`, `grupos_cola_fifo.*`, `embarques.*`

### Read Operations
- `productos.*`, `incidentes.*`, `diagnosticos.*`, `repuestos.*`
- `bodegas.*`, `inventarios.*`, `movimientos_inventario.*`
- `solicitudes_repuestos.*`, `pedidos_bodega_central.*`
- `usuarios.list`, `roles.list`, `fallas.list`, `causas.list`
- `accesorios.list`, `guias.list`, `presupuestos.*`
- `familias_producto.list`, `centros_de_servicio.list`
