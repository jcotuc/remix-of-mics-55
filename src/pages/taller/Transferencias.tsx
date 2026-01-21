import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Truck, Plus, Search, CheckCircle2, XCircle, Clock } from "lucide-react";
import { formatFechaCorta } from "@/utils/dateFormatters";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { apiBackendAction } from "@/lib/api-backend";

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

  // Form state
  const [selectedIncidente, setSelectedIncidente] = useState("");
  const [selectedCentroDestino, setSelectedCentroDestino] = useState("");
  const [motivo, setMotivo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch transferencias (not in registry yet, using Supabase)
      const { data: transferenciasData, error: transferenciasError } = await supabase
        .from("solicitudes_transferencia_maquinas")
        .select(`
          *,
          incidentes:incidente_id(codigo, producto_id)
        `)
        .order("created_at", { ascending: false });

      if (transferenciasError) throw transferenciasError;

      // Fetch centros via Registry
      const centrosRes = await apiBackendAction("centros_de_servicio.list", {});
      const allCentros = ((centrosRes as any).results || (centrosRes as any).data || [])
        .filter((c: any) => c.activo);

      // Fetch incidentes via Registry
      const incidentesRes = await apiBackendAction("incidentes.list", { limit: 2000 });
      const allIncidentes = (incidentesRes as any).results || [];
      
      // Filter eligible incidentes
      const eligibleIncidentes = allIncidentes.filter((inc: any) => 
        ["EN_DIAGNOSTICO", "ESPERA_REPUESTOS", "REGISTRADO"].includes(inc.estado)
      );

      // Process transferencias with centro names
      const centrosMap = new Map(allCentros.map((c: any) => [c.id, c.nombre]));
      
      const processedTransferencias: Transferencia[] = (transferenciasData || []).map((t: any) => ({
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
      // Get user's info (still using Supabase for auth-related queries)
      const usuarioQuery = await (supabase as any)
        .from("usuarios")
        .select("id, centro_de_servicio_id")
        .eq("auth_uid", user.id)
        .maybeSingle();
      
      const usuario = usuarioQuery.data as { id: number; centro_de_servicio_id: number | null } | null;

      const centroOrigenId = usuario?.centro_de_servicio_id || centros[0]?.id;

      const insertResult = await supabase.from("solicitudes_transferencia_maquinas").insert({
        incidente_id: parseInt(selectedIncidente),
        centro_origen_id: centroOrigenId,
        centro_destino_id: parseInt(selectedCentroDestino),
        motivo: motivo.trim(),
        solicitado_por: usuario?.id || 0,
        estado: "PENDIENTE",
      });

      if (insertResult.error) throw insertResult.error;

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
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>;
      case "APROBADA":
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Aprobada</Badge>;
      case "RECHAZADA":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rechazada</Badge>;
      case "EN_TRANSITO":
        return <Badge className="bg-blue-500"><Truck className="h-3 w-3 mr-1" />En Tránsito</Badge>;
      case "COMPLETADA":
        return <Badge className="bg-primary"><CheckCircle2 className="h-3 w-3 mr-1" />Completada</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const filteredTransferencias = transferencias.filter((t) =>
    t.incidente?.codigo?.toLowerCase().includes(search.toLowerCase()) ||
    t.centro_destino?.nombre?.toLowerCase().includes(search.toLowerCase())
  );

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
          <h1 className="text-2xl font-bold text-foreground">Transferencias de Máquinas</h1>
          <p className="text-muted-foreground">
            Solicita apoyo enviando máquinas a otros centros de servicio
          </p>
        </div>
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

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{transferencias.length}</p>
              <p className="text-sm text-muted-foreground">Total Solicitudes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {transferencias.filter((t) => t.estado === "PENDIENTE").length}
              </p>
              <p className="text-sm text-muted-foreground">Pendientes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {transferencias.filter((t) => t.estado === "EN_TRANSITO").length}
              </p>
              <p className="text-sm text-muted-foreground">En Tránsito</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {transferencias.filter((t) => t.estado === "COMPLETADA").length}
              </p>
              <p className="text-sm text-muted-foreground">Completadas</p>
            </div>
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
          <CardTitle>Solicitudes de Transferencia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Incidente</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransferencias.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{t.incidente?.codigo}</p>
                        <p className="text-xs text-muted-foreground">Producto #{t.incidente?.producto_id}</p>
                      </div>
                    </TableCell>
                    <TableCell>{t.centro_origen?.nombre || "N/A"}</TableCell>
                    <TableCell>{t.centro_destino?.nombre || "N/A"}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{t.motivo}</TableCell>
                    <TableCell>{getStatusBadge(t.estado || "")}</TableCell>
                    <TableCell>
                      {formatFechaCorta(t.created_at || "")}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredTransferencias.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No hay solicitudes de transferencia
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
