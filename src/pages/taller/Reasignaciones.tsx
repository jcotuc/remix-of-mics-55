import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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

interface Incidente {
  id: string;
  codigo: string;
  codigo_producto: string;
  codigo_tecnico: string | null;
  tecnico_asignado_id: string | null;
  status: string;
  log_observaciones: string | null;
  updated_at: string;
  cliente: { nombre: string } | null;
  producto: { descripcion: string } | null;
  tecnico_profile?: { nombre: string; apellido: string } | null;
}

interface Tecnico {
  user_id: string;
  nombre: string;
  apellido: string;
  email: string;
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
      // Fetch incidentes en diagnóstico - ahora usando tecnico_asignado_id
      const { data: incidentesData } = await supabase
        .from("incidentes")
        .select(`
          id,
          codigo,
          codigo_producto,
          codigo_tecnico,
          tecnico_asignado_id,
          status,
          updated_at,
          log_observaciones,
          clientes!incidentes_codigo_cliente_fkey(nombre),
          productos!incidentes_codigo_producto_fkey(descripcion)
        `)
        .in("status", ["En diagnostico", "Pendiente por repuestos"])
        .not("tecnico_asignado_id", "is", null)
        .order("updated_at", { ascending: true });

      // Obtener perfiles de técnicos para mostrar nombres
      const tecnicoIds = [...new Set((incidentesData || []).map(i => i.tecnico_asignado_id).filter(Boolean))];
      let tecnicoProfiles: Record<string, { nombre: string; apellido: string }> = {};
      
      if (tecnicoIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, nombre, apellido")
          .in("user_id", tecnicoIds);
        
        tecnicoProfiles = (profiles || []).reduce((acc, p) => {
          acc[p.user_id] = { nombre: p.nombre, apellido: p.apellido };
          return acc;
        }, {} as Record<string, { nombre: string; apellido: string }>);
      }

      const formattedData = (incidentesData || []).map(item => ({
        ...item,
        cliente: item.clientes,
        producto: item.productos,
        tecnico_profile: item.tecnico_asignado_id ? tecnicoProfiles[item.tecnico_asignado_id] : null,
      }));

      setIncidentes(formattedData);

      // Fetch técnicos
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "taller");

      if (rolesData && rolesData.length > 0) {
        const userIds = rolesData.map(r => r.user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, nombre, apellido, email")
          .in("user_id", userIds);

        setTecnicos(profilesData || []);
      }
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
      // Find tecnico name for display
      const tecnico = tecnicos.find(t => t.user_id === nuevoTecnico);
      const tecnicoCodigo = tecnico ? `${tecnico.nombre} ${tecnico.apellido}` : nuevoTecnico;
      const tecnicoAnterior = selectedIncidente.tecnico_profile 
        ? `${selectedIncidente.tecnico_profile.nombre} ${selectedIncidente.tecnico_profile.apellido}`
        : selectedIncidente.codigo_tecnico || "N/A";

      // Update incidente with new tecnico_asignado_id
      const logEntry = formatLogEntry(`Reasignado de ${tecnicoAnterior} a ${tecnicoCodigo}${motivoReasignacion ? `. Motivo: ${motivoReasignacion}` : ""}`);

      const { error } = await supabase
        .from("incidentes")
        .update({
          tecnico_asignado_id: nuevoTecnico,
          codigo_tecnico: tecnicoCodigo,
          log_observaciones: selectedIncidente.log_observaciones 
            ? `${selectedIncidente.log_observaciones}\n${logEntry}`
            : logEntry,
        })
        .eq("id", selectedIncidente.id);

      if (error) throw error;

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

  // Obtener técnicos únicos por tecnico_asignado_id con sus nombres
  const uniqueTecnicosMap = incidentes.reduce((acc, inc) => {
    if (inc.tecnico_asignado_id && inc.tecnico_profile) {
      const fullName = `${inc.tecnico_profile.nombre} ${inc.tecnico_profile.apellido}`;
      acc[inc.tecnico_asignado_id] = fullName;
    }
    return acc;
  }, {} as Record<string, string>);

  const filteredIncidentes = incidentes.filter(inc => {
    const matchesSearch = 
      inc.codigo.toLowerCase().includes(search.toLowerCase()) ||
      inc.codigo_producto.toLowerCase().includes(search.toLowerCase()) ||
      inc.cliente?.nombre?.toLowerCase().includes(search.toLowerCase());
    
    const matchesTecnico = filterTecnico === "all" || inc.tecnico_asignado_id === filterTecnico;
    
    return matchesSearch && matchesTecnico;
  });

  const getDaysInStatus = (date: string) => {
    return differenceInDays(new Date(), new Date(date));
  };

  // Group by tecnico using tecnico_asignado_id
  const incidentesByTecnico = filteredIncidentes.reduce((acc, inc) => {
    const tecnicoName = inc.tecnico_profile 
      ? `${inc.tecnico_profile.nombre} ${inc.tecnico_profile.apellido}`
      : inc.codigo_tecnico || "Sin asignar";
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
                placeholder="Buscar por código, producto o cliente..."
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
                          <p className="font-medium">{inc.codigo_producto}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {inc.producto?.descripcion}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{inc.cliente?.nombre || "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{inc.status}</Badge>
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
                  {selectedIncidente.codigo_producto} - {selectedIncidente.producto?.descripcion}
                </p>
                <p className="text-sm mt-2">
                  <span className="text-muted-foreground">Técnico actual:</span>{" "}
                  <span className="font-medium">
                    {selectedIncidente.tecnico_profile 
                      ? `${selectedIncidente.tecnico_profile.nombre} ${selectedIncidente.tecnico_profile.apellido}`
                      : selectedIncidente.codigo_tecnico || "Sin asignar"}
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
                      <SelectItem key={tec.user_id} value={tec.user_id}>
                        {tec.nombre} {tec.apellido}
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
                  Reasignando...
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