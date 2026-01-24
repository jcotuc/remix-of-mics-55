# Estándares de Desarrollo - Plantilla Universal

> **Uso**: Copiar este documento a cualquier proyecto nuevo y personalizar la sección "Configuración del Proyecto" al final.

---

## Parte 1: Mejores Prácticas Universales

### 1.1 Principios Fundamentales

| Principio | Descripción |
|-----------|-------------|
| **DRY** | Si un patrón se repite 3+ veces, crear función/componente reutilizable |
| **Separación de responsabilidades** | Componentes = UI, Hooks = lógica, Services = datos |
| **Single Source of Truth** | Un solo lugar para tipos, constantes y estado global |
| **Backend Abstraction** | Nunca llamar APIs directamente desde componentes |

---

## 1.2 Arquitectura de 4 Capas

```
┌─────────────────────────────────────────────────────────────┐
│                      COMPONENTES                             │
│              (UI pura, sin lógica de datos)                  │
└─────────────────────────┬───────────────────────────────────┘
                          │ llama
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   apiBackendAction()                         │
│           (función tipada, punto único de entrada)           │
└─────────────────────────┬───────────────────────────────────┘
                          │ delega
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    api-backend.ts                            │
│     (handlers que implementan la lógica de cada acción)      │
└─────────────────────────┬───────────────────────────────────┘
                          │ usa
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase / API Externa / Mock                   │
│                (intercambiable sin tocar UI)                 │
└─────────────────────────────────────────────────────────────┘

Tipos definidos en: api-registry.ts
```

### Beneficios

| Beneficio | Descripción |
|-----------|-------------|
| **Cambio de backend** | Cambiar de Supabase a otro proveedor sin modificar componentes |
| **Testing simplificado** | Mockear un solo archivo (`api-backend.ts`) para todos los tests |
| **Tipos centralizados** | Contratos de entrada/salida validados en compilación |
| **Observabilidad** | Punto único para logs, métricas y manejo de errores |

---

## 1.3 Estructura de Proyecto

```
src/
├── components/
│   ├── ui/              # Primitivos (shadcn/radix) - NO MODIFICAR
│   ├── shared/          # Componentes reutilizables en toda la app
│   ├── layout/          # Layout, Sidebar, Header, Footer
│   └── features/        # Componentes por dominio de negocio
│       ├── [dominio1]/
│       └── [dominio2]/
├── hooks/
│   ├── queries/         # React Query hooks (useEntity, useEntities)
│   └── use*.ts          # Hooks de UI (useMediaQuery, useDebounce)
├── lib/
│   ├── api-registry.ts  # Contratos tipados de acciones
│   ├── api-backend.ts   # Implementación de handlers
│   └── utils.ts         # Helpers genéricos (cn, etc.)
├── utils/
│   ├── toastHelpers.ts  # Notificaciones estandarizadas
│   └── dateFormatters.ts # Formateo de fechas localizado
├── constants/
│   └── status.ts        # Labels, variantes, enums
├── contexts/
│   └── AuthContext.tsx  # Contexto de autenticación
├── pages/
│   └── [modulo]/        # Páginas organizadas por módulo/rol
├── routes/
│   └── [modulo]Routes.tsx # Rutas con lazy loading
└── integrations/
    └── supabase/
        ├── client.ts    # Cliente Supabase
        └── types.ts     # Tipos generados (READ-ONLY)
```

### Clasificación de Componentes

| Categoría | Ubicación | Cuándo usar |
|-----------|-----------|-------------|
| **UI primitivos** | `ui/` | Botones, inputs, modales base |
| **Compartidos** | `shared/` | Reutilizado en 3+ lugares |
| **Layout** | `layout/` | Estructura de página, navegación |
| **Features** | `features/[dominio]/` | Específico de un dominio de negocio |

---

## 1.4 API Backend Pattern

### Archivo: `api-registry.ts`

Define los contratos tipados para todas las acciones disponibles.

