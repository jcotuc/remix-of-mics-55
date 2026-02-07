import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, RefreshCw, Search, User, ArrowRight, AlertTriangle, BarChart3, Clock } from "lucide-react";
import { differenceInDays } from "date-fns";
import { toast } from "sonner";
import { formatLogEntry } from "@/utils/dateFormatters";
import {
  AlertBanner,
  MetricCard,
  PriorityIndicator,
  getPriorityLevel,
  WorkloadChart,
  ProgressBarWithLabel,
} from "@/components/shared/dashboard";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { mycsapi } from "@/mics-api";

interface Incidente {
  id: number;
  codigo: string;
  estado: string;
  updated_at: string | null;
  producto_id: number | null;
  observaciones: string | null;
  cliente?: { nombre: string } | null;
  producto?: { descripcion: string } | null;
  tecnico_profile?: { nombre: string; apellido: string | null } | null;
  tecnico_asignado_id_from_junction?: number | null;
}

interface Tecnico {
  id: number;
  nombre: string;
  apellido: string | null;
  email: string | null;
}

function DraggableIncidentCard({ incidente, onReasignar }: { incidente: Incidente; onReasignar: (inc: Incidente) => void }) {
  const days = getDaysInStatus(incidente.updated_at);
  const priority = getPriorityLevel(days);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: incidente.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-3 bg-card border rounded-lg cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <PriorityIndicator level={priority} size="sm" />
            <span className="font-mono text-sm font-medium">{incidente.codigo}</span>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-1">
            {incidente.cliente?.nombre || "Sin cliente"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono">
            {days}d
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            onClick={(e) => {
              e.stopPropagation();
              onReasignar(incidente);
            }}
          >
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function getDaysInStatus(date: string | null) {
  if (!date) return 0;
  return differenceInDays(new Date(), new Date(date));
}

export default function Reasignaciones() {
  const [incidentes, setIncidentes] = useState<Incidente[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTecnico, setFilterTecnico] = useState<string>("all");
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedIncidente, setSelectedIncidente] = useState<Incidente | null>(null);
  const [nuevoTecnico, setNuevoTecnico] = useState("");
  const [motivoReasignacion, setMotivoReasignacion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const incidentesRes = await mycsapi.get("/api/v1/incidentes", { query: { limit: 2000 } });
      const allIncidentes = (incidentesRes as any).results || [];
      
      const filteredByEstado = allIncidentes.filter((inc: any) => 
        ["EN_DIAGNOSTICO", "ESPERA_REPUESTOS"].includes(inc.estado)
      );
      
      const incidenteIds = filteredByEstado.map((i: any) => i.id);

      const asignacionesRes = await mycsapi.fetch("/api/v1/incidente-tecnico", { method: "GET", query: { es_principal: true } }) as any;
      const allAsignaciones = (asignacionesRes.results || []).filter((a: any) => 
        incidenteIds.includes(a.incidente_id)
      );

      const tecnicoIds = [...new Set((allAsignaciones || []).map((a: any) => a.tecnico_id).filter(Boolean))] as number[];
      
      const usuariosRes = await mycsapi.get("/api/v1/usuarios/");
      const allUsuarios = (usuariosRes as any).results || [];
      
      const tecnicoProfiles: Record<number, { nombre: string; apellido: string | null }> = {};
      allUsuarios.forEach((u: any) => {
        if (tecnicoIds.includes(u.id)) {
          tecnicoProfiles[u.id] = { nombre: u.nombre, apellido: u.apellido };
        }
      });

      const asignacionesMap = new Map(
        (allAsignaciones || []).map((a: any) => [a.incidente_id, a.tecnico_id])
      );

      const formattedData: Incidente[] = filteredByEstado
        .filter((item: any) => asignacionesMap.has(item.id))
        .map((item: any) => {
          const tecnicoId = asignacionesMap.get(item.id);
          return {
            ...item,
            cliente: item.cliente || null,
            producto: item.producto || null,
            tecnico_profile: tecnicoId ? (tecnicoProfiles as any)[tecnicoId as any] || null : null,
            tecnico_asignado_id_from_junction: tecnicoId || null,
          };
        });

      setIncidentes(formattedData);

      const activeTecnicos = allUsuarios.filter((u: any) => u.activo);
      setTecnicos(activeTecnicos);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const handleReasignar = (incidente: Incidente) => {
    setSelectedIncidente(incidente);
    setNuevoTecnico("");
    setMotivoReasignacion("");
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedIncidente || !nuevoTecnico) {
      toast.error("Por favor selecciona un técnico");
      return;
    }

    setSubmitting(true);
    try {
      const nuevoTecnicoId = parseInt(nuevoTecnico);
      const tecnico = tecnicos.find(t => t.id === nuevoTecnicoId);
      const tecnicoCodigo = tecnico ? `${tecnico.nombre} ${tecnico.apellido || ''}`.trim() : nuevoTecnico;
      const tecnicoAnterior = selectedIncidente.tecnico_profile 
        ? `${selectedIncidente.tecnico_profile.nombre} ${selectedIncidente.tecnico_profile.apellido || ''}`.trim()
        : "N/A";

      const logEntry = formatLogEntry(`Reasignado de ${tecnicoAnterior} a ${tecnicoCodigo}${motivoReasignacion ? `. Motivo: ${motivoReasignacion}` : ""}`);

      if (selectedIncidente.tecnico_asignado_id_from_junction) {
        await mycsapi.fetch("/api/v1/incidente-tecnico/{id}".replace("{id}", String(nuevoTecnicoId)), { method: "PATCH", body: {
          incidente_id: selectedIncidente.id,
          tecnico_id: nuevoTecnicoId,
          es_principal: true
        } as any });
      } else {
        await mycsapi.fetch("/api/v1/incidente-tecnico", { method: "POST", body: {
          incidente_id: selectedIncidente.id,
          tecnico_id: nuevoTecnicoId,
          es_principal: true,
        } as any });
      }

      const currentObs = selectedIncidente.observaciones || "";
      await mycsapi.patch("/api/v1/incidentes/{incidente_id}", { path: { incidente_id: selectedIncidente.id }, body: {
          observaciones: currentObs ? `${currentObs}\n${logEntry}` : logEntry,
          updated_at: new Date().toISOString(),
        } as any });

      toast.success("Incidente reasignado correctamente");
      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al reasignar");
    } finally {
      setSubmitting(false);
    }
  };

  const uniqueTecnicosMap = incidentes.reduce((acc, inc) => {
    if (inc.tecnico_asignado_id_from_junction && inc.tecnico_profile) {
      const fullName = `${inc.tecnico_profile.nombre} ${inc.tecnico_profile.apellido || ''}`.trim();
      acc[inc.tecnico_asignado_id_from_junction.toString()] = fullName;
    }
    return acc;
  }, {} as Record<string, string>);

  const filteredIncidentes = incidentes.filter(inc => {
    const matchesSearch = 
      inc.codigo.toLowerCase().includes(search.toLowerCase()) ||
      inc.cliente?.nombre?.toLowerCase().includes(search.toLowerCase());
    
    const matchesTecnico = filterTecnico === "all" || 
      inc.tecnico_asignado_id_from_junction?.toString() === filterTecnico;
    
    return matchesSearch && matchesTecnico;
  });

  const incidentesByTecnico = filteredIncidentes.reduce((acc, inc) => {
    const tecnicoId = inc.tecnico_asignado_id_from_junction?.toString() || "0";
    const tecnicoName = inc.tecnico_profile 
      ? `${inc.tecnico_profile.nombre} ${inc.tecnico_profile.apellido || ''}`.trim()
      : "Sin asignar";
    if (!acc[tecnicoId]) acc[tecnicoId] = { name: tecnicoName, incidentes: [] };
    acc[tecnicoId].incidentes.push(inc);
    return acc;
  }, {} as Record<string, { name: string; incidentes: Incidente[] }>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate metrics
  const tecnicoCount = Object.keys(incidentesByTecnico).length;
  const avgPerTecnico = tecnicoCount > 0 ? Math.round(incidentes.length / tecnicoCount) : 0;
  
  const loadValues = Object.values(incidentesByTecnico).map(t => t.incidentes.length);
  const maxLoad = Math.max(...loadValues, 0);
  const minLoad = Math.min(...loadValues, 0);
  const imbalance = maxLoad - minLoad;
  const isImbalanced = imbalance > avgPerTecnico;

  // Workload chart data
  const workloadData = Object.entries(incidentesByTecnico)
    .map(([id, data]) => ({
      name: data.name.split(' ').slice(0, 2).join(' '),
      value: data.incidentes.length,
      max: Math.max(maxLoad, 10)
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reasignación de Incidentes</h1>
          <p className="text-muted-foreground">
            Balancea la carga de trabajo entre técnicos
          </p>
        </div>
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Imbalance Alert */}
      {isImbalanced && (
        <AlertBanner
          variant="warning"
          title="Desequilibrio de carga detectado"
          description={`El técnico con mayor carga tiene ${maxLoad} incidentes vs ${minLoad} del menor. Considera redistribuir.`}
        />
      )}

      {/* Balance Dashboard */}
      <Card className="bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-primary/10 rounded-full">
                <BarChart3 className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Balance de Carga</h3>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-sm text-muted-foreground">
                    Máx: <span className="font-bold text-foreground">{maxLoad}</span>
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Mín: <span className="font-bold text-foreground">{minLoad}</span>
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Promedio: <span className="font-bold text-foreground">{avgPerTecnico}</span>
                  </span>
                </div>
              </div>
            </div>
            <Badge 
              variant={isImbalanced ? "destructive" : "secondary"}
              className="text-sm px-3 py-1"
            >
              {isImbalanced ? "⚠️ Desequilibrado" : "✓ Balanceado"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          title="Técnicos Activos"
          value={tecnicoCount}
          icon={<User className="h-5 w-5" />}
          iconColor="bg-primary/10 text-primary"
        />
        <MetricCard
          title="Incidentes en Proceso"
          value={incidentes.length}
          icon={<RefreshCw className="h-5 w-5" />}
          iconColor="bg-blue-500/10 text-blue-500"
        />
        <MetricCard
          title="Promedio por Técnico"
          value={avgPerTecnico}
          icon={<BarChart3 className="h-5 w-5" />}
          iconColor="bg-green-500/10 text-green-500"
        />
        <MetricCard
          title="Diferencia Max-Min"
          value={imbalance}
          icon={<AlertTriangle className="h-5 w-5" />}
          iconColor={isImbalanced ? "bg-orange-500/10 text-orange-500" : "bg-muted text-muted-foreground"}
          alert={isImbalanced}
        />
      </div>

      {/* Workload Chart */}
      {workloadData.length > 0 && (
        <WorkloadChart
          title="Distribución de Carga por Técnico"
          data={workloadData}
          average={avgPerTecnico}
          maxValue={Math.max(maxLoad, 10)}
          height={200}
        />
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código o cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterTecnico} onValueChange={setFilterTecnico}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar por técnico" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los técnicos</SelectItem>
                {Object.entries(uniqueTecnicosMap).map(([id, name]) => (
                  <SelectItem key={id} value={id}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Kanban-style columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Object.entries(incidentesByTecnico)
          .sort((a, b) => b[1].incidentes.length - a[1].incidentes.length)
          .map(([tecnicoId, data]) => {
            const isOverloaded = data.incidentes.length > avgPerTecnico * 1.5;
            const isUnderloaded = data.incidentes.length < avgPerTecnico * 0.5 && avgPerTecnico > 0;
            
            return (
              <Card 
                key={tecnicoId}
                className={
                  isOverloaded 
                    ? "border-red-500/50 bg-red-50/50 dark:bg-red-950/10" 
                    : isUnderloaded 
                    ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/10"
                    : ""
                }
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-sm font-medium">{data.name}</CardTitle>
                    </div>
                    <Badge 
                      variant={isOverloaded ? "destructive" : isUnderloaded ? "secondary" : "outline"}
                    >
                      {data.incidentes.length}
                    </Badge>
                  </div>
                  <ProgressBarWithLabel
                    value={data.incidentes.length}
                    max={Math.max(maxLoad, 10)}
                    size="sm"
                    colorByProgress
                  />
                </CardHeader>
                <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
                  {data.incidentes
                    .sort((a, b) => getDaysInStatus(b.updated_at) - getDaysInStatus(a.updated_at))
                    .map((inc) => (
                      <DraggableIncidentCard
                        key={inc.id}
                        incidente={inc}
                        onReasignar={handleReasignar}
                      />
                    ))
                  }
                </CardContent>
              </Card>
            );
          })}
      </div>

      {Object.keys(incidentesByTecnico).length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No hay incidentes asignados a técnicos</p>
          </CardContent>
        </Card>
      )}

      {/* Reasignación Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reasignar Incidente</DialogTitle>
          </DialogHeader>
          {selectedIncidente && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <PriorityIndicator level={getPriorityLevel(getDaysInStatus(selectedIncidente.updated_at))} />
                  <span className="font-mono font-medium">{selectedIncidente.codigo}</span>
                  <Badge variant="outline" className="ml-auto">
                    {getDaysInStatus(selectedIncidente.updated_at)} días
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedIncidente.producto?.descripcion || `Producto #${selectedIncidente.producto_id}`}
                </p>
                <div className="flex items-center gap-2 pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Técnico actual:</span>
                  <span className="font-medium text-sm">
                    {selectedIncidente.tecnico_profile 
                      ? `${selectedIncidente.tecnico_profile.nombre} ${selectedIncidente.tecnico_profile.apellido || ''}`.trim()
                      : "Sin asignar"}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Nuevo técnico</label>
                <Select value={nuevoTecnico} onValueChange={setNuevoTecnico}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar técnico" />
                  </SelectTrigger>
                  <SelectContent>
                    {tecnicos
                      .filter(t => t.id !== selectedIncidente.tecnico_asignado_id_from_junction)
                      .map((tec) => {
                        const cargaActual = incidentes.filter(i => i.tecnico_asignado_id_from_junction === tec.id).length;
                        return (
                          <SelectItem key={tec.id} value={tec.id.toString()}>
                            <div className="flex items-center justify-between w-full gap-4">
                              <span>{tec.nombre} {tec.apellido || ''}</span>
                              <Badge variant="outline" className="text-xs">
                                {cargaActual} inc.
                              </Badge>
                            </div>
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Motivo (opcional)</label>
                <Textarea
                  value={motivoReasignacion}
                  onChange={(e) => setMotivoReasignacion(e.target.value)}
                  placeholder="Explica el motivo de la reasignación..."
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Confirmar Reasignación"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
