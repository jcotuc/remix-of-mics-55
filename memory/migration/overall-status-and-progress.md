# Memory: migration/overall-status-and-progress
Updated: Now

## Progreso General de Migración

```
██████████████████████████░░░░ 25% (19/75 páginas libres de Supabase)
```

**Total de archivos en src/pages:** 75  
**Páginas 100% migradas (sin imports Supabase):** 19  
**Páginas con imports Supabase restantes:** 56

---

## ✅ Páginas 100% Libres de Supabase (19)

Estas páginas ya NO tienen ningún import de `@/integrations/supabase/client`:

| # | Página | Actions Usadas |
|---|--------|----------------|
| 1 | `src/pages/Index.tsx` | `incidentes.list` |
| 2 | `src/pages/Productos.tsx` | Placeholder (no funcional) |
| 3 | `src/pages/DetalleCliente.tsx` | Placeholder (no funcional) |
| 4 | `src/pages/DetalleIncidente.tsx` | Placeholder (no funcional) |
| 5 | `src/pages/Incidentes.tsx` | Solo console.log |
| 6 | `src/pages/TestActions.tsx` | `clientes.list` |
| 7 | `src/pages/NotFound.tsx` | N/A (página estática) |
| 8 | `src/pages/logistica/ConsultaPreciosLogistica.tsx` | Datos mock |
| 9 | `src/pages/logistica/ConsultaUbicaciones.tsx` | Datos mock |
| 10 | `src/pages/logistica/Clientes.tsx` | `clientes.list` ✅ |
| 11 | `src/pages/logistica/DashboardJefeLogistica.tsx` | `guias.list`, `embarques.list`, `incidentes.list` ✅ NEW |
| 12 | `src/pages/gerencia/DashboardGerente.tsx` | `incidentes.list`, `inventarios.list` ✅ NEW |
| 13 | `src/pages/calidad/DashboardSupervisorCalidad.tsx` | `incidentes.list` ✅ NEW |
| 14 | `src/pages/bodega/Despieces.tsx` | N/A |
| 15 | `src/pages/bodega/DetalleSolicitud.tsx` | N/A |
| 16 | `src/pages/bodega/DashboardJefeBodega.tsx` | N/A |
| 17 | `src/pages/bodega/DashboardSupervisorBodega.tsx` | N/A |
| 18 | `src/pages/bodega/ListadoPicking.tsx` | N/A |
| 19 | `src/pages/taller/ConfiguracionColas.tsx` | `grupos_cola_fifo.*` |

---

## 🔄 Páginas Parcialmente Migradas (Con apiBackendAction + Supabase)

Estas usan `apiBackendAction` pero aún tienen imports directos de Supabase para operaciones no cubiertas:

| Página | Actions Usadas | Supabase Directo Para |
|--------|----------------|----------------------|
| `mostrador/Incidentes.tsx` | `incidentes.list`, `clientes.list`, `productos.list` | Writes, junction tables |
| `mostrador/EntregaMaquinas.tsx` | `incidentes.list`, `clientes.list` | Updates |
| `mostrador/ConsultaPrecios.tsx` | `clientes.list`, `productos.search` | `cotizaciones` insert |
| `taller/DiagnosticoInicial.tsx` | `incidentes.get`, `fallas.list`, `causas.list` | `diagnosticos` CRUD |
| `taller/PendientesRepuestos.tsx` | `incidentes.list`, `clientes.list` | `solicitudes_repuestos` |
| `taller/MisAsignaciones.tsx` | `incidentes.list` | `asignaciones_sac`, `incidente_tecnico` |
| `taller/Asignaciones.tsx` | `incidentes.list` | Junction tables |
| `taller/BusquedaIncidentes.tsx` | `incidentes.list`, `diagnosticos.search` | `media` queries |
| `bodega/Solicitudes.tsx` | `solicitudes_repuestos.list` | Updates, joins |
| `bodega/MovimientosInventario.tsx` | `repuestos.search` | `movimientos_inventario` insert |
| `logistica/Embarques.tsx` | `embarques.list` | `embarques` insert, `incidentes` insert |
| `logistica/IngresoMaquinas.tsx` | `incidentes.list`, `embarques.list` | Direct queries |
| `sac/IncidentesSAC.tsx` | `incidentes.list` | `asignaciones_sac` |
| `sac/DetalleIncidenteSAC.tsx` | `incidentes.get`, `diagnosticos.search` | `media`, `notificaciones` |

---

## ❌ Páginas Pendientes de Migrar (Supabase Directo Únicamente)

