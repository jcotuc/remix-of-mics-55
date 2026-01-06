import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Package, MapPin, CheckCircle2, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type InventarioItem = {
  id: string;
  codigo_repuesto: string;
  centro_servicio_id: string;
  cantidad: number;
  ubicacion_legacy: string | null;
  ubicacion_id: number | null;
  descripcion: string | null;
  centros_servicio: {
    nombre: string;
  } | null;
};

type CentroServicio = {
  id: string;
  nombre: string;
};

export default function ReubicacionRepuestos() {
  const [inventarioItems, setInventarioItems] = useState<InventarioItem[]>([]);
  const [centrosServicio, setCentrosServicio] = useState<CentroServicio[]>([]);
  const [centroSeleccionado, setCentroSeleccionado] = useState<string>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const [showReubicacionDialog, setShowReubicacionDialog] = useState(false);
  const [itemAUbicar, setItemAUbicar] = useState<InventarioItem | null>(null);
  const [nuevaUbicacion, setNuevaUbicacion] = useState({
    pasillo: "",
    rack: "",
    nivel: "",
  });

  useEffect(() => {
    fetchCentrosServicio();
    fetchInventario();
  }, []);

  useEffect(() => {
    fetchInventario();
  }, [centroSeleccionado]);

  const fetchCentrosServicio = async () => {
    try {
      const { data, error } = await supabase
        .from("centros_servicio")
        .select("id, nombre")
        .eq("activo", true)
        .order("nombre");

      if (error) throw error;
      setCentrosServicio(data || []);
    } catch (error) {
      console.error("Error fetching centros:", error);
      toast.error("Error al cargar centros de servicio");
    }
  };

  const fetchInventario = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("inventario")
        .select(`
          id,
          codigo_repuesto,
          centro_servicio_id,
          cantidad,
          ubicacion_legacy,
          ubicacion_id,
          descripcion,
          centros_servicio (
            nombre
          )
        `)
        .is("ubicacion_id", null);

      if (centroSeleccionado && centroSeleccionado !== "todos") {
        query = query.eq("centro_servicio_id", centroSeleccionado);
      }

      const { data, error } = await query.order("created_at", { ascending: true });

      if (error) throw error;
      setInventarioItems(data || []);
    } catch (error) {
      console.error("Error fetching inventario:", error);
      toast.error("Error al cargar inventario pendiente");
    } finally {
      setLoading(false);
    }
  };

  const handleIniciarReubicacion = (item: InventarioItem) => {
    setItemAUbicar(item);
    setNuevaUbicacion({ pasillo: "", rack: "", nivel: "" });
    setShowReubicacionDialog(true);
  };

  const handleConfirmarReubicacion = async () => {
    if (!itemAUbicar || !nuevaUbicacion.pasillo || !nuevaUbicacion.rack || !nuevaUbicacion.nivel) {
      toast.error("Completa todos los campos de ubicación");
      return;
    }

    try {
      const ubicacionFinal = `${nuevaUbicacion.pasillo}.${nuevaUbicacion.rack}.${nuevaUbicacion.nivel}`;
      const user = await supabase.auth.getUser();

      // Actualizar inventario con nueva ubicación legacy
      const { error: updateError } = await supabase
        .from("inventario")
        .update({
          ubicacion_legacy: ubicacionFinal,
        })
        .eq("id", itemAUbicar.id);

      if (updateError) throw updateError;

      // Registrar movimiento de inventario
      const { error: movError } = await supabase
        .from("movimientos_inventario")
        .insert({
          centro_servicio_id: itemAUbicar.centro_servicio_id,
          codigo_repuesto: itemAUbicar.codigo_repuesto,
          tipo_movimiento: "reubicacion",
          cantidad: itemAUbicar.cantidad,
          ubicacion: ubicacionFinal,
          referencia: `Ubicado en ${ubicacionFinal}`,
          created_by: user.data.user?.id,
        });

      if (movError) throw movError;

      toast.success(`Repuesto ubicado en ${ubicacionFinal}`);
      setShowReubicacionDialog(false);
      fetchInventario();
    } catch (error) {
      console.error("Error al reubicar:", error);
      toast.error("Error al reubicar repuesto");
    }
  };

  const itemsFiltrados = inventarioItems.filter((r) =>
    r.codigo_repuesto.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reubicación de Repuestos</h1>
        <p className="text-muted-foreground mt-2">
          Asigna ubicación a repuestos sin ubicación definida
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
                  placeholder="Código..."
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
                {itemsFiltrados.length} item{itemsFiltrados.length !== 1 ? "s" : ""} sin ubicación
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Repuestos sin Ubicación</CardTitle>
          <CardDescription>
            Selecciona un repuesto para asignarle su ubicación
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Cargando...</p>
          ) : itemsFiltrados.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay repuestos pendientes de ubicar</p>
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
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsFiltrados.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                    </TableCell>
                    <TableCell className="font-mono">{item.codigo_repuesto}</TableCell>
                    <TableCell>{item.descripcion || item.codigo_repuesto}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.centros_servicio?.nombre}</Badge>
                    </TableCell>
                    <TableCell>{item.cantidad}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => handleIniciarReubicacion(item)}
                      >
                        Ubicar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showReubicacionDialog} onOpenChange={setShowReubicacionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Ubicación</DialogTitle>
            <DialogDescription>
              Define la ubicación donde se almacenará el repuesto
            </DialogDescription>
          </DialogHeader>

          {itemAUbicar && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="font-medium">{itemAUbicar.codigo_repuesto}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{itemAUbicar.centros_servicio?.nombre}</Badge>
                  <Badge>{itemAUbicar.cantidad} unidades</Badge>
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
