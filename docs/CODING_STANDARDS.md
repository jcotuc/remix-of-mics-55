# Estándares de Desarrollo - Power Repair Flow

## Principios Fundamentales

### DRY (Don't Repeat Yourself)
- Si un patrón se repite 3+ veces, crear función/componente reutilizable
- Ubicar en `src/utils/`, `src/hooks/`, o `src/components/shared/`

---

## Estructura de Archivos

```
src/
├── components/          # Componentes UI
│   ├── ui/              # Shadcn/primitivos
│   ├── shared/          # Componentes compartidos
│   └── features/        # Componentes específicos de dominio
├── constants/           # Constantes y enums
├── contexts/            # React Contexts
├── data/                # Datos estáticos (evitar)
├── hooks/               # Custom hooks
│   └── queries/         # React Query hooks
├── lib/                 # Utilidades genéricas
├── pages/               # Páginas por módulo
│   ├── admin/
│   ├── bodega/
│   ├── calidad/
│   ├── gerencia/
│   ├── logistica/
│   ├── mostrador/
│   ├── sac/
│   └── taller/
├── routes/              # Rutas modulares con lazy loading
├── services/            # Servicios de dominio (API calls)
└── utils/               # Funciones utilitarias
```

---

## Utilidades Disponibles

### Toast Helpers (`src/utils/toastHelpers.ts`)
```typescript
import { showError, showSuccess, showWarning, showInfo } from "@/utils/toastHelpers";

// ✅ Correcto
showError("No se pudo guardar");
showSuccess("Guardado correctamente");

// ❌ Evitar - patrón manual
toast({ title: "Error", description: "...", variant: "destructive" });
```

### Date Formatters (`src/utils/dateFormatters.ts`)
```typescript
import { 
  formatFechaCorta,    // dd/MM/yyyy
  formatFechaHora,     // dd/MM/yyyy HH:mm
  formatFechaLarga,    // dd de MMMM de yyyy
  formatHora,          // HH:mm
  formatFechaRelativa, // hace 2 días
  formatFechaInput,    // yyyy-MM-dd (inputs)
  formatLogEntry       // [dd/MM/yyyy HH:mm] mensaje
} from "@/utils/dateFormatters";

// ✅ Correcto
formatFechaCorta(fecha);  // "20/01/2026"

// ❌ Evitar - patrón manual
format(new Date(fecha), "dd/MM/yyyy", { locale: es });
```

### Status Constants (`src/constants/status.ts`)
```typescript
import { STATUS_LABELS, STATUS_VARIANTS, getStatusLabel, getStatusBadgeProps } from "@/constants/status";
```

---

## Servicios de Dominio

### Patrón de Servicios
```typescript
// src/services/nombreService.ts
import { supabase } from "@/integrations/supabase/client";

export const nombreService = {
  async getById(id: string) {
    const { data, error } = await supabase.from("tabla").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  },
  
  async create(data: CreateDTO) {
    const { data: result, error } = await supabase.from("tabla").insert(data).select().single();
    if (error) throw error;
    return result;
  }
};
```

### Servicios Disponibles
- `incidenteService` - Operaciones de incidentes
- `diagnosticoService` - Operaciones de diagnósticos
- `clienteService` - Operaciones de clientes
- `solicitudService` - Operaciones de solicitudes de repuestos

---

## React Query Hooks

### Uso de Hooks
```typescript
import { useIncidente, useUpdateIncidente } from "@/hooks/queries/useIncidente";

// Consulta
const { data, isLoading, error } = useIncidente(id);

// Mutación
const updateMutation = useUpdateIncidente();
await updateMutation.mutateAsync({ id, data });
```

### Hooks Disponibles
- `useIncidente`, `useIncidentes`, `useCreateIncidente`, `useUpdateIncidente`
- `useDiagnostico`, `useCreateDiagnostico`, `useUpdateDiagnostico`
- `useCliente`, `useClientes`, `useSearchClientes`
- `useSolicitud`, `useSolicitudes`, `useCreateSolicitud`

---

## Orden de Imports

```typescript
// 1. React/Router
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

// 2. Componentes UI externos
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// 3. Iconos
import { ArrowLeft, Edit, Save } from "lucide-react";

// 4. Hooks y Contexts
import { useAuth } from "@/contexts/AuthContext";
import { useIncidente } from "@/hooks/queries/useIncidente";

// 5. Servicios y utilidades
import { incidenteService } from "@/services/incidenteService";
import { showError, showSuccess } from "@/utils/toastHelpers";
import { formatFechaCorta } from "@/utils/dateFormatters";

// 6. Tipos
import type { Database } from "@/integrations/supabase/types";
```

---

## Convenciones de Nombres

| Elemento | Convención | Ejemplo |
|----------|------------|---------|
| Componentes | PascalCase | `IncidenteCard.tsx` |
| Hooks | camelCase con `use` | `useIncidente.ts` |
| Servicios | camelCase con `Service` | `incidenteService.ts` |
| Utilidades | camelCase | `dateFormatters.ts` |
| Constantes | SCREAMING_SNAKE | `STATUS_LABELS` |
| Funciones | camelCase | `formatFechaCorta()` |

---

## Rutas Modulares

Las rutas están organizadas en `src/routes/` con lazy loading:

```typescript
// App.tsx simplificado
import { allRoutes, RouteLoadingFallback } from "./routes";

<Suspense fallback={<RouteLoadingFallback />}>
  <Routes>{allRoutes}</Routes>
</Suspense>
```

### Archivos de Rutas
- `mostradorRoutes.tsx` - Mostrador
- `tallerRoutes.tsx` - Taller
- `bodegaRoutes.tsx` - Bodega
- `logisticaRoutes.tsx` - Logística
- `adminRoutes.tsx` - Administración
- `sacRoutes.tsx` - SAC
- `calidadRoutes.tsx` - Calidad
- `gerenciaRoutes.tsx` - Gerencia

---

## Tipos de Supabase

```typescript
// Usar tipos generados
import type { Database } from "@/integrations/supabase/types";

type IncidenteDB = Database["public"]["Tables"]["incidentes"]["Row"];
type ClienteDB = Database["public"]["Tables"]["clientes"]["Row"];

// NO crear tipos locales duplicados - usar directamente de Supabase
```

---

## Anti-Patrones a Evitar

1. ❌ No crear archivos `mockData.ts` o `types/index.ts` locales
2. ❌ No repetir lógica de toast manualmente - usar `toastHelpers`
3. ❌ No formatear fechas manualmente - usar `dateFormatters`
4. ❌ No hardcodear status labels - usar `constants/status.ts`
5. ❌ No hacer queries directas en componentes - usar servicios/hooks
6. ❌ No tener rutas directas en App.tsx - usar módulos en `routes/`
