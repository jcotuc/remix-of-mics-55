import { useState, useEffect } from "react";
import type { IncidenteSchema } from "@/generated/actions.d";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle2, XCircle, Clock, Search, Eye, AlertTriangle, FileImage } from "lucide-react";
import { differenceInDays } from "date-fns";
import { formatFechaCorta } from "@/utils/dateFormatters";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { mycsapi } from "@/mics-api";

interface SolicitudCambio {
  id: number;
  incidente_id: number;
  tipo_cambio: string;
  justificacion: string;
  tecnico_solicitante: string;
  estado: string;
  fotos_urls: string[] | null;
  observaciones_aprobacion: string | null;
  created_at: string;
  incidente?: {
    id: number;
    codigo: string;
    producto_id: number | null;
    centro_de_servicio_id: number;
  };
}

export default function AprobacionesGarantia() {
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState<SolicitudCambio[]>([]);
  const [incidentesMap, setIncidentesMap] = useState<Record<number, IncidenteSchema>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("pendientes");

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSolicitud, setSelectedSolicitud] = useState<SolicitudCambio | null>(null);
  const [observaciones, setObservaciones] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSolicitudes();
  }, []);

  const fetchSolicitudes = async () => {
    try {
      const [solicitudesRes, incidentesRes, centrosSupervisorRes] = await Promise.all([
        mycsapi.fetch("/api/v1/solicitudes-cambio", { method: "GET", query: { limit: 500 } }),
        mycsapi.get("/api/v1/incidentes", { query: { limit: 2000 } }),
        mycsapi.fetch("/api/v1/centros-supervisor", { method: "GET" }),
      ]);

      const incidentes = incidentesRes.results || [];
      const centrosSupervisor = (centrosSupervisorRes as any).results || [];
      
      // Build incidentes map
      const iMap: Record<number, any> = {};
      incidentes.forEach((i: any) => {
        iMap[i.id] = i;
      });
      setIncidentesMap(iMap);

      // Get supervisor's assigned centers
      const centroIds = user 
        ? centrosSupervisor
            .filter((cs: any) => cs.supervisor_id === Number(user.id))
            .map((cs: any) => cs.centro_servicio_id)
        : [];

      // Map solicitudes with incidente data
      let solicitudesData = ((solicitudesRes as any).results || []).map((s: any) => ({
        ...s,
        incidente: iMap[s.incidente_id] ? {
          id: iMap[s.incidente_id].id,
          codigo: iMap[s.incidente_id].codigo,
          producto_id: iMap[s.incidente_id].producto?.id || null,
          centro_de_servicio_id: iMap[s.incidente_id].centro_de_servicio_id,
        } : undefined,
      }));

      // Filter by assigned centers if supervisor has any
      if (centroIds.length > 0) {
        solicitudesData = solicitudesData.filter((s: SolicitudCambio) =>
          s.incidente?.centro_de_servicio_id && centroIds.includes(s.incidente.centro_de_servicio_id)
        );
      }

      setSolicitudes(solicitudesData);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar solicitudes");
    } finally {
      setLoading(false);
    }
  };

  const handleRevisar = (solicitud: SolicitudCambio) => {
    setSelectedSolicitud(solicitud);
    setObservaciones("");
    setIsDialogOpen(true);
  };

  const handleDecision = async (aprobado: boolean) => {
    if (!selectedSolicitud || !user) return;

    if (!aprobado && !observaciones.trim()) {
      toast.error("Debes indicar el motivo del rechazo");
      return;
    }

    setSubmitting(true);
    try {
      // Update solicitud via API
      await mycsapi.fetch("/api/v1/solicitudes-cambio/{id}".replace("{id}", String(selectedSolicitud.id)), { method: "PATCH", body: {
          estado: aprobado ? "aprobada" : "rechazada",
          aprobado_por: Number(user.id),
          fecha_aprobacion: new Date().toISOString(),
          observaciones_aprobacion: observaciones.trim() || null,
        } as any });

      // Determine new incident status
      let nuevoEstado: string;
      if (aprobado) {
        nuevoEstado = selectedSolicitud.tipo_cambio === "nota_credito" 
          ? "NC_AUTORIZADA" 
          : "BODEGA_PEDIDO";
      } else {
        nuevoEstado = "EN_DIAGNOSTICO";
      }

      // Update incident status via API - use observaciones to log state change
      if (selectedSolicitud.incidente_id) {
        const existingIncidente = incidentesMap[selectedSolicitud.incidente_id];
        const logEntry = `[${new Date().toISOString()}] Estado cambiado a ${nuevoEstado} por aprobación/rechazo de garantía`;
        await mycsapi.patch("/api/v1/incidentes/{incidente_id}", { path: { incidente_id: selectedSolicitud.incidente_id }, body: {
            observaciones: existingIncidente?.observaciones
              ? `${existingIncidente.observaciones}\n${logEntry}`
              : logEntry
          } as any });
      }

      toast.success(
        aprobado 
          ? selectedSolicitud.tipo_cambio === "nota_credito"
            ? "NC aprobada - Pendiente de emisión"
            : "Solicitud aprobada - Máquina lista para cambio"
          : "Solicitud rechazada - Regresa a diagnóstico para reparar"
      );
      setIsDialogOpen(false);
      fetchSolicitudes();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al procesar solicitud");
    } finally {
      setSubmitting(false);
    }
  };

  const pendientes = solicitudes.filter(s => s.estado === "pendiente");
  const procesadas = solicitudes.filter(s => s.estado !== "pendiente");

  const filteredPendientes = pendientes.filter(s =>
    s.incidente?.codigo?.toLowerCase().includes(search.toLowerCase()) ||
    s.tecnico_solicitante.toLowerCase().includes(search.toLowerCase())
  );

  const filteredProcesadas = procesadas.filter(s =>
    s.incidente?.codigo?.toLowerCase().includes(search.toLowerCase()) ||
    s.tecnico_solicitante.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case "pendiente":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>;
      case "aprobada":
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Aprobada</Badge>;
      case "rechazada":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rechazada</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case "cambio_garantia":
        return <Badge className="bg-primary">Cambio Garantía</Badge>;
      case "nota_credito":
        return <Badge className="bg-blue-500">Nota Crédito</Badge>;
      case "tipologia":
        return <Badge className="bg-purple-500">Tipología</Badge>;
      default:
        return <Badge variant="outline">{tipo}</Badge>;
    }
  };

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
          <h1 className="text-2xl font-bold text-foreground">Aprobaciones de Garantía</h1>
          <p className="text-muted-foreground">
            Revisa y aprueba las solicitudes de cambio por garantía
          </p>
        </div>
        <Button onClick={fetchSolicitudes} variant="outline">
          Actualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/10 rounded-full">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-600">{pendientes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-full">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Aprobadas</p>
                <p className="text-2xl font-bold text-green-600">
                  {solicitudes.filter(s => s.estado === "aprobada").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-destructive/10 rounded-full">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rechazadas</p>
                <p className="text-2xl font-bold text-destructive">
                  {solicitudes.filter(s => s.estado === "rechazada").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <AlertTriangle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Urgentes (&gt;3 días)</p>
                <p className="text-2xl font-bold">
                  {pendientes.filter(s => differenceInDays(new Date(), new Date(s.created_at)) > 3).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por código o técnico..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pendientes" className="relative">
            Pendientes
            {pendientes.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-500 text-white rounded-full">
                {pendientes.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="procesadas">Procesadas</TabsTrigger>
        </TabsList>

        <TabsContent value="pendientes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Solicitudes Pendientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Incidente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Técnico</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Evidencia</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPendientes.map((sol) => (
                      <TableRow key={sol.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{sol.incidente?.codigo}</p>
                            <p className="text-xs text-muted-foreground">
                              {sol.incidente?.producto_id || "Sin producto"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{getTipoBadge(sol.tipo_cambio)}</TableCell>
                        <TableCell>{sol.tecnico_solicitante}</TableCell>
                        <TableCell>
                          {formatFechaCorta(sol.created_at)}
                        </TableCell>
                        <TableCell>
                          {sol.fotos_urls && sol.fotos_urls.length > 0 ? (
                            <Badge variant="outline">
                              <FileImage className="h-3 w-3 mr-1" />
                              {sol.fotos_urls.length}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">Sin fotos</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" onClick={() => handleRevisar(sol)}>
                            <Eye className="h-4 w-4 mr-1" />
                            Revisar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredPendientes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No hay solicitudes pendientes
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="procesadas" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Solicitudes Procesadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Incidente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Técnico</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha Solicitud</TableHead>
                      <TableHead>Observaciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProcesadas.map((sol) => (
                      <TableRow key={sol.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{sol.incidente?.codigo}</p>
                            <p className="text-xs text-muted-foreground">
                              {sol.incidente?.producto_id || "Sin producto"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{getTipoBadge(sol.tipo_cambio)}</TableCell>
                        <TableCell>{sol.tecnico_solicitante}</TableCell>
                        <TableCell>{getStatusBadge(sol.estado)}</TableCell>
                        <TableCell>
                          {formatFechaCorta(sol.created_at)}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {sol.observaciones_aprobacion || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredProcesadas.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No hay solicitudes procesadas
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Revisar Solicitud de Garantía</DialogTitle>
          </DialogHeader>
          {selectedSolicitud && (
            <div className="space-y-4 py-4">
              {/* Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Incidente</p>
                  <p className="font-medium">{selectedSolicitud.incidente?.codigo}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Producto</p>
                  <p className="font-medium">{selectedSolicitud.incidente?.producto_id || "Sin producto"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo de Cambio</p>
                  {getTipoBadge(selectedSolicitud.tipo_cambio)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Técnico</p>
                  <p className="font-medium">{selectedSolicitud.tecnico_solicitante}</p>
                </div>
              </div>

              {/* Justification */}
              <div>
                <p className="text-sm text-muted-foreground mb-1">Justificación del Técnico</p>
                <p className="p-3 bg-muted rounded-lg">{selectedSolicitud.justificacion}</p>
              </div>

              {/* Photos */}
              {selectedSolicitud.fotos_urls && selectedSolicitud.fotos_urls.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Evidencia Fotográfica</p>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedSolicitud.fotos_urls.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`Evidencia ${idx + 1}`}
                        className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-80"
                        onClick={() => window.open(url, "_blank")}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Observations */}
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Observaciones {selectedSolicitud.estado === "pendiente" && "(obligatorio al rechazar)"}
                </p>
                <Textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Escribe las observaciones o motivo de rechazo..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDecision(false)}
              disabled={submitting}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Rechazar
            </Button>
            <Button
              onClick={() => handleDecision(true)}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Aprobar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
