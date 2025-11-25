import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Package, MapPin, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type RepuestoPendiente = {
  id: string;
  codigo_repuesto: string;
  centro_servicio_id: string;
  cantidad_actual: number;
  ubicacion_temporal: string | null;
  fecha_recepcion: string | null;
  centros_servicio: {
    nombre: string;
    codigo: string;
  } | null;
};

type CentroServicio = {
  id: string;
  nombre: string;
  codigo: string;
};

export default function ReubicacionRepuestos() {
  const [repuestosPendientes, setRepuestosPendientes] = useState<RepuestoPendiente[]>([]);
  const [centrosServicio, setCentrosServicio] = useState<CentroServicio[]>([]);
  const [centroSeleccionado, setCentroSeleccionado] = useState<string>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const [showReubicacionDialog, setShowReubicacionDialog] = useState(false);
  const [repuestoAUbicar, setRepuestoAUbicar] = useState<RepuestoPendiente | null>(null);
  const [nuevaUbicacion, setNuevaUbicacion] = useState({
    pasillo: "",
    rack: "",
    nivel: "",
  });

  useEffect(() => {
    fetchCentrosServicio();
    fetchRepuestosPendientes();
  }, []);

  useEffect(() => {
    fetchRepuestosPendientes();
  }, [centroSeleccionado]);

  const fetchCentrosServicio = async () => {
    try {
      const { data, error } = await supabase
        .from("centros_servicio")
        .select("id, nombre, codigo")
        .eq("activo", true)
        .order("nombre");

      if (error) throw error;
      setCentrosServicio(data || []);
    } catch (error) {
      console.error("Error fetching centros:", error);
      toast.error("Error al cargar centros de servicio");
    }
  };

  const fetchRepuestosPendientes = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("stock_departamental")
        .select(`
          id,
          codigo_repuesto,
          centro_servicio_id,
          cantidad_actual,
          ubicacion_temporal,
          fecha_recepcion,
          centros_servicio (
            nombre,
            codigo
          )
        `)
        .eq("requiere_reubicacion", true);

      if (centroSeleccionado && centroSeleccionado !== "todos") {
        query = query.eq("centro_servicio_id", centroSeleccionado);
      }

      const { data, error } = await query.order("fecha_recepcion", { ascending: true });

      if (error) throw error;
      setRepuestosPendientes(data || []);
    } catch (error) {
      console.error("Error fetching pendientes:", error);
      toast.error("Error al cargar repuestos pendientes");
    } finally {
      setLoading(false);
    }
  };

  const handleIniciarReubicacion = (repuesto: RepuestoPendiente) => {
    setRepuestoAUbicar(repuesto);
    setNuevaUbicacion({ pasillo: "", rack: "", nivel: "" });
    setShowReubicacionDialog(true);
  };

  const handleConfirmarReubicacion = async () => {
    if (!repuestoAUbicar || !nuevaUbicacion.pasillo || !nuevaUbicacion.rack || !nuevaUbicacion.nivel) {
      toast.error("Completa todos los campos de ubicación");
      return;
    }

    try {
      const ubicacionFinal = `${nuevaUbicacion.pasillo}-${nuevaUbicacion.rack}-${nuevaUbicacion.nivel}`;
      const user = await supabase.auth.getUser();

      // 1. Actualizar stock_departamental
      const { error: updateError } = await supabase
        .from("stock_departamental")
        .update({
          ubicacion: ubicacionFinal,
          ubicacion_temporal: null,
          requiere_reubicacion: false,
        })
        .eq("id", repuestoAUbicar.id);

      if (updateError) throw updateError;

      // 2. Registrar movimiento de inventario
      const { error: movError } = await supabase
        .from("movimientos_inventario")
        .insert({
          centro_servicio_id: repuestoAUbicar.centro_servicio_id,
          codigo_repuesto: repuestoAUbicar.codigo_repuesto,
          tipo_movimiento: "reubicacion",
          cantidad: repuestoAUbicar.cantidad_actual,
          ubicacion: ubicacionFinal,
          referencia: `Reubicado desde PUERTA-ENTRADA a ${ubicacionFinal}`,
          created_by: user.data.user?.id,
        });

      if (movError) throw movError;

      // 3. Registrar en ubicaciones históricas
      const { error: histError } = await supabase
        .from("ubicaciones_historicas")
        .insert({
          centro_servicio_id: repuestoAUbicar.centro_servicio_id,
          codigo_repuesto: repuestoAUbicar.codigo_repuesto,
          ubicacion: ubicacionFinal,
          cantidad_asignada: repuestoAUbicar.cantidad_actual,
          usuario_asigno: user.data.user?.id,
        });

      if (histError) throw histError;

      toast.success(`Repuesto ubicado en ${ubicacionFinal}`);
      setShowReubicacionDialog(false);
      fetchRepuestosPendientes();
    } catch (error) {
      console.error("Error al reubicar:", error);
      toast.error("Error al reubicar repuesto");
    }
  };

  const repuestosFiltrados = repuestosPendientes.filter((r) =>
    r.codigo_repuesto.toLowerCase().includes(busqueda.toLowerCase())
  );

  const getAlertLevel = (fechaRecepcion: string | null) => {
    if (!fechaRecepcion) return "normal";
    const diff = (new Date().getTime() - new Date(fechaRecepcion).getTime()) / (1000 * 60 * 60);
    if (diff > 48) return "critical";
    if (diff > 24) return "warning";
    return "normal";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reubicación de Repuestos</h1>
        <p className="text-muted-foreground mt-2">
          Asigna ubicación final a repuestos recibidos en puerta de entrada
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Filtros y Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Centro de Servicio</Label>
              <Select value={centroSeleccionado} onValueChange={setCentroSeleccionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los centros" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los centros</SelectItem>
                  {centrosServicio.map((centro) => (
                    <SelectItem key={centro.id} value={centro.id}>
                      {centro.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Buscar Repuesto</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Código o descripción..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {repuestosFiltrados.length} repuesto{repuestosFiltrados.length !== 1 ? "s" : ""} pendiente{repuestosFiltrados.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Repuestos en Puerta de Entrada</CardTitle>
          <CardDescription>
            Selecciona un repuesto para asignarle su ubicación final
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Cargando...</p>
          ) : repuestosFiltrados.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay repuestos pendientes de reubicar</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estado</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Centro</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Fecha Recepción</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repuestosFiltrados.map((repuesto) => {
                  const alertLevel = getAlertLevel(repuesto.fecha_recepcion);
                  return (
                    <TableRow key={repuesto.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {alertLevel === "critical" && (
                            <AlertCircle className="h-5 w-5 text-destructive" />
                          )}
                          {alertLevel === "warning" && (
                            <AlertCircle className="h-5 w-5 text-yellow-500" />
                          )}
                          {alertLevel === "normal" && (
                            <MapPin className="h-5 w-5 text-muted-foreground" />
                          )}
                          {alertLevel !== "normal" && (
                            <span className="text-xs text-muted-foreground">
                              {alertLevel === "critical" ? ">48h" : ">24h"}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{repuesto.codigo_repuesto}</TableCell>
                      <TableCell>{repuesto.codigo_repuesto}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{repuesto.centros_servicio?.nombre}</Badge>
                      </TableCell>
                      <TableCell>{repuesto.cantidad_actual}</TableCell>
                      <TableCell>
                        {repuesto.fecha_recepcion ? (
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(repuesto.fecha_recepcion), "dd MMM yyyy HH:mm", { locale: es })}
                          </span>
                        ) : (
                          "Sin fecha"
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleIniciarReubicacion(repuesto)}
                        >
                          Ubicar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showReubicacionDialog} onOpenChange={setShowReubicacionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Ubicación Final</DialogTitle>
            <DialogDescription>
              Define la ubicación donde se almacenará el repuesto
            </DialogDescription>
          </DialogHeader>

          {repuestoAUbicar && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="font-medium">{repuestoAUbicar.codigo_repuesto}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{repuestoAUbicar.centros_servicio?.nombre}</Badge>
                  <Badge>{repuestoAUbicar.cantidad_actual} unidades</Badge>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Pasillo</Label>
                  <Input
                    placeholder="A"
                    value={nuevaUbicacion.pasillo}
                    onChange={(e) => setNuevaUbicacion({ ...nuevaUbicacion, pasillo: e.target.value.toUpperCase() })}
                    maxLength={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rack</Label>
                  <Input
                    placeholder="01"
                    value={nuevaUbicacion.rack}
                    onChange={(e) => setNuevaUbicacion({ ...nuevaUbicacion, rack: e.target.value })}
                    maxLength={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nivel</Label>
                  <Input
                    placeholder="03"
                    value={nuevaUbicacion.nivel}
                    onChange={(e) => setNuevaUbicacion({ ...nuevaUbicacion, nivel: e.target.value })}
                    maxLength={3}
                  />
                </div>
              </div>

              {nuevaUbicacion.pasillo && nuevaUbicacion.rack && nuevaUbicacion.nivel && (
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-sm font-medium">Ubicación final:</p>
                  <p className="text-lg font-bold text-primary">
                    {nuevaUbicacion.pasillo}-{nuevaUbicacion.rack}-{nuevaUbicacion.nivel}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowReubicacionDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleConfirmarReubicacion}>
                  Confirmar Ubicación
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
