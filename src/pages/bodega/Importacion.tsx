import { useState, useEffect } from "react";
import { Package, Plus, Save, Search, Check, AlertCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type DetalleImportacion = {
  id?: string;
  sku: string;
  descripcion: string;
  cantidad: number;
  ubicacion_asignada: string;
};

type UbicacionHistorica = {
  ubicacion: string;
  fecha_asignacion: string;
  cantidad: number;
};

export default function Importacion() {
  const [showNuevaImportacion, setShowNuevaImportacion] = useState(false);
  const [numeroEmbarque, setNumeroEmbarque] = useState("");
  const [origen, setOrigen] = useState<"Mexico" | "China">("Mexico");
  const [fechaLlegada, setFechaLlegada] = useState("");
  const [notas, setNotas] = useState("");
  const [detalles, setDetalles] = useState<DetalleImportacion[]>([]);
  const [skuActual, setSkuActual] = useState("");
  const [descripcionActual, setDescripcionActual] = useState("");
  const [cantidadActual, setCantidadActual] = useState("");
  const [ubicacionActual, setUbicacionActual] = useState("");
  const [ubicacionesHistoricas, setUbicacionesHistoricas] = useState<UbicacionHistorica[]>([]);
  const [importaciones, setImportaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchImportaciones();
  }, []);

  useEffect(() => {
    if (skuActual) {
      fetchUbicacionesHistoricas(skuActual);
    } else {
      setUbicacionesHistoricas([]);
    }
  }, [skuActual]);

  const fetchImportaciones = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('importaciones')
        .select(`
          *,
          importaciones_detalle (*)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setImportaciones(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar importaciones');
    } finally {
      setLoading(false);
    }
  };

  const fetchUbicacionesHistoricas = async (sku: string) => {
    try {
      const { data, error } = await supabase
        .from('ubicaciones_historicas')
        .select('ubicacion, fecha_asignacion, cantidad_asignada')
        .eq('codigo_repuesto', sku)
        .order('fecha_asignacion', { ascending: false })
        .limit(3);

      if (error) throw error;

      setUbicacionesHistoricas((data || []).map(d => ({
        ubicacion: d.ubicacion,
        fecha_asignacion: d.fecha_asignacion,
        cantidad: d.cantidad_asignada || 0
      })));
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const agregarDetalle = () => {
    if (!skuActual || !descripcionActual || !cantidadActual || !ubicacionActual) {
      toast.error('Complete todos los campos');
      return;
    }

    const nuevoDetalle: DetalleImportacion = {
      sku: skuActual,
      descripcion: descripcionActual,
      cantidad: parseInt(cantidadActual),
      ubicacion_asignada: ubicacionActual
    };

    setDetalles([...detalles, nuevoDetalle]);
    
    // Limpiar campos
    setSkuActual("");
    setDescripcionActual("");
    setCantidadActual("");
    setUbicacionActual("");
    
    toast.success('Repuesto agregado');
  };

  const guardarImportacion = async () => {
    if (!numeroEmbarque || !fechaLlegada || detalles.length === 0) {
      toast.error('Complete todos los campos y agregue al menos un repuesto');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('No se pudo identificar el usuario');
        return;
      }

      // Obtener centro central
      const { data: centroCentral } = await supabase
        .from('centros_servicio')
        .select('id')
        .eq('es_central', true)
        .single();

      // Crear importación
      const { data: importacion, error: importacionError } = await supabase
        .from('importaciones')
        .insert({
          numero_embarque: numeroEmbarque,
          origen: origen,
          fecha_llegada: fechaLlegada,
          centro_destino_id: centroCentral?.id,
          notas: notas,
          estado: 'procesando',
          created_by: user.id
        })
        .select()
        .single();

      if (importacionError) throw importacionError;

      // Crear detalles
      const detallesConId = detalles.map(d => ({
        importacion_id: importacion.id,
        sku: d.sku,
        descripcion: d.descripcion,
        cantidad: d.cantidad,
        ubicacion_asignada: d.ubicacion_asignada,
        procesado: false
      }));

      const { error: detallesError } = await supabase
        .from('importaciones_detalle')
        .insert(detallesConId);

      if (detallesError) throw detallesError;

      // Guardar ubicaciones históricas
      for (const detalle of detalles) {
        await supabase.from('ubicaciones_historicas').insert({
          codigo_repuesto: detalle.sku,
          ubicacion: detalle.ubicacion_asignada,
          centro_servicio_id: centroCentral?.id,
          cantidad_asignada: detalle.cantidad,
          usuario_asigno: user.id
        });
      }

      toast.success('Importación registrada exitosamente');
      setShowNuevaImportacion(false);
      resetForm();
      fetchImportaciones();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al guardar importación');
    }
  };

  const resetForm = () => {
    setNumeroEmbarque("");
    setOrigen("Mexico");
    setFechaLlegada("");
    setNotas("");
    setDetalles([]);
    setSkuActual("");
    setDescripcionActual("");
    setCantidadActual("");
    setUbicacionActual("");
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "pendiente":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-300">Pendiente</Badge>;
      case "procesando":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-300">Procesando</Badge>;
      case "completado":
        return <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-300">Completado</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8 text-primary" />
            Importaciones
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestión de embarques de México y China
          </p>
        </div>
        <Button onClick={() => setShowNuevaImportacion(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Importación
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Importaciones</CardTitle>
          <CardDescription>Últimas 20 importaciones registradas</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Embarque</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Fecha Llegada</TableHead>
                  <TableHead>Repuestos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Registro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importaciones.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No hay importaciones registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  importaciones.map((imp) => (
                    <TableRow key={imp.id}>
                      <TableCell className="font-medium">{imp.numero_embarque}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{imp.origen}</Badge>
                      </TableCell>
                      <TableCell>{new Date(imp.fecha_llegada).toLocaleDateString('es-GT')}</TableCell>
                      <TableCell>{imp.importaciones_detalle?.length || 0} items</TableCell>
                      <TableCell>{getEstadoBadge(imp.estado)}</TableCell>
                      <TableCell>{new Date(imp.created_at).toLocaleDateString('es-GT')}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showNuevaImportacion} onOpenChange={setShowNuevaImportacion}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Importación</DialogTitle>
            <DialogDescription>
              Registre los detalles del embarque y los repuestos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Número de Embarque</Label>
                <Input
                  value={numeroEmbarque}
                  onChange={(e) => setNumeroEmbarque(e.target.value)}
                  placeholder="EMB-2024-001"
                />
              </div>
              <div>
                <Label>Origen</Label>
                <Select value={origen} onValueChange={(v: "Mexico" | "China") => setOrigen(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mexico">México</SelectItem>
                    <SelectItem value="China">China</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Fecha de Llegada</Label>
              <Input
                type="date"
                value={fechaLlegada}
                onChange={(e) => setFechaLlegada(e.target.value)}
              />
            </div>

            <div>
              <Label>Notas</Label>
              <Textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Observaciones del embarque..."
                rows={2}
              />
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-4">Agregar Repuestos</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label>SKU</Label>
                  <Input
                    value={skuActual}
                    onChange={(e) => setSkuActual(e.target.value)}
                    placeholder="Código del repuesto"
                  />
                </div>
                <div>
                  <Label>Descripción</Label>
                  <Input
                    value={descripcionActual}
                    onChange={(e) => setDescripcionActual(e.target.value)}
                    placeholder="Descripción del repuesto"
                  />
                </div>
                <div>
                  <Label>Cantidad</Label>
                  <Input
                    type="number"
                    value={cantidadActual}
                    onChange={(e) => setCantidadActual(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Ubicación Destino</Label>
                  <Input
                    value={ubicacionActual}
                    onChange={(e) => setUbicacionActual(e.target.value)}
                    placeholder="Ej: A-01"
                  />
                </div>
              </div>

              {ubicacionesHistoricas.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg mb-4">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Últimas 3 ubicaciones de este SKU:
                  </p>
                  <div className="space-y-1">
                    {ubicacionesHistoricas.map((uh, idx) => (
                      <div key={idx} className="text-sm text-muted-foreground flex justify-between">
                        <span className="font-medium">{uh.ubicacion}</span>
                        <span>Cant: {uh.cantidad} - {new Date(uh.fecha_asignacion).toLocaleDateString('es-GT')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={agregarDetalle} variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Repuesto
              </Button>
            </div>

            {detalles.length > 0 && (
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3">Repuestos Agregados ({detalles.length})</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Ubicación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detalles.map((d, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{d.sku}</TableCell>
                        <TableCell>{d.descripcion}</TableCell>
                        <TableCell>{d.cantidad}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{d.ubicacion_asignada}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNuevaImportacion(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarImportacion} disabled={detalles.length === 0}>
              <Save className="h-4 w-4 mr-2" />
              Guardar Importación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}