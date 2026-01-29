import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RefreshCw, CheckCircle2 } from "lucide-react";
import { TaskCard } from "./TaskCard";
import type { TareaWS, TipoTareaWS } from "@/types/waterspider";

interface TaskListProps {
  tareas: TareaWS[];
  filtroTipo: TipoTareaWS | null;
  onConfirmarEntregas: (ids: number[], tipo: TipoTareaWS) => Promise<void>;
  isLoading: boolean;
  onRefresh: () => void;
}

export function TaskList({ tareas, filtroTipo, onConfirmarEntregas, isLoading, onRefresh }: TaskListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [procesando, setProcesando] = useState(false);

  const tareasFiltradas = filtroTipo 
    ? tareas.filter(t => t.tipo === filtroTipo)
    : tareas;

  const tareasOrdenadas = [...tareasFiltradas].sort((a, b) => {
    // Ordenar por prioridad (critico > urgente > normal) y luego por tiempo de espera
    const prioridadOrden = { critico: 0, urgente: 1, normal: 2 };
    const prioridadDiff = prioridadOrden[a.prioridad] - prioridadOrden[b.prioridad];
    if (prioridadDiff !== 0) return prioridadDiff;
    return b.tiempo_espera_minutos - a.tiempo_espera_minutos;
  });

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllFiltradas = () => {
    if (selectedIds.size === tareasOrdenadas.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tareasOrdenadas.map(t => t.id)));
    }
  };

  const handleConfirmar = async () => {
    if (selectedIds.size === 0) return;
    
    const tareasSeleccionadas = tareas.filter(t => selectedIds.has(t.id));
    const tiposPorProcesar = [...new Set(tareasSeleccionadas.map(t => t.tipo))];

    setProcesando(true);
    try {
      for (const tipo of tiposPorProcesar) {
        const idsDelTipo = tareasSeleccionadas
          .filter(t => t.tipo === tipo)
          .map(t => t.id);
        await onConfirmarEntregas(idsDelTipo, tipo);
      }
      setSelectedIds(new Set());
    } finally {
      setProcesando(false);
    }
  };

  const allSelected = tareasOrdenadas.length > 0 && selectedIds.size === tareasOrdenadas.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Lista de Tareas
            {filtroTipo && (
              <span className="text-muted-foreground font-normal ml-2">
                ({tareasOrdenadas.length} {filtroTipo})
              </span>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {tareasOrdenadas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {filtroTipo 
              ? `No hay tareas pendientes de tipo "${filtroTipo}"`
              : "No hay tareas pendientes"}
          </div>
        ) : (
          <>
            {/* Controles de selección */}
            <div className="flex items-center justify-between pb-2 border-b">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={selectAllFiltradas}
                />
                <span className="text-sm">
                  {allSelected ? "Deseleccionar todos" : "Seleccionar todos"}
                </span>
              </label>

              <Button
                onClick={handleConfirmar}
                disabled={selectedIds.size === 0 || procesando}
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirmar Entrega ({selectedIds.size})
              </Button>
            </div>

            {/* Lista de tareas */}
            <div className="space-y-2">
              {tareasOrdenadas.map(tarea => (
                <TaskCard
                  key={tarea.id}
                  tarea={tarea}
                  isSelected={selectedIds.has(tarea.id)}
                  onToggleSelect={toggleSelect}
                />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
