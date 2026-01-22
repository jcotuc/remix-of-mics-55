import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, RefreshCw, Search, User, ArrowRight } from "lucide-react";
import { differenceInDays } from "date-fns";
import { toast } from "sonner";
import { formatLogEntry } from "@/utils/dateFormatters";
import { apiBackendAction } from "@/lib/api-backend";

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

export default function Reasignaciones() {
  const [incidentes, setIncidentes] = useState<Incidente[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTecnico, setFilterTecnico] = useState<string>("all");
  
  // Dialog state
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
      // Fetch incidentes via Registry
      const incidentesRes = await apiBackendAction("incidentes.list", { limit: 2000 });
      const allIncidentes = (incidentesRes as any).results || [];
      
      // Filter by estado
      const filteredByEstado = allIncidentes.filter((inc: any) => 
        ["EN_DIAGNOSTICO", "ESPERA_REPUESTOS"].includes(inc.estado)
      );
      
      const incidenteIds = filteredByEstado.map((i: any) => i.id);

      // Fetch tecnico assignments via apiBackendAction
      const asignacionesRes = await apiBackendAction("incidente_tecnico.list", { es_principal: true });
      const allAsignaciones = (asignacionesRes.results || []).filter((a: any) => 
        incidenteIds.includes(a.incidente_id)
      );

      const tecnicoIds = [...new Set((allAsignaciones || []).map((a: any) => a.tecnico_id).filter(Boolean))] as number[];
      
      // Fetch usuarios via Registry
      const usuariosRes = await apiBackendAction("usuarios.list", {});
      const allUsuarios = (usuariosRes as any).results || [];
      
      const tecnicoProfiles: Record<number, { nombre: string; apellido: string | null }> = {};
      allUsuarios.forEach((u: any) => {
        if (tecnicoIds.includes(u.id)) {
          tecnicoProfiles[u.id] = { nombre: u.nombre, apellido: u.apellido };
        }
      });

      // Map asignaciones to incidentes
      const asignacionesMap = new Map(
        (allAsignaciones || []).map((a: any) => [a.incidente_id, a.tecnico_id])
      );

      // Filter only incidentes that have technician assigned
      const formattedData: Incidente[] = filteredByEstado
        .filter((item: any) => asignacionesMap.has(item.id))
        .map((item: any) => {
          const tecnicoId = asignacionesMap.get(item.id);
          return {
            ...item,
            cliente: item.cliente || null,
            producto: item.producto || null,
            tecnico_profile: tecnicoId ? tecnicoProfiles[tecnicoId] || null : null,
            tecnico_asignado_id_from_junction: tecnicoId || null,
          };
        });

      setIncidentes(formattedData);

      // Use all active users as potential technicians
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

      // Update junction table via apiBackendAction
      if (selectedIncidente.tecnico_asignado_id_from_junction) {
        await apiBackendAction("incidente_tecnico.update", {
          incidente_id: selectedIncidente.id,
          tecnico_id: nuevoTecnicoId,
          es_principal: true
        } as any);
      } else {
        await apiBackendAction("incidente_tecnico.create", {
          incidente_id: selectedIncidente.id,
          tecnico_id: nuevoTecnicoId,
          es_principal: true,
        } as any);
      }

      // Update observaciones in incidente via apiBackendAction
      const currentObs = selectedIncidente.observaciones || "";
      await apiBackendAction("incidentes.update", {
        id: selectedIncidente.id,
        data: {
          observaciones: currentObs ? `${currentObs}\n${logEntry}` : logEntry,
          updated_at: new Date().toISOString(),
        }
      } as any);

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

  const getDaysInStatus = (date: string | null) => {
    if (!date) return 0;
    return differenceInDays(new Date(), new Date(date));
  };

  const incidentesByTecnico = filteredIncidentes.reduce((acc, inc) => {
    const tecnicoName = inc.tecnico_profile 
      ? `${inc.tecnico_profile.nombre} ${inc.tecnico_profile.apellido || ''}`.trim()
      : "Sin asignar";
    if (!acc[tecnicoName]) acc[tecnicoName] = [];
    acc[tecnicoName].push(inc);
    return acc;
  }, {} as Record<string, Incidente[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reasignación de Incidentes</h1>
          <p className="text-muted-foreground">
            Reasigna incidentes entre técnicos según la carga de trabajo
          </p>
        </div>
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Técnicos con Carga</p>
                <p className="text-2xl font-bold">{Object.keys(incidentesByTecnico).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-secondary/10 rounded-full">
                <RefreshCw className="h-6 w-6 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Incidentes en Proceso</p>
                <p className="text-2xl font-bold">{incidentes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500/10 rounded-full">
                <ArrowRight className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Promedio por Técnico</p>
                <p className="text-2xl font-bold">
                  {Object.keys(incidentesByTecnico).length > 0 
                    ? Math.round(incidentes.length / Object.keys(incidentesByTecnico).length)
                    : 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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

      {/* Grouped by tecnico */}
      {Object.entries(incidentesByTecnico).map(([tecnico, incs]) => (
        <Card key={tecnico}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {tecnico}
              </span>
              <Badge variant="secondary">{incs.length} incidentes</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Días</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incs.map((inc) => (
                    <TableRow key={inc.id}>
                      <TableCell className="font-medium">{inc.codigo}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">#{inc.producto_id}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {inc.producto?.descripcion}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{inc.cliente?.nombre || "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{inc.estado}</Badge>
                      </TableCell>
                      <TableCell>{getDaysInStatus(inc.updated_at)} días</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReasignar(inc)}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Reasignar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}

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
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedIncidente.codigo}</p>
                <p className="text-sm text-muted-foreground">
                  Producto #{selectedIncidente.producto_id} - {selectedIncidente.producto?.descripcion}
                </p>
                <p className="text-sm mt-2">
                  <span className="text-muted-foreground">Técnico actual:</span>{" "}
                  <span className="font-medium">
                    {selectedIncidente.tecnico_profile 
                      ? `${selectedIncidente.tecnico_profile.nombre} ${selectedIncidente.tecnico_profile.apellido || ''}`.trim()
                      : "Sin asignar"}
                  </span>
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Nuevo técnico</label>
                <Select value={nuevoTecnico} onValueChange={setNuevoTecnico}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar técnico" />
                  </SelectTrigger>
                  <SelectContent>
                    {tecnicos.map((tec) => (
                      <SelectItem key={tec.id} value={tec.id.toString()}>
                        {tec.nombre} {tec.apellido || ''}
                      </SelectItem>
                    ))}
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