```typescript
// Template base - personalizar entidades
export type ActionRegistry = {
  // ═══════════════════════════════════════════════════════════
  // AUTH - Siempre incluir
  // ═══════════════════════════════════════════════════════════
  "auth.login": { 
    input: { email: string; password: string }; 
    output: { session: Session } 
  };
  "auth.logout": { 
    input: Record<string, never>; 
    output: void 
  };
  "auth.getUser": { 
    input: Record<string, never>; 
    output: { user: User | null } 
  };
  "auth.getSession": { 
    input: Record<string, never>; 
    output: { session: Session | null } 
  };
  "auth.me": { 
    input: Record<string, never>; 
    output: { result: UserProfile | null } 
  };

  // ═══════════════════════════════════════════════════════════
  // STORAGE - Siempre incluir
  // ═══════════════════════════════════════════════════════════
  "storage.upload": { 
    input: { bucket: string; path: string; file: File; options?: object }; 
    output: { url: string; storage_path: string } 
  };
  "storage.delete": { 
    input: { bucket: string; paths: string[] }; 
    output: void 
  };
  "storage.getPublicUrl": { 
    input: { bucket: string; path: string }; 
    output: { publicUrl: string } 
  };

  // ═══════════════════════════════════════════════════════════
  // ENTIDADES - Personalizar por proyecto
  // ═══════════════════════════════════════════════════════════
  "[entidad].list": { 
    input: { limit?: number; offset?: number; filters?: object }; 
    output: { results: Entidad[] } 
  };
  "[entidad].get": { 
    input: { id: number }; 
    output: { result: Entidad } 
  };
  "[entidad].create": { 
    input: EntidadInput; 
    output: Entidad 
  };
  "[entidad].update": { 
    input: { id: number; data: Partial<Entidad> }; 
    output: Entidad 
  };
  "[entidad].delete": { 
    input: { id: number }; 
    output: void 
  };
  "[entidad].search": { 
    input: { search: string; limit?: number }; 
    output: { results: Entidad[] } 
  };
};

export type ActionName = keyof ActionRegistry;
```

### Archivo: `api-backend.ts`

Implementa los handlers para cada acción.

```typescript
import { supabase } from "@/integrations/supabase/client";
import type { ActionRegistry, ActionName } from "./api-registry";

type ActionInput<T extends ActionName> = ActionRegistry[T]["input"];
type ActionOutput<T extends ActionName> = ActionRegistry[T]["output"];

export async function apiBackendAction<T extends ActionName>(
  action: T,
  input: ActionInput<T>
): Promise<ActionOutput<T>> {
  const [entity, operation] = action.split(".") as [string, string];

  // Handler lookup
  const handlers: Record<string, () => Promise<unknown>> = {
    // Auth handlers
    "auth.login": async () => { /* ... */ },
    "auth.logout": async () => { /* ... */ },
    
    // Storage handlers
    "storage.upload": async () => { /* ... */ },
    
    // Entity handlers - agregar por proyecto
    "[entidad].list": async () => { /* ... */ },
  };

  const handler = handlers[action];
  if (!handler) {
    throw new Error(`Action not implemented: ${action}`);
  }

  return handler() as Promise<ActionOutput<T>>;
}
```

### Uso en Componentes

```typescript
import { apiBackendAction } from "@/lib/api-backend";

// Consultar
const { results } = await apiBackendAction("entidad.list", { limit: 50 });
const { result } = await apiBackendAction("entidad.get", { id: 123 });

// Crear/Actualizar
await apiBackendAction("entidad.create", { ...datos });
await apiBackendAction("entidad.update", { id, data: { campo: "valor" } });

// Buscar
const { results } = await apiBackendAction("entidad.search", { search: "término" });

// Auth
const { session } = await apiBackendAction("auth.getSession", {});
const { result: profile } = await apiBackendAction("auth.me", {});
```

---

## 1.5 Excepciones Permitidas

Solo estos 3 patrones pueden usar el cliente Supabase directamente:

| Patrón | Archivo típico | Razón |
|--------|----------------|-------|
| `supabase.auth.onAuthStateChange()` | `AuthContext.tsx` | Listener de suscripción React |
| `supabase.functions.invoke()` | Cualquiera | Edge Functions no son CRUD |
| `supabase.channel()` | Componentes Realtime | Suscripciones en tiempo real |

