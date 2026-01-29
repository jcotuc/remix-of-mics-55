import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Package, Clock, ChevronRight, Calendar } from "lucide-react";
import { StatusBadge } from "@/components/shared";
import { formatFechaCorta } from "@/utils/dateFormatters";
import { differenceInDays } from "date-fns";

type IncidenteResumen = {
  id: number;
  codigo: string;
  estado: string;
  tipologia: string | null;
  descripcion_problema: string | null;
  created_at: string | null;
  producto?: { codigo: string; descripcion: string | null } | null;
};

type ClienteIncidentesHistorialProps = {
  incidentes: IncidenteResumen[];
};

const ESTADOS_FINALIZADOS = ["ENTREGADO", "CANCELADO", "CERRADO"];

export function ClienteIncidentesHistorial({ incidentes }: ClienteIncidentesHistorialProps) {
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState<"todos" | "activos" | "finalizados">("todos");

  const activos = incidentes.filter(i => !ESTADOS_FINALIZADOS.includes(i.estado));
  const finalizados = incidentes.filter(i => ESTADOS_FINALIZADOS.includes(i.estado));
  
  const porcentajeActivos = incidentes.length > 0 
    ? Math.round((activos.length / incidentes.length) * 100) 
    : 0;

  const incidentesFiltrados = filtro === "todos" 
    ? incidentes 
    : filtro === "activos" 
      ? activos 
      : finalizados;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Historial de Incidentes
          </CardTitle>
          <Tabs value={filtro} onValueChange={(v) => setFiltro(v as typeof filtro)}>
            <TabsList className="h-8">
              <TabsTrigger value="todos" className="text-xs px-3">
                Todos ({incidentes.length})
              </TabsTrigger>
              <TabsTrigger value="activos" className="text-xs px-3">
                Activos ({activos.length})
              </TabsTrigger>
              <TabsTrigger value="finalizados" className="text-xs px-3">
                Finalizados ({finalizados.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        {/* Barra de progreso visual */}
        {incidentes.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{activos.length} activos</span>
              <span>{finalizados.length} finalizados</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${porcentajeActivos}%` }}
              />
              <div 
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${100 - porcentajeActivos}%` }}
              />
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {incidentesFiltrados.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">
              {filtro === "todos" 
                ? "Este cliente no tiene incidentes registrados"
                : filtro === "activos"
                  ? "No hay incidentes activos"
                  : "No hay incidentes finalizados"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {incidentesFiltrados.map((inc) => {
              const diasTranscurridos = inc.created_at 
                ? differenceInDays(new Date(), new Date(inc.created_at))
                : null;
              
              return (
                <div
                  key={inc.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
                  onClick={() => navigate(`/mostrador/incidente/${inc.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-medium text-sm">{inc.codigo}</span>
                      <StatusBadge status={inc.estado} />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate">
                        {inc.producto?.codigo || "Sin producto"}
                      </span>
                      {inc.tipologia && (
                        <>
                          <span>•</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {inc.tipologia}
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right hidden sm:block">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {inc.created_at ? formatFechaCorta(inc.created_at) : "—"}
                      </div>
                      {diasTranscurridos !== null && diasTranscurridos > 0 && (
                        <p className={`text-xs ${diasTranscurridos > 7 ? "text-amber-600" : "text-muted-foreground"}`}>
                          hace {diasTranscurridos} días
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
