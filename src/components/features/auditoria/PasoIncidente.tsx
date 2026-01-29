/**
 * PasoIncidente - Step 1: Select incident and basic audit data
 */

import { useState, useEffect, useCallback } from "react";
import { apiBackendAction } from "@/lib/api-backend";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Building2, User, Package, Loader2, X, CheckCircle2 } from "lucide-react";
import type { AuditoriaFormData, IncidenteParaAuditoria } from "./types";

interface PasoIncidenteProps {
  formData: AuditoriaFormData;
  onFormDataChange: (data: Partial<AuditoriaFormData>) => void;
  incidenteSeleccionado: IncidenteParaAuditoria | null;
  onIncidenteChange: (incidente: IncidenteParaAuditoria | null) => void;
}

export function PasoIncidente({
  formData,
  onFormDataChange,
  incidenteSeleccionado,
  onIncidenteChange,
}: PasoIncidenteProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<IncidenteParaAuditoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Debounced search
  useEffect(() => {
    if (!searchTerm.trim() || searchTerm.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(() => {
      searchIncidentes();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const searchIncidentes = async () => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    try {
      const { results } = await apiBackendAction("incidentes.list", { limit: 50 });
      const filtered = (results || []).filter((inc: any) =>
        inc.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        ["REPARADO", "CAMBIO_POR_GARANTIA", "NOTA_DE_CREDITO", "EN_DIAGNOSTICO", "EN_REPARACION"].includes(inc.estado)
      ).slice(0, 10);
      setSearchResults(filtered.map((inc: any) => ({
        id: inc.id,
        codigo: inc.codigo,
        estado: inc.estado,
        centro_de_servicio_id: inc.centro_de_servicio_id,
        centro_de_servicio: inc.centro_de_servicio,
        producto: inc.producto,
        cliente: inc.cliente,
        aplica_garantia: inc.aplica_garantia,
        tipologia: inc.tipologia,
      })));
      setShowResults(true);
    } catch (error) {
      console.error("Error searching incidentes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectIncidente = (incidente: IncidenteParaAuditoria) => {
    onIncidenteChange(incidente);
    onFormDataChange({
      incidente_id: incidente.id,
      centro_servicio_id: incidente.centro_de_servicio_id,
      familia_producto_id: incidente.producto?.familia_id || null,
      tipologia_reparacion: incidente.aplica_garantia ? "GARANTIA" : "PRESUPUESTO",
    });
    setSearchResults([]);
    setSearchTerm("");
    setShowResults(false);
  };

  const clearSelection = () => {
    onIncidenteChange(null);
    onFormDataChange({
      incidente_id: null,
      centro_servicio_id: null,
      familia_producto_id: null,
    });
  };

  const getEstadoBadgeColor = (estado: string) => {
    switch (estado) {
      case "REPARADO": return "bg-green-100 text-green-800 border-green-200";
      case "EN_REPARACION": return "bg-blue-100 text-blue-800 border-blue-200";
      case "EN_DIAGNOSTICO": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "CAMBIO_POR_GARANTIA": return "bg-purple-100 text-purple-800 border-purple-200";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      {/* Incident Search */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Buscar Incidente
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Ingresa al menos 3 caracteres del código para buscar
          </p>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ej: INC-000001"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10 h-12 text-base"
              />
              {loading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
              )}
              {searchTerm && !loading && (
                <button
                  type="button"
                  onClick={() => { setSearchTerm(""); setSearchResults([]); setShowResults(false); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground/20"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute z-50 w-full mt-2 bg-card border rounded-lg shadow-lg divide-y max-h-72 overflow-y-auto">
                {searchResults.map((inc) => (
                  <button
                    key={inc.id}
                    type="button"
                    onClick={() => handleSelectIncidente(inc)}
                    className="w-full p-4 text-left hover:bg-accent transition-colors first:rounded-t-lg last:rounded-b-lg"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-foreground">{inc.codigo}</span>
                      <Badge className={getEstadoBadgeColor(inc.estado)}>
                        {inc.estado.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {inc.cliente?.nombre || "Sin cliente"}
                      </span>
                      <span className="truncate">
                        {inc.producto?.descripcion || "Sin producto"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* No results message */}
            {showResults && searchResults.length === 0 && !loading && searchTerm.length >= 3 && (
              <div className="absolute z-50 w-full mt-2 bg-card border rounded-lg shadow-lg p-4 text-center text-muted-foreground">
                No se encontraron incidentes con "{searchTerm}"
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Selected Incident Info */}
      {incidenteSeleccionado && (
        <Card className="border-2 border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                Incidente Seleccionado
              </CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4 mr-1" />
                Cambiar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl font-bold text-foreground">{incidenteSeleccionado.codigo}</span>
              <Badge className={getEstadoBadgeColor(incidenteSeleccionado.estado)}>
                {incidenteSeleccionado.estado.replace(/_/g, " ")}
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 p-2 bg-background/50 rounded-md">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Centro:</span>
                <span className="font-medium">{incidenteSeleccionado.centro_de_servicio?.nombre || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-background/50 rounded-md">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Cliente:</span>
                <span className="font-medium">{incidenteSeleccionado.cliente?.nombre || "N/A"}</span>
              </div>
              <div className="col-span-full flex items-center gap-2 p-2 bg-background/50 rounded-md">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Producto:</span>
                <span className="font-medium">{incidenteSeleccionado.producto?.descripcion || "N/A"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configuración de Auditoría</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Clasificacion */}
          <div>
            <Label className="mb-2 block">Clasificación</Label>
            <div className="flex gap-3">
              {(["DEPARTAMENTAL", "INTERNA"] as const).map((tipo) => (
                <Button
                  key={tipo}
                  type="button"
                  variant={formData.clasificacion === tipo ? "default" : "outline"}
                  onClick={() => onFormDataChange({ clasificacion: tipo })}
                  className="flex-1"
                >
                  {tipo}
                </Button>
              ))}
            </div>
          </div>

          {/* Tipo de Auditoria */}
          <div>
            <Label className="mb-2 block">Tipo de Auditoría</Label>
            <div className="flex gap-3">
              {(["PRESENCIAL", "VIRTUAL"] as const).map((tipo) => (
                <Button
                  key={tipo}
                  type="button"
                  variant={formData.tipo_auditoria_modalidad === tipo ? "default" : "outline"}
                  onClick={() => onFormDataChange({ tipo_auditoria_modalidad: tipo })}
                  className="flex-1"
                >
                  {tipo}
                </Button>
              ))}
            </div>
          </div>

          {/* Tipologia (auto-filled but editable) */}
          <div>
            <Label className="mb-2 block">Tipología de Reparación</Label>
            <div className="flex gap-3">
              {(["GARANTIA", "PRESUPUESTO"] as const).map((tipo) => (
                <Button
                  key={tipo}
                  type="button"
                  variant={formData.tipologia_reparacion === tipo ? "default" : "outline"}
                  onClick={() => onFormDataChange({ tipologia_reparacion: tipo })}
                  className="flex-1"
                >
                  {tipo === "GARANTIA" ? "Garantía" : "Presupuesto"}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
