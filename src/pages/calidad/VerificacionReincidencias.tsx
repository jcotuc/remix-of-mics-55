import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Calendar } from "lucide-react";
import { format } from "date-fns";

interface IncidenteReingreso {
  id: string;
  codigo: string;
  codigo_cliente: string;
  codigo_producto: string;
  descripcion_problema: string;
  fecha_ingreso: string;
  sku_maquina: string | null;
  es_reingreso: boolean;
  cliente?: {
    nombre: string;
  };
  producto?: {
    descripcion: string;
  };
}

interface IncidenteAnterior {
  id: string;
  codigo: string;
  descripcion_problema: string;
  fecha_ingreso: string;
  status: string;
}

export default function VerificacionReincidencias() {
  const [incidentesPendientes, setIncidentesPendientes] = useState<IncidenteReingreso[]>([]);
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
    const { data, error } = await supabase
      .from("incidentes")
      .select(`
        *,
        cliente:clientes!incidentes_codigo_cliente_fkey(nombre),
        producto:productos!incidentes_codigo_producto_fkey(descripcion)
      `)
      .eq("es_reingreso", true)
      .in("status", ["Ingresado", "Pendiente de diagnostico"])
      .is("verificaciones_reincidencia.id", null)
      .order("fecha_ingreso", { ascending: false });

    if (error) {
      console.error("Error fetching incidentes:", error);
      return;
    }

    // Filtrar solo los que no tienen verificación
    const incidentesSinVerificar = [];
    for (const incidente of data || []) {
      const { data: verificacion } = await supabase
        .from("verificaciones_reincidencia")
        .select("id")
        .eq("incidente_actual_id", incidente.id)
        .single();

      if (!verificacion) {
        incidentesSinVerificar.push(incidente);
      }
    }

    setIncidentesPendientes(incidentesSinVerificar);
  };

  const fetchStats = async () => {
    // Pendientes
    const { data: pendientes } = await supabase
      .from("incidentes")
      .select("id")
      .eq("es_reingreso", true)
      .in("status", ["Ingresado", "Pendiente de diagnostico"]);

    // Filtrar pendientes sin verificación
    let countPendientes = 0;
    for (const inc of pendientes || []) {
      const { data: verif } = await supabase
        .from("verificaciones_reincidencia")
        .select("id")
        .eq("incidente_actual_id", inc.id)
        .single();
      if (!verif) countPendientes++;
    }

    // Aprobadas y Rechazadas
    const { data: verificaciones } = await supabase
      .from("verificaciones_reincidencia")
      .select("es_reincidencia_valida");

    const aprobadas = verificaciones?.filter((v) => v.es_reincidencia_valida).length || 0;
    const rechazadas = verificaciones?.filter((v) => !v.es_reincidencia_valida).length || 0;

    setStats({
      pendientes: countPendientes,
      aprobadas,
      rechazadas,
    });
  };

  const handleVerificar = async (incidente: IncidenteReingreso) => {
    setSelectedIncidente(incidente);
    setLoading(true);

    // Buscar incidentes anteriores del mismo cliente y producto
    const { data, error } = await supabase
      .from("incidentes")
      .select("id, codigo, descripcion_problema, fecha_ingreso, status")
      .eq("codigo_cliente", incidente.codigo_cliente)
      .or(`codigo_producto.eq.${incidente.codigo_producto},sku_maquina.eq.${incidente.sku_maquina || "NULL"}`)
      .in("status", ["Reparado", "Cambio por garantia"])
      .neq("id", incidente.id)
      .order("fecha_ingreso", { ascending: false })
      .limit(10);

    if (!error && data) {
      setIncidentesAnteriores(data);
    }

    setLoading(false);
    setModalOpen(true);
  };

  const handleGuardarVerificacion = async () => {
    if (!selectedIncidente) return;

    // Validaciones
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

    const verificacion = {
      incidente_actual_id: selectedIncidente.id,
      incidente_anterior_id: incidenteAnteriorSeleccionado || null,
      verificador_id: (await supabase.auth.getUser()).data.user?.id,
      es_reincidencia_valida: esReincidenciaValida === "si",
      aplica_reingreso: aplicaReingreso === "si",
      justificacion,
    };

    const { error } = await supabase.from("verificaciones_reincidencia").insert(verificacion);

    if (error) {
      console.error("Error guardando verificación:", error);
      toast.error("Error al guardar la verificación");
      setLoading(false);
      return;
    }

    // Actualizar el incidente si no aplica reingreso
    if (esReincidenciaValida === "no" || aplicaReingreso === "no") {
      await supabase
        .from("incidentes")
        .update({ es_reingreso: false })
        .eq("id", selectedIncidente.id);
    }

    toast.success("Verificación guardada exitosamente");
    setModalOpen(false);
    resetForm();
    fetchData();
    setLoading(false);
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
                      <Badge variant="outline">{incidente.codigo_producto}</Badge>
                      <Badge variant="secondary">{incidente.cliente?.nombre || incidente.codigo_cliente}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">"{incidente.descripcion_problema}"</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Ingresado: {format(new Date(incidente.fecha_ingreso), "dd/MM/yyyy")}
                      </span>
                      <Badge variant="destructive" className="text-xs">Marcado como reingreso</Badge>
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
                    <div><strong>Cliente:</strong> {selectedIncidente.cliente?.nombre || selectedIncidente.codigo_cliente}</div>
                    <div><strong>Producto:</strong> {selectedIncidente.producto?.descripcion || selectedIncidente.codigo_producto}</div>
                    {selectedIncidente.sku_maquina && <div><strong>SKU:</strong> {selectedIncidente.sku_maquina}</div>}
                    <div><strong>Problema:</strong> "{selectedIncidente.descripcion_problema}"</div>
                    <div><strong>Fecha Ingreso:</strong> {format(new Date(selectedIncidente.fecha_ingreso), "dd/MM/yyyy")}</div>
                    <div><strong>Marcado como Reingreso:</strong> ✓ Sí</div>
                  </CardContent>
                </Card>
              </div>

              {/* Historial */}
              <div>
                <h3 className="font-semibold mb-2">📜 HISTORIAL DE INCIDENTES DEL CLIENTE (misma máquina)</h3>
                {loading ? (
                  <p className="text-muted-foreground">Cargando historial...</p>
                ) : incidentesAnteriores.length === 0 ? (
                  <p className="text-muted-foreground">No se encontraron incidentes anteriores</p>
                ) : (
                  <RadioGroup value={incidenteAnteriorSeleccionado} onValueChange={setIncidenteAnteriorSeleccionado}>
                    <div className="space-y-2 border rounded-lg p-4">
                      {incidentesAnteriores.map((inc) => (
                        <div key={inc.id} className="flex items-center space-x-2">
                          <RadioGroupItem value={inc.id} id={inc.id} />
                          <Label htmlFor={inc.id} className="flex-1 cursor-pointer">
                            {inc.codigo} | {format(new Date(inc.fecha_ingreso), "dd/MM/yyyy")} | "{inc.descripcion_problema}" | {inc.status}
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
