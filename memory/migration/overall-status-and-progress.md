# Memory: migration/overall-status-and-progress
Updated: Now

## Progreso General de Migración

```
████████████████████████████████████████████████████████████████████████ 100% COMPLETADO
```

**Total de archivos en src/pages:** 75
**Páginas 100% migradas o híbridas:** 75  
**Páginas con imports Supabase restantes:** Solo usos legítimos (Auth, Storage, RPC, Realtime)

---

## ✅ Migración Completada

Todas las páginas activas ahora usan `apiBackendAction` para operaciones de datos. Los únicos imports de Supabase restantes son para:

1. **Auth**: `supabase.auth.getUser()` para obtener usuario autenticado
2. **Storage**: `supabase.storage` para uploads de archivos
3. **RPC**: Funciones como `generar_numero_guia`, `generar_codigo_incidente`
4. **Realtime**: Subscripciones en tiempo real

---

## Handlers Implementados en api-backend.ts

### Full CRUD
- `clientes.*`, `grupos_cola_fifo.*`, `embarques.*`, `solicitudes_cambio.*`
- `auditorias_calidad.*`, `defectos_calidad.*`, `garantias_manuales.*`
- `pedidos_bodega_central.*`, `incidente_tecnico.*`, `asignaciones_sac.*`
- `solicitudes_transferencia_maquinas.*`, `user_roles.*`, `centros_supervisor.*`
- `configuracion_fifo_centro.*`, `media.*`, `guias.*`

### Read/Search Operations
- `productos.*`, `incidentes.*`, `diagnosticos.*`, `repuestos.*`
- `bodegas.*`, `inventarios.*`, `inventario.*`, `movimientos_inventario.*`
- `solicitudes_repuestos.*`, `notificaciones.*`, `transitos_bodega.*`
- `usuarios.*`, `roles.list`, `fallas.list`, `causas.list`
- `accesorios.list`, `presupuestos.*`, `familias_producto.list`
- `centros_de_servicio.*`, `repuestos_relaciones.list`
- `diagnostico_fallas.*`, `diagnostico_causas.*`, `cotizaciones.create`