### Admin Module (11 páginas)
- [ ] `admin/AccesoriosFamilias.tsx`
- [ ] `admin/AuditLogs.tsx`
- [ ] `admin/CentrosServicio.tsx`
- [ ] `admin/FallasCausas.tsx`
- [ ] `admin/FamiliasProductos.tsx`
- [ ] `admin/GestionPermisos.tsx`
- [ ] `admin/ImportarDespieces.tsx`
- [ ] `admin/InventarioAdmin.tsx`
- [ ] `admin/RecomendacionesFamilias.tsx`
- [ ] `admin/SustitutosRepuestos.tsx`
- [ ] `admin/Usuarios.tsx`

### Bodega Module (13 páginas)
- [ ] `bodega/AbastecimientoCentros.tsx`
- [ ] `bodega/AnalisisYAbastecimiento.tsx`
- [ ] `bodega/ConsultaCardex.tsx`
- [ ] `bodega/DespachosDepartamentales.tsx`
- [ ] `bodega/DocumentosPendientes.tsx`
- [ ] `bodega/DocumentosUbicacion.tsx`
- [ ] `bodega/GestionRelacionesRepuestos.tsx`
- [ ] `bodega/GestionUbicaciones.tsx`
- [ ] `bodega/Importacion.tsx`
- [ ] `bodega/Inventario.tsx`
- [ ] `bodega/InventarioCiclico.tsx`
- [ ] `bodega/InventarioNuevo.tsx`
- [ ] `bodega/RecepcionImportacion.tsx`
- [ ] `bodega/ReubicacionRepuestos.tsx`
- [ ] `bodega/StockDepartamento.tsx`

### Calidad Module (4 páginas)
- [ ] `calidad/AnalisisDefectos.tsx`
- [ ] `calidad/AuditoriasCalidad.tsx`
- [ ] `calidad/ControlCalidadDashboard.tsx`
- [ ] `calidad/VerificacionReincidencias.tsx`

### Gerencia Module (1 página)
- [ ] `gerencia/AprobacionesGarantia.tsx`

### Logística Module (7 páginas)
- [ ] `logistica/DanosTransporte.tsx`
- [ ] `logistica/FaltanteAccesorios.tsx`
- [ ] `logistica/GarantiasManuales.tsx`
- [ ] `logistica/Guias.tsx`
- [ ] `logistica/MaquinasNuevasRT.tsx`
- [ ] `logistica/MaquinasPendientesEnvio.tsx`
- [ ] `logistica/SalidaMaquinas.tsx`

### Mostrador Module (3 páginas)
- [ ] `mostrador/DetalleEntrega.tsx`
- [ ] `mostrador/HerramientasManuales.tsx`
- [ ] `mostrador/SeguimientoIncidente.tsx`

### SAC Module (2 páginas)
- [ ] `sac/ConsultaExistencias.tsx`
- [ ] `sac/DashboardSupervisorSAC.tsx`

### Taller Module (12 páginas)
- [ ] `taller/AprobacionesStockCemaco.tsx`
- [ ] `taller/AsignacionTecnicos.tsx`
- [ ] `taller/CambioGarantia.tsx`
- [ ] `taller/DashboardJefeTaller.tsx`
- [ ] `taller/DetallePendienteRepuesto.tsx`
- [ ] `taller/PedidosBodegaCentral.tsx`
- [ ] `taller/Reasignaciones.tsx`
- [ ] `taller/RevisionStockCemaco.tsx`
- [ ] `taller/Solicitudes.tsx`
- [ ] `taller/Transferencias.tsx`
- [ ] `taller/WaterspiderEntrega.tsx`
- [ ] `taller/WaterspiderPendientes.tsx`

### Root Pages (6 páginas)
- [ ] `ActualizarCodigos.tsx`
- [ ] `Auth.tsx`
- [ ] `Clientes.tsx`
- [ ] `ClientesUnificado.tsx`
- [ ] `ImportarClientes.tsx`
- [ ] `NuevoIncidente.tsx`
- [ ] `Repuestos.tsx`

---

## Handlers Implementados en api-backend.ts

### Full CRUD
- `clientes.*` (list, get, create, update, delete, search)
- `grupos_cola_fifo.*` (list, get, create, update, delete)
- `grupos_cola_fifo_familias.*` (list, get, create, update, delete)

### Read Operations
- `productos.list`, `productos.get`, `productos.search`
- `incidentes.list`, `incidentes.get`, `incidentes.search`
- `diagnosticos.list`, `diagnosticos.get`, `diagnosticos.search`
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

---

## Próximos Pasos

1. **Prioridad Alta**: Migrar más dashboards (`DashboardJefeTaller`, `DashboardSupervisorSAC`)
2. **Prioridad Media**: Migrar páginas de Logística restantes
3. **Prioridad Baja**: Admin y páginas de configuración
