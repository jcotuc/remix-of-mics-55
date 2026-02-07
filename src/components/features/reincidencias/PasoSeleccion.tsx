import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Search, AlertCircle, CheckCircle2, User, Package, FileText, Calendar } from "lucide-react";
import { formatFechaCorta } from "@/utils/dateFormatters";
import { toast } from "sonner";
import type { IncidenteParaVerificar, VerificacionReincidencia } from "./types";
import { mycsapi } from "@/mics-api";

interface PasoSeleccionProps {
  incidenteActual: IncidenteParaVerificar | null;
  onIncidenteChange: (incidente: IncidenteParaVerificar | null) => void;
}

export function PasoSeleccion({
  incidenteActual,
  onIncidenteChange,
}: PasoSeleccionProps) {
  const [codigoBusqueda, setCodigoBusqueda] = useState(incidenteActual?.codigo || "");
  const [loading, setLoading] = useState(false);

  const handleBuscar = useCallback(async () => {
    if (!codigoBusqueda.trim()) {
      toast.error("Ingrese un código de incidente");
      return;
    }

    setLoading(true);
    try {
      // Search incident by code
      const response = await mycsapi.get("/api/v1/incidentes", { query: { limit: 1000 } }) as any;
      const incidentes = response.results || [];
      
      const found = incidentes.find(
        (i: any) => i.codigo?.toUpperCase() === codigoBusqueda.trim().toUpperCase()
      );

      if (!found) {
        toast.error(`No se encontró el incidente ${codigoBusqueda}`);
        onIncidenteChange(null);
        return;
      }

      // Check if verification already exists
      let verificacionExistente: VerificacionReincidencia | null = null;
      try {
        const verRes = await mycsapi.get("/api/v1/verificaciones-reincidencia", { query: {
          incidente_id: found.id,
        } }) as any as { result: any | null };
        if (verRes.result) {
          const vr = verRes.result;
          verificacionExistente = {
            ...vr,
            evidencias_urls: vr.evidencias_urls || [],
            problema_actual: vr.problema_actual || null,
            problema_anterior: vr.problema_anterior || null,
            dias_desde_reparacion: vr.dias_desde_reparacion || null,
            created_at: vr.verificado_at || vr.created_at,
            updated_at: vr.verificado_at || vr.updated_at,
          };
        }
      } catch {
        // No verification exists
      }

      const incidente: IncidenteParaVerificar = {
        id: found.id,
        codigo: found.codigo,
        cliente_id: found.cliente?.id || 0,
        producto_id: found.producto?.id || null,
        descripcion_problema: found.descripcion_problema,
        estado: found.estado,
        fecha_ingreso: found.created_at,
        fecha_entrega: null,
        cliente: found.cliente
          ? { id: found.cliente.id, nombre: found.cliente.nombre, codigo: found.cliente.codigo }
          : undefined,
        producto: found.producto
          ? { id: found.producto.id, codigo: found.producto.codigo, descripcion: found.producto.descripcion }
          : undefined,
        verificacion_existente: verificacionExistente,
      };

      onIncidenteChange(incidente);
      toast.success(`Incidente ${found.codigo} cargado`);
    } catch (error) {
      console.error("Error buscando incidente:", error);
      toast.error("Error al buscar el incidente");
    } finally {
      setLoading(false);
    }
  }, [codigoBusqueda, onIncidenteChange]);

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar Incidente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Ingrese código del incidente (ej: INC-000001)"
              value={codigoBusqueda}
              onChange={(e) => setCodigoBusqueda(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
              className="flex-1"
            />
            <Button onClick={handleBuscar} disabled={loading}>
              {loading ? "Buscando..." : "Buscar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alert if verification exists */}
      {incidenteActual?.verificacion_existente && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Verificación Previa Encontrada</AlertTitle>
          <AlertDescription>
            Este incidente ya fue verificado el{" "}
            {formatFechaCorta(incidenteActual.verificacion_existente.verificado_at)}.
            Resultado:{" "}
            <strong>
              {incidenteActual.verificacion_existente.es_reincidencia
                ? "Es reincidencia"
                : "No es reincidencia"}
            </strong>
            . Puede continuar para crear una nueva verificación.
          </AlertDescription>
        </Alert>
      )}

      {/* Incident details */}
      {incidenteActual && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                📌 Incidente Seleccionado
              </span>
              <Badge variant="secondary">{incidenteActual.estado}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <strong>Código:</strong> {incidenteActual.codigo}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <strong>Ingreso:</strong>{" "}
                  {formatFechaCorta(incidenteActual.fecha_ingreso || "")}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <strong>Cliente:</strong>{" "}
                  {incidenteActual.cliente?.nombre || `ID ${incidenteActual.cliente_id}`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <strong>Producto:</strong>{" "}
                  {incidenteActual.producto?.descripcion ||
                    incidenteActual.producto?.codigo ||
                    "Sin producto"}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t">
              <p className="text-sm">
                <strong>Problema reportado:</strong>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                "{incidenteActual.descripcion_problema || "Sin descripción"}"
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!incidenteActual && !loading && (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Busque un incidente para comenzar la verificación</p>
        </div>
      )}
    </div>
  );
}
