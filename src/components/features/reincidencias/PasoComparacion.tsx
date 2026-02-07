import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Package, User, FileText, Calendar, AlertCircle } from "lucide-react";
import { formatFechaCorta } from "@/utils/dateFormatters";
import { IncidenteHistorialCard } from "./IncidenteHistorialCard";
import { PERIODO_GARANTIA_DIAS } from "./types";
import type { IncidenteParaVerificar, IncidenteHistorial } from "./types";
import { mycsapi } from "@/mics-api";

interface PasoComparacionProps {
  incidenteActual: IncidenteParaVerificar;
  incidentesHistorial: IncidenteHistorial[];
  incidenteAnteriorId: number | null;
  filtroMismoProducto: boolean;
  onHistorialChange: (historial: IncidenteHistorial[]) => void;
  onAnteriorChange: (id: number | null) => void;
  onFiltroChange: (value: boolean) => void;
}

export function PasoComparacion({
  incidenteActual,
  incidentesHistorial,
  incidenteAnteriorId,
  filtroMismoProducto,
  onHistorialChange,
  onAnteriorChange,
  onFiltroChange,
}: PasoComparacionProps) {
  const [loading, setLoading] = useState(false);

  const calcularDiasDesdeReparacion = useCallback(
    (fechaEntrega: string | null): number => {
      if (!fechaEntrega) return -1;
      const entrega = new Date(fechaEntrega);
      const hoy = new Date();
      return Math.floor((hoy.getTime() - entrega.getTime()) / (1000 * 60 * 60 * 24));
    },
    []
  );

  const cargarHistorial = useCallback(async () => {
    if (!incidenteActual?.cliente_id) return;

    setLoading(true);
    try {
      const response = await mycsapi.get("/api/v1/incidentes", { query: { limit: 2000 } });
      const incidentes = response.results || [];

      // Filter previous incidents from same client
      const anteriores = incidentes
        .filter(
          (i: any) =>
            i.cliente?.id === incidenteActual.cliente_id &&
            ["REPARADO", "CAMBIO_POR_GARANTIA", "ENTREGADO"].includes(i.estado) &&
            i.id !== incidenteActual.id
        )
        .slice(0, 20)
        .map((i: any): IncidenteHistorial => {
          const diasDesde = calcularDiasDesdeReparacion(i.fecha_entrega);
          return {
            id: i.id,
            codigo: i.codigo,
            descripcion_problema: i.descripcion_problema,
            estado: i.estado,
            fecha_ingreso: i.fecha_ingreso || i.created_at,
            fecha_entrega: i.fecha_entrega,
            producto_id: i.producto?.id || null,
            producto: i.producto
              ? { id: i.producto.id, codigo: i.producto.codigo, descripcion: i.producto.descripcion }
              : undefined,
            dias_desde_reparacion: diasDesde,
            dentro_garantia: diasDesde >= 0 && diasDesde <= PERIODO_GARANTIA_DIAS,
            mismo_producto: incidenteActual.producto_id
              ? i.producto?.id === incidenteActual.producto_id
              : false,
          };
        });

      onHistorialChange(anteriores);
    } catch (error) {
      console.error("Error cargando historial:", error);
    } finally {
      setLoading(false);
    }
  }, [incidenteActual, calcularDiasDesdeReparacion, onHistorialChange]);

  useEffect(() => {
    if (incidentesHistorial.length === 0) {
      cargarHistorial();
    }
  }, [incidentesHistorial.length, cargarHistorial]);

  // Filter by same product if enabled
  const historialFiltrado = filtroMismoProducto
    ? incidentesHistorial.filter((i) => i.mismo_producto)
    : incidentesHistorial;

  return (
    <div className="space-y-6">
      {/* Current incident summary */}
      <Card className="border-primary bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            📌 Incidente Actual: {incidenteActual.codigo}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>
                <strong>Cliente:</strong>{" "}
                {incidenteActual.cliente?.nombre || `ID ${incidenteActual.cliente_id}`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span>
                <strong>Producto:</strong>{" "}
                {incidenteActual.producto?.descripcion || "Sin producto"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                <strong>Ingreso:</strong>{" "}
                {formatFechaCorta(incidenteActual.fecha_ingreso || "")}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t">
            <p className="text-sm">
              <FileText className="h-4 w-4 inline mr-1 text-muted-foreground" />
              <strong>Problema:</strong> "{incidenteActual.descripcion_problema || "Sin descripción"}"
            </p>
          </div>
        </CardContent>
      </Card>

      {/* History section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5" />
              📜 Historial del Cliente ({historialFiltrado.length} incidentes)
            </CardTitle>
            <div className="flex items-center gap-2">
              <Switch
                id="filtro-producto"
                checked={filtroMismoProducto}
                onCheckedChange={onFiltroChange}
              />
              <Label htmlFor="filtro-producto" className="text-sm">
                Solo mismo producto
              </Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando historial...
            </div>
          ) : historialFiltrado.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                {filtroMismoProducto
                  ? "No se encontraron incidentes anteriores del mismo producto"
                  : "No se encontraron incidentes anteriores para este cliente"}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Puede continuar indicando que no hay incidente anterior relacionado
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {historialFiltrado.map((inc) => (
                  <IncidenteHistorialCard
                    key={inc.id}
                    incidente={inc}
                    isSelected={incidenteAnteriorId === inc.id}
                    onSelect={() =>
                      onAnteriorChange(incidenteAnteriorId === inc.id ? null : inc.id)
                    }
                  />
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Legend */}
          <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Badge variant="destructive" className="text-[10px]">
                EN garantía
              </Badge>
              <span>= ≤{PERIODO_GARANTIA_DIAS} días desde entrega</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="text-[10px]">
                FUERA
              </Badge>
              <span>= &gt;{PERIODO_GARANTIA_DIAS} días desde entrega</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
