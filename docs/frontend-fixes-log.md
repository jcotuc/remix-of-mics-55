# Frontend Fixes Log (Migration to FastAPI)

This document tracks all frontend changes for syncing with other Lovable apps.

## Date: 2026-01-29

### Files Modified

| File | Change | Reason |
|------|--------|--------|
| src/api.ts | Added created_at, codigo to IncidenteSchema | FloatingIncidentsWidget needs these fields |
| src/lib/api-registry.ts | Added 7 new action types | Missing registry entries for auditoria/reincidencia |
| src/lib/api-backend.ts | Fixed async handlers, added new handlers | Return type mismatches (lines 562, 1235) |
| src/pages/DetalleIncidente.tsx | Import formatFechaHora, use correct type | Missing function and type errors |
| src/pages/taller/MisAsignaciones.tsx | Cast user.id to string | Type mismatch number vs string |
| src/pages/asesor/MisGarantias.tsx | Cast user.id to string | Type mismatch number vs string |
| src/lib/authService.ts | Updated response type cast | Missing user field access |
| src/pages/mostrador/EntregaMaquinas.tsx | Added type assertion to results | Unknown type access |
| src/components/features/auditoria/PasoDocumental.tsx | Added type assertion | Unknown array type |
| src/components/features/auditoria/PasoFisica.tsx | Added type assertion | Unknown array type |
| src/components/features/reincidencias/PasoSeleccion.tsx | Fixed spread types | Spread from unknown |

### Types Created

| File | Types Added |
|------|-------------|
| src/types/waterspider.ts | TareaWS, ZoneCount, TipoTareaWS |

### Registry Actions Added

- incidentes.listMyAssigned
- incidentes.search
- preguntas_auditoria.list
- auditoria_respuestas.createBatch
- verificaciones_reincidencia.getByIncidente
- verificaciones_reincidencia.create

### Known Issues (Require Backend Fix)

| File | Issue | Resolution |
|------|-------|------------|
| src/generated_sdk/client/client.gen.ts(79) | Unused @ts-expect-error directive | Regenerate SDK from backend after fixing the source issue |
