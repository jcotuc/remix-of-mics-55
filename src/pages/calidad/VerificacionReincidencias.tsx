import { useEffect, useState } from "react";
import type { IncidenteSchema } from "@/generated/actions.d";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Calendar } from "lucide-react";
import { formatFechaCorta } from "@/utils/dateFormatters";
import { mycsapi } from "@/mics-api";

interface IncidenteReingreso {
  id: number;
  codigo: string;
  cliente_id: number;
  producto_id: number | null;
  descripcion_problema: string;
  fecha_ingreso: string;
  cliente?: {
    nombre: string;
  };
  producto?: {
    descripcion?: string;
  };
}

interface IncidenteAnterior {
  id: number;
  codigo: string;
  descripcion_problema: string;
  fecha_ingreso: string;
  estado: string;
}

export default function VerificacionReincidencias() {
  const [incidentesPendientes, setIncidentesPendientes] = useState<IncidenteReingreso[]>([]);
  const [allIncidentes, setAllIncidentes] = useState<IncidenteSchema[]>([]);
  const [stats, setStats] = useState({
    pendientes: 0,
    aprobadas: 0,
    rechazadas: 0,
  });
  const [selectedIncidente, setSelectedIncidente] = useState<IncidenteReingreso | null>(null);
  const [incidentesAnteriores, setIncidentesAnteriores] = useState<IncidenteAnterior[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [incidenteAnteriorSeleccionado, setIncidenteAnteriorSeleccionado] = useState("");
  const [esReincidenciaValida, setEsReincidenciaValida] = useState("");
  const [aplicaReingreso, setAplicaReingreso] = useState("");
  const [justificacion, setJustificacion] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await Promise.all([fetchIncidentesPendientes(), fetchStats()]);
  };

  const fetchIncidentesPendientes = async () => {
    try {
      const incidentesRes = await mycsapi.get("/api/v1/incidentes", { query: { limit: 2000 } }) as any;
      const incidentes = incidentesRes.results || [];
      setAllIncidentes(incidentes);

      // Filter pending incidents and map to local type
      const pendientes = incidentes
        .filter((i: IncidenteSchema) => 
          ["EN_DIAGNOSTICO", "EN_REPARACION"].includes(i.estado)
        )
        .slice(0, 20)
        .map((inc: IncidenteSchema) => ({
          id: inc.id,
          codigo: inc.codigo,
          cliente_id: inc.cliente?.id || 0,
          producto_id: inc.producto?.id || null,
          descripcion_problema: inc.descripcion_problema || "",
          fecha_ingreso: inc.created_at,
          cliente: inc.cliente ? { nombre: inc.cliente.nombre } : undefined,
          producto: inc.producto ? { descripcion: inc.producto.descripcion } : undefined,
        }));

      setIncidentesPendientes(pendientes);
    } catch (error) {
      console.error("Error fetching incidentes:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await mycsapi.get("/api/v1/incidentes", { query: { limit: 2000 } }) as any;
      const incidentes = response.results || [];

      const pendientes = incidentes.filter((i: IncidenteSchema) =>
        ["EN_DIAGNOSTICO", "EN_REPARACION"].includes(i.estado)
      ).length;

      setStats({
        pendientes,
        aprobadas: 0,
        rechazadas: 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleVerificar = async (incidente: IncidenteReingreso) => {
    setSelectedIncidente(incidente);
    setLoading(true);

    // Find previous incidents from the same client
    const anteriores = allIncidentes
      .filter((i: IncidenteSchema) => 
        i.cliente?.id === incidente.cliente_id &&
        ["REPARADO", "CAMBIO_POR_GARANTIA"].includes(i.estado) &&
        i.id !== incidente.id
      )
      .slice(0, 10)
      .map((i: IncidenteSchema) => ({
        id: i.id,
        codigo: i.codigo,
        descripcion_problema: i.descripcion_problema || "",
        fecha_ingreso: i.created_at,
        estado: i.estado,
      }));

    setIncidentesAnteriores(anteriores);
    setLoading(false);
    setModalOpen(true);
  };

  const handleGuardarVerificacion = async () => {
    if (!selectedIncidente) return;

    if (!esReincidenciaValida) {
      toast.error("Debe indicar si es reincidencia válida");
      return;
    }

    if (esReincidenciaValida === "si" && !aplicaReingreso) {
      toast.error("Debe indicar si aplica reingreso");
      return;
    }

    if (justificacion.length < 20) {
      toast.error("La justificación debe tener al menos 20 caracteres");
      return;
    }

    setLoading(true);

    try {
      // Use apiBackendAction for update
      await mycsapi.patch("/api/v1/incidentes/{incidente_id}", { path: { incidente_id: selectedIncidente.id }, body: { 
          observaciones: `Verificación: ${esReincidenciaValida === "si" ? "Es reincidencia" : "No es reincidencia"}. ${justificacion}`,
        } as any }) as any;

      toast.success("Verificación guardada exitosamente");
      setModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error guardando verificación:", error);
      toast.error("Error al guardar la verificación");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedIncidente(null);
    setIncidentesAnteriores([]);
    setIncidenteAnteriorSeleccionado("");
    setEsReincidenciaValida("");
    setAplicaReingreso("");
    setJustificacion("");
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Verificación de Reincidencias</h1>
        <p className="text-muted-foreground">Validar reclamos de clientes sobre reparaciones anteriores</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendientes}</div>
            <p className="text-xs text-muted-foreground">Por verificar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprobadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.aprobadas}</div>
            <p className="text-xs text-muted-foreground">Reincidencias válidas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rechazadas</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rechazadas}</div>
            <p className="text-xs text-muted-foreground">No son reincidencias</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de incidentes pendientes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Incidentes Pendientes de Verificación
          </CardTitle>
        </CardHeader>
        <CardContent>
          {incidentesPendientes.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No hay incidentes pendientes de verificación</p>
          ) : (
            <div className="space-y-3">
              {incidentesPendientes.map((incidente) => (
                <div key={incidente.id} className="border rounded-lg p-4 flex items-center justify-between hover:bg-accent transition-colors">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{incidente.codigo}</span>
                      <Badge variant="outline">{incidente.producto_id || "Sin producto"}</Badge>
                      <Badge variant="secondary">{incidente.cliente?.nombre || `Cliente ${incidente.cliente_id}`}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">"{incidente.descripcion_problema}"</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Ingresado: {formatFechaCorta(incidente.fecha_ingreso)}
                      </span>
                    </div>
                  </div>
                  <Button onClick={() => handleVerificar(incidente)}>Verificar Reclamo</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Verificación */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Verificar Reincidencia - {selectedIncidente?.codigo}</DialogTitle>
          </DialogHeader>

          {selectedIncidente && (
            <div className="space-y-6">
              {/* Incidente Actual */}
              <div>
                <h3 className="font-semibold mb-2">📌 INCIDENTE ACTUAL</h3>
                <Card>
                  <CardContent className="pt-4 space-y-2 text-sm">
                    <div><strong>Código:</strong> {selectedIncidente.codigo}</div>
                    <div><strong>Cliente:</strong> {selectedIncidente.cliente?.nombre || `Cliente ${selectedIncidente.cliente_id}`}</div>
                    <div><strong>Producto:</strong> {selectedIncidente.producto?.descripcion || selectedIncidente.producto_id || "Sin producto"}</div>
                    <div><strong>Problema:</strong> "{selectedIncidente.descripcion_problema}"</div>
                    <div><strong>Fecha Ingreso:</strong> {formatFechaCorta(selectedIncidente.fecha_ingreso)}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Historial */}
              <div>
                <h3 className="font-semibold mb-2">📜 HISTORIAL DE INCIDENTES DEL CLIENTE</h3>
                {loading ? (
                  <p className="text-muted-foreground">Cargando historial...</p>
                ) : incidentesAnteriores.length === 0 ? (
                  <p className="text-muted-foreground">No se encontraron incidentes anteriores</p>
                ) : (
                  <RadioGroup value={incidenteAnteriorSeleccionado} onValueChange={setIncidenteAnteriorSeleccionado}>
                    <div className="space-y-2 border rounded-lg p-4">
                      {incidentesAnteriores.map((inc) => (
                        <div key={inc.id} className="flex items-center space-x-2">
                          <RadioGroupItem value={String(inc.id)} id={String(inc.id)} />
                          <Label htmlFor={String(inc.id)} className="flex-1 cursor-pointer">
                            {inc.codigo} | {formatFechaCorta(inc.fecha_ingreso)} | "{inc.descripcion_problema}" | {inc.estado}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                )}
              </div>

              <div className="border-t pt-4" />

              {/* Decisión */}
              <div>
                <h3 className="font-semibold mb-4">⚖️ DECISIÓN</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-base">¿Es reincidencia válida? (la misma falla que antes)</Label>
                    <RadioGroup value={esReincidenciaValida} onValueChange={setEsReincidenciaValida} className="mt-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="si" id="reincidencia-si" />
                        <Label htmlFor="reincidencia-si">Sí, es la misma falla</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no-diferente" id="reincidencia-no-dif" />
                        <Label htmlFor="reincidencia-no-dif">No, es una falla diferente</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="reincidencia-no" />
                        <Label htmlFor="reincidencia-no">No, no existe incidente anterior relacionado</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {esReincidenciaValida === "si" && (
                    <div>
                      <Label className="text-base">¿Aplica reingreso? (garantía por reparación previa)</Label>
                      <RadioGroup value={aplicaReingreso} onValueChange={setAplicaReingreso} className="mt-2">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="si" id="reingreso-si" />
                          <Label htmlFor="reingreso-si">Sí, aplica reingreso (dentro de período de garantía)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no-periodo" id="reingreso-no-periodo" />
                          <Label htmlFor="reingreso-no-periodo">No, fuera de período de garantía</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="reingreso-no" />
                          <Label htmlFor="reingreso-no">No, la falla es por mal uso del cliente</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="justificacion">
                      Justificación: (mínimo 20 caracteres) <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="justificacion"
                      value={justificacion}
                      onChange={(e) => setJustificacion(e.target.value)}
                      placeholder="Explique detalladamente su decisión sobre si es reincidencia válida y si aplica reingreso..."
                      rows={4}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">{justificacion.length} / 20 caracteres mínimo</p>
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleGuardarVerificacion} disabled={loading}>
                  {loading ? "Guardando..." : "Guardar Verificación"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
