import { useState, useEffect } from "react";
import { Package, Search, ClipboardCheck, Truck, AlertCircle, Check, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Repuesto = {
  codigo: string;
  descripcion: string;
  stock_actual: number;
  ubicacion_bodega: string;
};

type ConteoDetalle = {
  codigo_repuesto: string;
  descripcion: string;
  cantidad_sistema: number;
  cantidad_fisica: number | null;
  diferencia: number;
};

type Transito = {
  id: string;
  numero_transito: string;
  centro_origen: string;
  fecha_envio: string;
  detalles: {
    codigo_repuesto: string;
    descripcion: string;
    cantidad_enviada: number;
    cantidad_recibida: number | null;
    ubicacion_destino: string;
    verificado: boolean;
  }[];
};

export default function InventarioNuevo() {
  const [searchTerm, setSearchTerm] = useState("");
  const [centroSeleccionado, setCentroSeleccionado] = useState("central");
  const [centrosServicio, setCentrosServicio] = useState<any[]>([]);
  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Inventario cíclico
  const [showNuevoConteo, setShowNuevoConteo] = useState(false);
  const [ubicacionConteo, setUbicacionConteo] = useState("");
  const [conteos, setConteos] = useState<any[]>([]);
  const [detallesConteo, setDetallesConteo] = useState<ConteoDetalle[]>([]);
  const [conteoActual, setConteoActual] = useState<string | null>(null);
  
  // Puertas de tránsito
  const [transitos, setTransitos] = useState<Transito[]>([]);
  const [transitoSeleccionado, setTransitoSeleccionado] = useState<string | null>(null);
  const [reclamos, setReclamos] = useState<any[]>([]);

  useEffect(() => {
    fetchCentrosServicio();
    fetchRepuestos();
    fetchConteos();
    fetchTransitos();
  }, []);

  useEffect(() => {
    if (centroSeleccionado !== "central") {
      fetchRepuestosDepartamentales(centroSeleccionado);
    } else {
      fetchRepuestos();
    }
  }, [centroSeleccionado]);

  const fetchCentrosServicio = async () => {
    try {
      const { data, error } = await supabase
        .from('centros_servicio')
        .select('*')
        .eq('activo', true);

      if (error) throw error;
      setCentrosServicio(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchRepuestos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('repuestos')
        .select('codigo, descripcion, stock_actual, ubicacion_bodega')
        .order('codigo');

      if (error) throw error;
      setRepuestos((data || []).map(r => ({
        codigo: r.codigo,
        descripcion: r.descripcion,
        stock_actual: r.stock_actual || 0,
        ubicacion_bodega: r.ubicacion_bodega || 'Sin ubicación'
      })));
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar repuestos');
    } finally {
      setLoading(false);
    }
  };

  const fetchRepuestosDepartamentales = async (centroId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('stock_departamental')
        .select('codigo_repuesto, cantidad_actual, ubicacion')
        .eq('centro_servicio_id', centroId);

      if (error) throw error;

      const repuestosEnriquecidos = await Promise.all(
        (data || []).map(async (item) => {
          const { data: rep } = await supabase
            .from('repuestos')
            .select('descripcion')
            .eq('codigo', item.codigo_repuesto)
            .single();

          return {
            codigo: item.codigo_repuesto,
            descripcion: rep?.descripcion || 'Sin descripción',
            stock_actual: item.cantidad_actual,
            ubicacion_bodega: item.ubicacion || 'Sin ubicación'
          };
        })
      );

      setRepuestos(repuestosEnriquecidos);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar stock departamental');
    } finally {
      setLoading(false);
    }
  };

  const fetchConteos = async () => {
    try {
      const { data, error } = await supabase
        .from('inventario_ciclico')
        .select(`
          *,
          inventario_ciclico_detalle(*)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setConteos(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchTransitos = async () => {
    try {
      const { data, error } = await supabase
        .from('transitos_bodega')
        .select(`
          *,
          centros_servicio!transitos_bodega_centro_origen_id_fkey(nombre),
          transitos_detalle(*)
        `)
        .eq('estado', 'en_transito')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transitosFormateados = (data || []).map(t => ({
        id: t.id,
        numero_transito: t.numero_transito,
        centro_origen: t.centros_servicio?.nombre || 'N/A',
        fecha_envio: t.fecha_envio,
        detalles: (t.transitos_detalle || []).map((d: any) => ({
          codigo_repuesto: d.codigo_repuesto,
          descripcion: d.descripcion,
          cantidad_enviada: d.cantidad_enviada,
          cantidad_recibida: d.cantidad_recibida,
          ubicacion_destino: d.ubicacion_destino || '',
          verificado: d.verificado
        }))
      }));

      setTransitos(transitosFormateados);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const iniciarConteo = async () => {
    if (!ubicacionConteo) {
      toast.error('Ingrese la ubicación a contar');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('No se pudo identificar el usuario');
        return;
      }

      // Obtener centro
      const centroId = centroSeleccionado === "central" 
        ? (await supabase.from('centros_servicio').select('id').eq('es_central', true).single()).data?.id
        : centroSeleccionado;

      // Crear conteo
      const numeroConteo = `CNT-${Date.now()}`;
      const { data: conteo, error: conteoError } = await supabase
        .from('inventario_ciclico')
        .insert({
          numero_conteo: numeroConteo,
          centro_servicio_id: centroId,
          ubicacion: ubicacionConteo,
          estado: 'en_proceso',
          realizado_por: user.id
        })
        .select()
        .single();

      if (conteoError) throw conteoError;

      // Obtener repuestos de esa ubicación
      const repuestosUbicacion = repuestos.filter(r => 
        r.ubicacion_bodega.toLowerCase().includes(ubicacionConteo.toLowerCase())
      );

      if (repuestosUbicacion.length === 0) {
        toast.error('No hay repuestos en esa ubicación');
        await supabase.from('inventario_ciclico').delete().eq('id', conteo.id);
        return;
      }

      // Crear detalles
      const detalles = repuestosUbicacion.map(r => ({
        inventario_id: conteo.id,
        codigo_repuesto: r.codigo,
        descripcion: r.descripcion,
        cantidad_sistema: r.stock_actual,
        cantidad_fisica: null,
        diferencia: 0,
        ajustado: false
      }));

      const { error: detallesError } = await supabase
        .from('inventario_ciclico_detalle')
        .insert(detalles);

      if (detallesError) throw detallesError;

      setConteoActual(conteo.id);
      setDetallesConteo(detalles.map(d => ({
        codigo_repuesto: d.codigo_repuesto,
        descripcion: d.descripcion,
        cantidad_sistema: d.cantidad_sistema,
        cantidad_fisica: null,
        diferencia: 0
      })));
      
      toast.success('Conteo iniciado');
      setShowNuevoConteo(false);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al iniciar conteo');
    }
  };

  const actualizarCantidadFisica = (codigo: string, cantidad: string) => {
    const cantidadNum = parseInt(cantidad) || 0;
    setDetallesConteo(prev => prev.map(d => 
      d.codigo_repuesto === codigo 
        ? { ...d, cantidad_fisica: cantidadNum, diferencia: cantidadNum - d.cantidad_sistema }
        : d
    ));
  };

  const finalizarConteo = async () => {
    if (!conteoActual) return;

    try {
      // Actualizar detalles en la base de datos
      for (const detalle of detallesConteo) {
        await supabase
          .from('inventario_ciclico_detalle')
          .update({
            cantidad_fisica: detalle.cantidad_fisica,
            diferencia: detalle.diferencia
          })
          .eq('inventario_id', conteoActual)
          .eq('codigo_repuesto', detalle.codigo_repuesto);
      }

      // Marcar conteo como completado
      await supabase
        .from('inventario_ciclico')
        .update({
          estado: 'completado',
          fecha_completado: new Date().toISOString()
        })
        .eq('id', conteoActual);

      toast.success('Conteo finalizado');
      setConteoActual(null);
      setDetallesConteo([]);
      await fetchConteos();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al finalizar conteo');
    }
  };

  const verificarTransito = async (transitoId: string, codigo: string, cantidadRecibida: number, ubicacion: string) => {
    try {
      await supabase
        .from('transitos_detalle')
        .update({
          cantidad_recibida: cantidadRecibida,
          ubicacion_destino: ubicacion,
          verificado: true
        })
        .eq('transito_id', transitoId)
        .eq('codigo_repuesto', codigo);

      // Actualizar stock local
      await supabase
        .from('stock_departamental')
        .upsert({
          centro_servicio_id: centroSeleccionado,
          codigo_repuesto: codigo,
          cantidad_actual: cantidadRecibida,
          ubicacion: ubicacion
        });

      toast.success('Repuesto verificado');
      await fetchTransitos();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al verificar repuesto');
    }
  };

  const confirmarTransito = async (transitoId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Verificar que todos los items estén verificados
      const transito = transitos.find(t => t.id === transitoId);
      const todosVerificados = transito?.detalles.every(d => d.verificado);

      if (!todosVerificados) {
        toast.error('Debe verificar todos los repuestos antes de confirmar');
        return;
      }

      // Actualizar estado del tránsito
      await supabase
        .from('transitos_bodega')
        .update({
          estado: 'recibido',
          fecha_recepcion: new Date().toISOString(),
          recibido_por: user.id
        })
        .eq('id', transitoId);

      toast.success('Tránsito confirmado exitosamente');
      await fetchTransitos();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al confirmar tránsito');
    }
  };

  const crearReclamo = async (transitoId: string, codigo: string, cantidadFaltante: number, descripcion: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('reclamos_faltantes')
        .insert({
          transito_id: transitoId,
          codigo_repuesto: codigo,
          cantidad_faltante: cantidadFaltante,
          descripcion: descripcion,
          reclamado_por: user.id
        });

      toast.success('Reclamo registrado');
      await fetchTransitos();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al crear reclamo');
    }
  };

  const filteredRepuestos = repuestos.filter(r =>
    r.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Package className="h-8 w-8 text-primary" />
          Gestión de Inventario
        </h1>
        <p className="text-muted-foreground mt-2">
          Consulta, inventario cíclico y puertas de tránsito
        </p>
      </div>

      <Tabs defaultValue="consulta" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="consulta">Consulta de Inventario</TabsTrigger>
          <TabsTrigger value="ciclico">Inventario Cíclico</TabsTrigger>
          <TabsTrigger value="transito">Puertas de Tránsito</TabsTrigger>
        </TabsList>

        <TabsContent value="consulta" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Inventario Disponible</CardTitle>
                  <CardDescription>Consulta de stock por centro de servicio</CardDescription>
                </div>
                <Select value={centroSeleccionado} onValueChange={setCentroSeleccionado}>
                  <SelectTrigger className="w-[250px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="central">Bodega Central</SelectItem>
                    {centrosServicio.filter(c => !c.es_central).map((centro) => (
                      <SelectItem key={centro.id} value={centro.id}>
                        {centro.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 mb-4">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar repuestos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>

              {loading ? (
                <div className="text-center py-8">Cargando...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Stock Actual</TableHead>
                      <TableHead>Ubicación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRepuestos.map((repuesto) => (
                      <TableRow key={repuesto.codigo}>
                        <TableCell className="font-medium">{repuesto.codigo}</TableCell>
                        <TableCell>{repuesto.descripcion}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{repuesto.stock_actual}</Badge>
                        </TableCell>
                        <TableCell>{repuesto.ubicacion_bodega}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ciclico" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Cuadre de Inventario Cíclico</CardTitle>
                  <CardDescription>Conteo físico por ubicación</CardDescription>
                </div>
                <Button onClick={() => setShowNuevoConteo(true)}>
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  Nuevo Conteo
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {conteoActual ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Conteo en Progreso</h3>
                    <p className="text-sm text-muted-foreground">
                      Ingrese las cantidades físicas encontradas
                    </p>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Sistema</TableHead>
                        <TableHead>Física</TableHead>
                        <TableHead>Diferencia</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detallesConteo.map((detalle) => (
                        <TableRow key={detalle.codigo_repuesto}>
                          <TableCell className="font-medium">{detalle.codigo_repuesto}</TableCell>
                          <TableCell>{detalle.descripcion}</TableCell>
                          <TableCell>{detalle.cantidad_sistema}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              className="w-24"
                              value={detalle.cantidad_fisica || ''}
                              onChange={(e) => actualizarCantidadFisica(detalle.codigo_repuesto, e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            {detalle.cantidad_fisica !== null && (
                              <Badge className={detalle.diferencia === 0 ? "bg-green-500" : "bg-red-500"}>
                                {detalle.diferencia > 0 ? '+' : ''}{detalle.diferencia}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="flex justify-end">
                    <Button onClick={finalizarConteo}>
                      <Save className="h-4 w-4 mr-2" />
                      Finalizar Conteo
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="font-semibold mb-4">Historial de Conteos</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número</TableHead>
                        <TableHead>Ubicación</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Items</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {conteos.map((conteo) => (
                        <TableRow key={conteo.id}>
                          <TableCell className="font-medium">{conteo.numero_conteo}</TableCell>
                          <TableCell>{conteo.ubicacion}</TableCell>
                          <TableCell>{new Date(conteo.fecha_inicio).toLocaleDateString('es-GT')}</TableCell>
                          <TableCell>
                            <Badge className={conteo.estado === 'completado' ? 'bg-green-500' : 'bg-blue-500'}>
                              {conteo.estado}
                            </Badge>
                          </TableCell>
                          <TableCell>{conteo.inventario_ciclico_detalle?.length || 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog open={showNuevoConteo} onOpenChange={setShowNuevoConteo}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo Conteo Cíclico</DialogTitle>
                <DialogDescription>
                  Ingrese la ubicación a contar
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label>Ubicación</Label>
                  <Input
                    value={ubicacionConteo}
                    onChange={(e) => setUbicacionConteo(e.target.value)}
                    placeholder="Ej: A-01, B-05"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Se contarán todos los repuestos de esta ubicación
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNuevoConteo(false)}>
                  Cancelar
                </Button>
                <Button onClick={iniciarConteo}>
                  Iniciar Conteo
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="transito" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Puertas de Tránsito</CardTitle>
              <CardDescription>
                Verificación de repuestos recibidos de bodega central
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transitos.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  No hay tránsitos pendientes
                </div>
              ) : (
                <div className="space-y-6">
                  {transitos.map((transito) => (
                    <Card key={transito.id} className="border-l-4 border-l-blue-500">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{transito.numero_transito}</CardTitle>
                            <CardDescription>
                              Desde: {transito.centro_origen} | Enviado: {new Date(transito.fecha_envio).toLocaleDateString('es-GT')}
                            </CardDescription>
                          </div>
                          {transito.detalles.every(d => d.verificado) && (
                            <Button onClick={() => confirmarTransito(transito.id)}>
                              <Check className="h-4 w-4 mr-2" />
                              Confirmar Recepción
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Código</TableHead>
                              <TableHead>Descripción</TableHead>
                              <TableHead>Enviado</TableHead>
                              <TableHead>Recibido</TableHead>
                              <TableHead>Ubicación</TableHead>
                              <TableHead>Estado</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {transito.detalles.map((detalle, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="font-medium">{detalle.codigo_repuesto}</TableCell>
                                <TableCell>{detalle.descripcion}</TableCell>
                                <TableCell>{detalle.cantidad_enviada}</TableCell>
                                <TableCell>
                                  {detalle.verificado ? (
                                    <Badge className="bg-green-500">{detalle.cantidad_recibida}</Badge>
                                  ) : (
                                    <Input
                                      type="number"
                                      className="w-20"
                                      placeholder="0"
                                      onBlur={(e) => {
                                        const cant = parseInt(e.target.value) || 0;
                                        const ubicacion = prompt('Ingrese ubicación destino:');
                                        if (ubicacion) {
                                          verificarTransito(transito.id, detalle.codigo_repuesto, cant, ubicacion);
                                        }
                                      }}
                                    />
                                  )}
                                </TableCell>
                                <TableCell>{detalle.ubicacion_destino || '-'}</TableCell>
                                <TableCell>
                                  {detalle.verificado ? (
                                    <Badge className="bg-green-500 gap-1">
                                      <Check className="h-3 w-3" />
                                      Verificado
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="gap-1">
                                      <AlertCircle className="h-3 w-3" />
                                      Pendiente
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}