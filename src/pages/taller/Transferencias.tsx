import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Truck, Plus, Search, CheckCircle2, XCircle, Clock, ArrowRight, Building2, RefreshCw, AlertTriangle, TrendingUp } from "lucide-react";
import { formatFechaCorta } from "@/utils/dateFormatters";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { mycsapi } from "@/mics-api";
import {
  AlertBanner,
  MetricCard,
  DistributionPieChart,
} from "@/components/shared/dashboard";

interface Transferencia {
  id: number;
  incidente_id: number;
  centro_origen_id: number;
  centro_destino_id: number;
  motivo: string | null;
  estado: string | null;
  created_at: string | null;
  incidente?: { codigo: string; producto_id: number | null } | null;
  centro_origen?: { nombre: string } | null;
  centro_destino?: { nombre: string } | null;
}

interface CentroServicio {
  id: number;
  nombre: string;
}

interface Incidente {
  id: number;
  codigo: string;
  producto_id: number | null;
  estado: string;
}

export default function Transferencias() {
  const { user } = useAuth();
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [centros, setCentros] = useState<CentroServicio[]>([]);
  const [incidentes, setIncidentes] = useState<Incidente[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedTransferencia, setSelectedTransferencia] = useState<Transferencia | null>(null);
  const [showTimelineDialog, setShowTimelineDialog] = useState(false);

  const [selectedIncidente, setSelectedIncidente] = useState("");
  const [selectedCentroDestino, setSelectedCentroDestino] = useState("");
  const [motivo, setMotivo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const transferenciasRes = await mycsapi.fetch("/api/v1/solicitudes-transferencia-maquinas", { method: "GET" }) as any;

      const centrosRes = await mycsapi.get("/api/v1/centros-de-servicio", {}) as any;
      const allCentros = ((centrosRes as any).results || (centrosRes as any).data || [])
        .filter((c: any) => c.activo);

      const incidentesRes = await mycsapi.get("/api/v1/incidentes", { query: { limit: 2000 } }) as any;
      const allIncidentes = (incidentesRes as any).results || [];
      
      const eligibleIncidentes = allIncidentes.filter((inc: any) => 
        ["EN_DIAGNOSTICO", "ESPERA_REPUESTOS", "REGISTRADO"].includes(inc.estado)
      );

      const centrosMap = new Map(allCentros.map((c: any) => [c.id, c.nombre]));
      
      const processedTransferencias: Transferencia[] = (transferenciasRes.results || []).map((t: any) => ({
        ...t,
        incidente: t.incidentes as { codigo: string; producto_id: number | null } | null,
        centro_origen: centrosMap.get(t.centro_origen_id) ? { nombre: centrosMap.get(t.centro_origen_id) } : null,
        centro_destino: centrosMap.get(t.centro_destino_id) ? { nombre: centrosMap.get(t.centro_destino_id) } : null,
      }));

      setTransferencias(processedTransferencias);
      setCentros(allCentros);
      setIncidentes(eligibleIncidentes.map((inc: any) => ({
        id: inc.id,
        codigo: inc.codigo,
        producto_id: inc.producto_id,
        estado: inc.estado,
      })));
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedIncidente || !selectedCentroDestino || !motivo.trim()) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    if (!user) {
      toast.error("Debes iniciar sesión");
      return;
    }

    setSubmitting(true);
    try {
      const usuario = await mycsapi.fetch("/api/v1/usuarios/by-email", { method: "GET", query: { email: user.email || "" } }) as any;

      const centroOrigenId = (usuario as any)?.centro_de_servicio_id || centros[0]?.id;

      await mycsapi.fetch("/api/v1/solicitudes-transferencia-maquinas", { method: "POST", body: {
        incidente_id: parseInt(selectedIncidente),
        centro_origen_id: centroOrigenId,
        centro_destino_id: parseInt(selectedCentroDestino),
        motivo: motivo.trim(),
        solicitado_por: (usuario as any)?.id || 0,
        estado: "PENDIENTE",
      } }) as any;

      toast.success("Solicitud de transferencia creada");
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al crear solicitud");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedIncidente("");
    setSelectedCentroDestino("");
    setMotivo("");
  };

  const getStatusBadge = (estado: string) => {
    switch (estado?.toUpperCase()) {
      case "PENDIENTE":
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Pendiente</Badge>;
      case "APROBADA":
        return <Badge className="bg-green-500 gap-1"><CheckCircle2 className="h-3 w-3" />Aprobada</Badge>;
      case "RECHAZADA":
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Rechazada</Badge>;
      case "EN_TRANSITO":
        return <Badge className="bg-blue-500 gap-1"><Truck className="h-3 w-3" />En Tránsito</Badge>;
      case "COMPLETADA":
        return <Badge className="bg-primary gap-1"><CheckCircle2 className="h-3 w-3" />Completada</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const filteredTransferencias = transferencias.filter((t) =>
    t.incidente?.codigo?.toLowerCase().includes(search.toLowerCase()) ||
    t.centro_destino?.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    t.centro_origen?.nombre?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate metrics
  const pendientes = transferencias.filter(t => t.estado === "PENDIENTE").length;
  const enTransito = transferencias.filter(t => t.estado === "EN_TRANSITO").length;
  const completadas = transferencias.filter(t => t.estado === "COMPLETADA").length;
  const rechazadas = transferencias.filter(t => t.estado === "RECHAZADA").length;

  // Status distribution data
  const statusDistributionData = [
    { name: "Pendiente", value: pendientes, color: "#6b7280" },
    { name: "En Tránsito", value: enTransito, color: "#3b82f6" },
    { name: "Completada", value: completadas, color: "#22c55e" },
    { name: "Rechazada", value: rechazadas, color: "#ef4444" },
  ].filter(d => d.value > 0);

  // Flow map data - count transfers between centers
  const flowData = transferencias.reduce((acc, t) => {
    const key = `${t.centro_origen_id}-${t.centro_destino_id}`;
    if (!acc[key]) {
      acc[key] = {
        origen: t.centro_origen?.nombre || "?",
        destino: t.centro_destino?.nombre || "?",
        count: 0
      };
    }
    acc[key].count++;
    return acc;
  }, {} as Record<string, { origen: string; destino: string; count: number }>);

  const topFlows = Object.values(flowData)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transferencias de Máquinas</h1>
          <p className="text-muted-foreground">
            Solicita y gestiona transferencias entre centros de servicio
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Solicitud
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva Solicitud de Transferencia</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Incidente a transferir</label>
                  <Select value={selectedIncidente} onValueChange={setSelectedIncidente}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar incidente" />
                    </SelectTrigger>
                    <SelectContent>
                      {incidentes.map((inc) => (
                        <SelectItem key={inc.id} value={inc.id.toString()}>
                          {inc.codigo} - Producto #{inc.producto_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Centro destino</label>
                  <Select value={selectedCentroDestino} onValueChange={setSelectedCentroDestino}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar centro" />
                    </SelectTrigger>
                    <SelectContent>
                      {centros.map((centro) => (
                        <SelectItem key={centro.id} value={centro.id.toString()}>
                          {centro.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Motivo de la transferencia</label>
                  <Textarea
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Explica por qué necesitas transferir esta máquina..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Crear Solicitud"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Alert for pending approvals */}
      {pendientes > 0 && (
        <AlertBanner
          variant="info"
          title={`${pendientes} solicitud${pendientes > 1 ? 'es' : ''} pendiente${pendientes > 1 ? 's' : ''} de aprobación`}
          description="Revisa las solicitudes que requieren tu atención"
        />
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          title="Total Solicitudes"
          value={transferencias.length}
          icon={<Truck className="h-5 w-5" />}
          iconColor="bg-primary/10 text-primary"
        />
        <MetricCard
          title="Pendientes"
          value={pendientes}
          icon={<Clock className="h-5 w-5" />}
          iconColor="bg-yellow-500/10 text-yellow-500"
          alert={pendientes > 3}
        />
        <MetricCard
          title="En Tránsito"
          value={enTransito}
          icon={<Truck className="h-5 w-5" />}
          iconColor="bg-blue-500/10 text-blue-500"
        />
        <MetricCard
          title="Completadas"
          value={completadas}
          icon={<CheckCircle2 className="h-5 w-5" />}
          iconColor="bg-green-500/10 text-green-500"
        />
      </div>

      {/* Charts and Flow Map Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Status Distribution */}
        {statusDistributionData.length > 0 && (
          <DistributionPieChart
            title="Estado de Solicitudes"
            data={statusDistributionData}
            height={200}
          />
        )}

        {/* Top Flows */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Principales Rutas de Transferencia
            </CardTitle>
            <CardDescription>Flujo de máquinas entre centros</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topFlows.length > 0 ? (
              topFlows.map((flow, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{flow.origen}</span>
                    <ArrowRight className="h-4 w-4 text-primary" />
                    <span className="font-medium">{flow.destino}</span>
                  </div>
                  <Badge variant="secondary">{flow.count}</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay transferencias registradas
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por código o centro..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Solicitudes de Transferencia</span>
            <Badge variant="secondary">{filteredTransferencias.length} resultados</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Incidente</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead></TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransferencias.map((t) => (
                  <TableRow 
                    key={t.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSelectedTransferencia(t);
                      setShowTimelineDialog(true);
                    }}
                  >
                    <TableCell>
                      <div>
                        <p className="font-mono font-medium">{t.incidente?.codigo}</p>
                        <p className="text-xs text-muted-foreground">Producto #{t.incidente?.producto_id}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{t.centro_origen?.nombre || "N/A"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <ArrowRight className="h-4 w-4 text-primary" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{t.centro_destino?.nombre || "N/A"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <p className="text-sm truncate">{t.motivo}</p>
                    </TableCell>
                    <TableCell>{getStatusBadge(t.estado || "")}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatFechaCorta(t.created_at || "")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTransferencia(t);
                          setShowTimelineDialog(true);
                        }}
                      >
                        Ver Detalle
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredTransferencias.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No hay solicitudes de transferencia
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Dialog */}
      <Dialog open={showTimelineDialog} onOpenChange={setShowTimelineDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalle de Transferencia</DialogTitle>
          </DialogHeader>
          {selectedTransferencia && (
            <div className="space-y-4 py-4">
              {/* Transfer Info */}
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Incidente:</span>
                  <span className="font-mono font-medium">{selectedTransferencia.incidente?.codigo}</span>
                </div>
                <div className="flex items-center justify-center gap-3 py-2">
                  <div className="text-center">
                    <Building2 className="h-5 w-5 mx-auto text-muted-foreground" />
                    <p className="text-sm font-medium mt-1">{selectedTransferencia.centro_origen?.nombre}</p>
                    <p className="text-xs text-muted-foreground">Origen</p>
                  </div>
                  <ArrowRight className="h-6 w-6 text-primary" />
                  <div className="text-center">
                    <Building2 className="h-5 w-5 mx-auto text-primary" />
                    <p className="text-sm font-medium mt-1">{selectedTransferencia.centro_destino?.nombre}</p>
                    <p className="text-xs text-muted-foreground">Destino</p>
                  </div>
                </div>
              </div>

              {/* Motivo */}
              <div>
                <p className="text-sm font-medium mb-1">Motivo</p>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                  {selectedTransferencia.motivo || "Sin motivo especificado"}
                </p>
              </div>

              {/* Timeline */}
              <div>
                <p className="text-sm font-medium mb-3">Timeline de Estado</p>
                <div className="space-y-3">
                  <TimelineItem
                    icon="📝"
                    title="Solicitada"
                    date={formatFechaCorta(selectedTransferencia.created_at || "")}
                    active={true}
                  />
                  <TimelineItem
                    icon={selectedTransferencia.estado === "RECHAZADA" ? "❌" : "✅"}
                    title={selectedTransferencia.estado === "RECHAZADA" ? "Rechazada" : "Aprobada"}
                    active={["APROBADA", "EN_TRANSITO", "COMPLETADA", "RECHAZADA"].includes(selectedTransferencia.estado || "")}
                    variant={selectedTransferencia.estado === "RECHAZADA" ? "error" : "success"}
                  />
                  {selectedTransferencia.estado !== "RECHAZADA" && (
                    <>
                      <TimelineItem
                        icon="🚛"
                        title="En Tránsito"
                        active={["EN_TRANSITO", "COMPLETADA"].includes(selectedTransferencia.estado || "")}
                      />
                      <TimelineItem
                        icon="📦"
                        title="Recibida"
                        active={selectedTransferencia.estado === "COMPLETADA"}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Current Status */}
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm text-muted-foreground">Estado actual:</span>
                {getStatusBadge(selectedTransferencia.estado || "")}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTimelineDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TimelineItem({ 
  icon, 
  title, 
  date, 
  active = false,
  variant = "default"
}: { 
  icon: string; 
  title: string; 
  date?: string; 
  active?: boolean;
  variant?: "default" | "success" | "error";
}) {
  return (
    <div className={`flex items-start gap-3 ${!active ? "opacity-40" : ""}`}>
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center text-sm
        ${variant === "error" ? "bg-red-100 dark:bg-red-900/30" : 
          variant === "success" ? "bg-green-100 dark:bg-green-900/30" : 
          "bg-muted"}
      `}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{title}</p>
        {date && <p className="text-xs text-muted-foreground">{date}</p>}
        {!active && !date && <p className="text-xs text-muted-foreground">Pendiente...</p>}
      </div>
      {active && (
        <CheckCircle2 className={`h-4 w-4 ${
          variant === "error" ? "text-red-500" : "text-green-500"
        }`} />
      )}
    </div>
  );
}