```typescript
// ✅ PERMITIDO - Auth listener
supabase.auth.onAuthStateChange((event, session) => { /* ... */ });

// ✅ PERMITIDO - Edge Functions
await supabase.functions.invoke('nombre-funcion', { body });

// ✅ PERMITIDO - Realtime
supabase.channel('canal').on('postgres_changes', ...).subscribe();

// ❌ PROHIBIDO - Queries directas
const { data } = await supabase.from('tabla').select('*'); // Usar apiBackendAction
```

---

## 1.6 Utilidades Estándar

### Toast Helpers

```typescript
// src/utils/toastHelpers.ts
import { showError, showSuccess, showWarning, showInfo } from "@/utils/toastHelpers";

// ✅ Correcto
showError("No se pudo guardar");
showSuccess("Guardado correctamente");

// ❌ Evitar
toast({ title: "Error", description: "...", variant: "destructive" });
```

### Date Formatters

```typescript
// src/utils/dateFormatters.ts
import { 
  formatFechaCorta,    // dd/MM/yyyy
  formatFechaHora,     // dd/MM/yyyy HH:mm
  formatFechaLarga,    // dd de MMMM de yyyy
  formatHora,          // HH:mm
  formatFechaRelativa, // hace 2 días
  formatFechaInput,    // yyyy-MM-dd (inputs)
} from "@/utils/dateFormatters";

// ✅ Correcto
formatFechaCorta(fecha);

// ❌ Evitar
format(new Date(fecha), "dd/MM/yyyy", { locale: es });
```

---

## 1.7 Convenciones de Código

### Nombres

| Elemento | Convención | Ejemplo |
|----------|------------|---------|
| Componentes | PascalCase | `UserCard.tsx` |
| Hooks | camelCase + `use` | `useUser.ts` |
| Servicios | camelCase + `Service` | `userService.ts` |
| Utilidades | camelCase | `formatDate.ts` |
| Constantes | SCREAMING_SNAKE | `USER_ROLES` |
| Funciones | camelCase | `formatFechaCorta()` |

### Orden de Imports

```typescript
// 1. React/Router
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// 2. Componentes UI
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// 3. Iconos
import { ArrowLeft, Edit } from "lucide-react";

// 4. Hooks/Contexts
import { useAuth } from "@/contexts/AuthContext";
import { useEntity } from "@/hooks/queries/useEntity";

// 5. Servicios/Utils
import { apiBackendAction } from "@/lib/api-backend";
import { showSuccess } from "@/utils/toastHelpers";

// 6. Tipos
import type { Entity } from "@/types";
```

---

## 1.8 React Query Patterns

### Hooks de Query

```typescript
// src/hooks/queries/useEntity.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiBackendAction } from "@/lib/api-backend";

export function useEntity(id: number) {
  return useQuery({
    queryKey: ["entity", id],
    queryFn: () => apiBackendAction("entity.get", { id }),
    enabled: !!id,
  });
}

export function useEntities(filters?: object) {
  return useQuery({
    queryKey: ["entities", filters],
    queryFn: () => apiBackendAction("entity.list", { filters }),
  });
}

export function useUpdateEntity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) =>
      apiBackendAction("entity.update", { id, data }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["entity", id] });
      queryClient.invalidateQueries({ queryKey: ["entities"] });
    },
  });
}
```

### Uso en Componentes

```typescript
function EntityDetail({ id }: { id: number }) {
  const { data, isLoading, error } = useEntity(id);
  const updateMutation = useUpdateEntity();

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorDisplay error={error} />;

  const handleSave = async (data: object) => {
    await updateMutation.mutateAsync({ id, data });
    showSuccess("Guardado");
  };

  return <EntityForm data={data} onSave={handleSave} />;
}
```

---

## 1.9 Testing Guidelines

### Mockear apiBackendAction

```typescript
// src/test/mocks/api-backend.ts
import { vi } from "vitest";
import type { ActionRegistry, ActionName } from "@/lib/api-registry";

export const mockApiBackendAction = vi.fn();

export function setupMock<T extends ActionName>(
  action: T,
  response: ActionRegistry[T]["output"]
) {
  mockApiBackendAction.mockImplementation((actionName) => {
    if (actionName === action) return Promise.resolve(response);
    throw new Error(`Unmocked action: ${actionName}`);
  });
}

// En tests
vi.mock("@/lib/api-backend", () => ({
  apiBackendAction: mockApiBackendAction,
}));

setupMock("entity.get", { result: { id: 1, name: "Test" } });
```

