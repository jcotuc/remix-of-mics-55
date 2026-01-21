# Memory: migration/overall-status-and-progress
Updated: Now

## Progreso General de Migración

```
████████████████████████████████░░░░ 36% (27/75 páginas libres de Supabase)
```

**Total de archivos en src/pages:** 75  
**Páginas 100% migradas (sin imports Supabase):** 27  
**Páginas con imports Supabase restantes:** 48

---

## ✅ Páginas 100% Libres de Supabase (27)

Estas páginas ya NO tienen ningún import de `@/integrations/supabase/client`:

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
| 14 | `src/pages/logistica/Embarques.tsx` | `embarques.list`, `embarques.create` ✅ NEW |
| 15 | `src/pages/logistica/SalidaMaquinas.tsx` | `incidentes.list` ✅ NEW |
| 16 | `src/pages/gerencia/DashboardGerente.tsx` | `incidentes.list`, `inventarios.list` |
| 17 | `src/pages/gerencia/DashboardSupervisorRegional.tsx` | `incidentes.list` ✅ NEW |
| 18 | `src/pages/calidad/DashboardSupervisorCalidad.tsx` | `incidentes.list` |
| 19 | `src/pages/calidad/ControlCalidadDashboard.tsx` | `incidentes.list` ✅ NEW |
| 20 | `src/pages/calidad/VerificacionReincidencias.tsx` | `incidentes.list` ✅ NEW |
| 21 | `src/pages/sac/DashboardSupervisorSAC.tsx` | `incidentes.list`, `usuarios.list` |
| 22 | `src/pages/taller/DashboardJefeTaller.tsx` | `incidentes.list`, `usuarios.list`, `diagnosticos.list` |
| 23 | `src/pages/taller/ConfiguracionColas.tsx` | `grupos_cola_fifo.*` |
| 24 | `src/pages/bodega/Despieces.tsx` | N/A |
| 25 | `src/pages/bodega/DetalleSolicitud.tsx` | N/A |
| 26 | `src/pages/bodega/DashboardJefeBodega.tsx` | N/A |
| 27 | `src/pages/bodega/DashboardSupervisorBodega.tsx` | N/A |

---

## 🔄 Páginas Parcialmente Migradas (Con apiBackendAction + Supabase)

| Página | Actions Usadas | Supabase Directo Para |
|--------|----------------|----------------------|
| `mostrador/Incidentes.tsx` | `incidentes.list`, `clientes.list`, `productos.list` | Writes |
| `mostrador/EntregaMaquinas.tsx` | `incidentes.list`, `clientes.list` | Updates |
| `mostrador/ConsultaPrecios.tsx` | `clientes.list`, `productos.search` | `cotizaciones` insert |
| `taller/DiagnosticoInicial.tsx` | `incidentes.get`, `fallas.list`, `causas.list` | `diagnosticos` CRUD |
| `taller/PendientesRepuestos.tsx` | `incidentes.list`, `clientes.list` | `solicitudes_repuestos` |
| `taller/MisAsignaciones.tsx` | `incidentes.list` | junction tables |
| `taller/Asignaciones.tsx` | `incidentes.list` | junction tables |
| `taller/BusquedaIncidentes.tsx` | `incidentes.list`, `diagnosticos.search` | `media` |
| `bodega/Solicitudes.tsx` | `solicitudes_repuestos.list` | Updates |
| `bodega/MovimientosInventario.tsx` | `repuestos.search` | inserts |
| `logistica/IngresoMaquinas.tsx` | `incidentes.list`, `embarques.list` | N/A |
| `logistica/Guias.tsx` | `guias.list` | complex zigo integration |
| `sac/IncidentesSAC.tsx` | `incidentes.list` | `asignaciones_sac` |
| `sac/DetalleIncidenteSAC.tsx` | `incidentes.get`, `diagnosticos.search` | `media` |

---

## ❌ Páginas Pendientes (48 restantes)

### Admin Module (11)
- `admin/AccesoriosFamilias.tsx`
- `admin/AuditLogs.tsx`
- `admin/CentrosServicio.tsx`
- `admin/FallasCausas.tsx`
- `admin/FamiliasProductos.tsx`
- `admin/GestionPermisos.tsx`
- `admin/ImportarDespieces.tsx`
- `admin/InventarioAdmin.tsx`
- `admin/RecomendacionesFamilias.tsx`
- `admin/SustitutosRepuestos.tsx`
- `admin/Usuarios.tsx`

### Bodega Module (15)
- `bodega/AbastecimientoCentros.tsx`
- `bodega/AnalisisYAbastecimiento.tsx`
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

### Logística Module (3)
- `logistica/DanosTransporte.tsx`
- `logistica/FaltanteAccesorios.tsx`
- `logistica/GarantiasManuales.tsx`

### Mostrador Module (3)
- `mostrador/DetalleEntrega.tsx`
- `mostrador/HerramientasManuales.tsx`
- `mostrador/SeguimientoIncidente.tsx`

### SAC Module (1)
- `sac/ConsultaExistencias.tsx`

### Taller Module (11)
- `taller/AprobacionesStockCemaco.tsx`
- `taller/AsignacionTecnicos.tsx`
- `taller/CambioGarantia.tsx`
- `taller/DetallePendienteRepuesto.tsx`
- `taller/PedidosBodegaCentral.tsx`
- `taller/Reasignaciones.tsx`
- `taller/RevisionStockCemaco.tsx`
- `taller/Solicitudes.tsx`
- `taller/Transferencias.tsx`
- `taller/WaterspiderEntrega.tsx`
- `taller/WaterspiderPendientes.tsx`

### Root Pages (6)
- `ActualizarCodigos.tsx`
- `Auth.tsx`
- `Clientes.tsx`
- `ClientesUnificado.tsx`
- `ImportarClientes.tsx`
- `NuevoIncidente.tsx`
- `Repuestos.tsx`

---

## Handlers en api-backend.ts

### Full CRUD
- `clientes.*`, `grupos_cola_fifo.*`, `grupos_cola_fifo_familias.*`, `embarques.*`

### Read Operations
- `productos.*`, `incidentes.*`, `diagnosticos.*`, `repuestos.*`
- `bodegas.*`, `inventarios.*`, `movimientos_inventario.*`
- `solicitudes_repuestos.*`, `pedidos_bodega_central.*`
- `importaciones.*`, `ubicaciones.*`, `transitos_bodega.*`
- `usuarios.list`, `roles.list`, `fallas.list`, `causas.list`
- `accesorios.list`, `guias.list`, `presupuestos.*`
- `familias_producto.list`, `centros_de_servicio.list`