### Estructura de Tests

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

describe("EntityCard", () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it("renders entity name", async () => {
    setupMock("entity.get", { result: { id: 1, name: "Test Entity" } });
    
    render(<EntityCard id={1} />, { wrapper });
    
    expect(await screen.findByText("Test Entity")).toBeInTheDocument();
  });
});
```

---

## 1.10 Performance Patterns

### Lazy Loading de Rutas

```typescript
// src/routes/index.tsx
import { lazy, Suspense } from "react";

const EntityList = lazy(() => import("@/pages/EntityList"));
const EntityDetail = lazy(() => import("@/pages/EntityDetail"));

export const routes = [
  {
    path: "/entities",
    element: (
      <Suspense fallback={<LoadingSkeleton />}>
        <EntityList />
      </Suspense>
    ),
  },
];
```

### Optimistic Updates

```typescript
const updateMutation = useMutation({
  mutationFn: updateEntity,
  onMutate: async (newData) => {
    await queryClient.cancelQueries({ queryKey: ["entity", id] });
    const previous = queryClient.getQueryData(["entity", id]);
    queryClient.setQueryData(["entity", id], newData);
    return { previous };
  },
  onError: (err, _, context) => {
    queryClient.setQueryData(["entity", id], context?.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ["entity", id] });
  },
});
```

---

## 1.11 Anti-Patrones

| ❌ Evitar | ✅ Hacer en su lugar |
|-----------|---------------------|
| Crear `mockData.ts` local | Usar datos de API o fixtures de test |
| Repetir lógica de toast | Usar `toastHelpers.ts` |
| Formatear fechas manualmente | Usar `dateFormatters.ts` |
| Hardcodear status labels | Usar `constants/status.ts` |
| Queries directas en componentes | Usar `apiBackendAction` o hooks |
| Rutas directas en App.tsx | Usar módulos en `routes/` |
| Crear tipos locales duplicados | Usar tipos de `supabase/types.ts` |

---

## 1.12 Security Checklist

- [ ] RLS habilitado en todas las tablas
- [ ] Políticas RLS por usuario/rol
- [ ] Validación de inputs en frontend Y backend
- [ ] Sanitización de datos antes de render
- [ ] API keys privadas en Edge Functions, no en cliente
- [ ] CORS configurado correctamente
- [ ] Rate limiting en Edge Functions sensibles

---

---

## Parte 2: Configuración del Proyecto

> **Personalizar esta sección para cada proyecto**

### Nombre del Proyecto

**[NOMBRE_PROYECTO]**

### Dominios de Negocio

| Dominio | Descripción | Ubicación |
|---------|-------------|-----------|
| `[dominio1]` | [Descripción] | `pages/[dominio1]/`, `features/[dominio1]/` |
| `[dominio2]` | [Descripción] | `pages/[dominio2]/`, `features/[dominio2]/` |

### Entidades Principales

| Entidad | Tabla DB | Acciones Implementadas |
|---------|----------|------------------------|
| `[Entidad1]` | `[tabla1]` | list, get, create, update, delete |
| `[Entidad2]` | `[tabla2]` | list, get, search |

### Rutas por Módulo

| Archivo | Módulo | Rutas principales |
|---------|--------|-------------------|
| `[modulo1]Routes.tsx` | [Descripción] | `/[ruta1]`, `/[ruta2]` |
| `[modulo2]Routes.tsx` | [Descripción] | `/[ruta3]`, `/[ruta4]` |

### Estado de Migración Backend

- [x] 100% migrado a `apiBackendAction`
- Excepciones documentadas:
  - `AuthContext.tsx` - `onAuthStateChange`
  - `[archivo].tsx` - `functions.invoke`
  - `[archivo].tsx` - `channel()`

### Verificación

```bash
# Verificar que no hay queries directas no autorizadas
grep -r "supabase\." src/ --include="*.tsx" --include="*.ts" \
  | grep -v api-backend \
  | grep -v "\.d\.ts" \
  | grep -v AuthContext \
  | grep -v [excepciones]
```

---

## Changelog

| Fecha | Cambio |
|-------|--------|
| [FECHA] | Documento inicial |
