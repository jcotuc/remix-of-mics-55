import { useState, useEffect } from "react";
import { Calendar, ClipboardCheck, Save, AlertCircle, CheckCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ConteoDetalle = {
  id?: string;
  codigo_repuesto: string;
  descripcion: string;
  cantidad_sistema: number;
  cantidad_fisica: number | null;
  diferencia: number;
  notas: string;
  ajustado: boolean;
};

type Conteo = {
  id: string;
  numero_conteo: string;
  ubicacion: string;
  fecha_inicio: string;
  fecha_completado: string | null;
  estado: string;
  centro_servicio: string;
  responsable: string;
};

// Plan semanal de rotación
const PLAN_SEMANAL = [
  { semana: 1, zonas: ['A1', 'A2', 'A3', 'A4', 'A5'], descripcion: 'Alta rotación' },
  { semana: 2, zonas: ['B1', 'B2', 'B3', 'B4', 'B5'], descripcion: 'Media rotación' },
  { semana: 3, zonas: ['C1', 'C2', 'C3'], descripcion: 'Baja rotación' },
  { semana: 4, zonas: ['AUDIT'], descripcion: 'Auditoría aleatoria' }
];

export default function InventarioCiclico() {
  const [centroSeleccionado, setCentroSeleccionado] = useState("");
  const [centrosServicio, setCentrosServicio] = useState<any[]>([]);
  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState("");
  const [conteoActivo, setConteoActivo] = useState<string | null>(null);
  const [detallesConteo, setDetallesConteo] = useState<ConteoDetalle[]>([]);
  const [historialConteos, setHistorialConteos] = useState<Conteo[]>([]);
  const [loading, setLoading] = useState(false);
  const [semanaActual, setSemanaActual] = useState(1);

  useEffect(() => {
    fetchCentrosServicio();
    fetchHistorialConteos();
    calcularSemanaActual();
  }, []);

  const calcularSemanaActual = () => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - startOfYear.getTime();
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    const weekNumber = Math.ceil(diff / oneWeek);
    setSemanaActual((weekNumber % 4) + 1);
  };

  const fetchCentrosServicio = async () => {
    try {
      const { data, error } = await supabase
        .from('centros_servicio')
        .select('*')
        .eq('activo', true);

      if (error) throw error;
      setCentrosServicio(data || []);
      
      // Seleccionar bodega central por defecto
      const central = data?.find(c => c.es_central);
      if (central) setCentroSeleccionado(central.id);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchHistorialConteos = async () => {
    try {
      const { data, error } = await supabase
        .from('inventario_ciclico')
        .select(`
          *,
          centros_servicio(nombre)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const conteosFormateados = (data || []).map(c => ({
        id: c.id,
        numero_conteo: c.numero_conteo,
        ubicacion: c.ubicacion,
        fecha_inicio: c.fecha_inicio,
        fecha_completado: c.fecha_completado,
        estado: c.estado,
        centro_servicio: (c.centros_servicio as any)?.nombre || 'N/A',
        responsable: 'Sistema'
      }));

      setHistorialConteos(conteosFormateados);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const iniciarConteo = async () => {
    if (!ubicacionSeleccionada || !centroSeleccionado) {
      toast.error('Seleccione centro y ubicación');
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('No se pudo identificar el usuario');
        return;
      }

      // Crear conteo
      const numeroConteo = `CNT-${Date.now()}`;
      const { data: conteo, error: conteoError } = await supabase
        .from('inventario_ciclico')
        .insert({
          numero_conteo: numeroConteo,
          centro_servicio_id: centroSeleccionado,
          ubicacion: ubicacionSeleccionada,
          estado: 'en_proceso',
          realizado_por: user.id
        })
        .select()
        .single();

      if (conteoError) throw conteoError;

      // Obtener repuestos de esa ubicación
      const { data: repuestos, error: repuestosError } = await supabase
        .from('repuestos')
        .select('codigo, descripcion, stock_actual, ubicacion_bodega')
        .ilike('ubicacion_bodega', `%${ubicacionSeleccionada}%`);

      if (repuestosError) throw repuestosError;

      if (!repuestos || repuestos.length === 0) {
        toast.error('No hay repuestos en esa ubicación');
        await supabase.from('inventario_ciclico').delete().eq('id', conteo.id);
        return;
      }

      // Crear detalles
      const detalles: ConteoDetalle[] = repuestos.map(r => ({
        codigo_repuesto: r.codigo,
        descripcion: r.descripcion,
        cantidad_sistema: r.stock_actual || 0,
        cantidad_fisica: null,
        diferencia: 0,
        notas: '',
        ajustado: false
      }));

      const { error: detallesError } = await supabase
        .from('inventario_ciclico_detalle')
        .insert(
          detalles.map(d => ({
            inventario_id: conteo.id,
            codigo_repuesto: d.codigo_repuesto,
            descripcion: d.descripcion,
            cantidad_sistema: d.cantidad_sistema,
            cantidad_fisica: null,
            diferencia: 0,
            notas: '',
            ajustado: false
          }))
        );

      if (detallesError) throw detallesError;

      setConteoActivo(conteo.id);
      setDetallesConteo(detalles);
      toast.success('Conteo iniciado correctamente');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al iniciar conteo');
    } finally {
      setLoading(false);
    }
  };

  const actualizarCantidadFisica = (codigo: string, cantidad: string, notas: string = '') => {
    const cantidadNum = parseInt(cantidad) || 0;
    setDetallesConteo(prev => prev.map(d =>
      d.codigo_repuesto === codigo
        ? {
            ...d,
            cantidad_fisica: cantidadNum,
            diferencia: cantidadNum - d.cantidad_sistema,
            notas
          }
        : d
    ));
  };

  const finalizarConteo = async () => {
    if (!conteoActivo) return;

    // Validar que todos los items tengan cantidad física
    const todosContados = detallesConteo.every(d => d.cantidad_fisica !== null);
    if (!todosContados) {
      toast.error('Debe contar todos los repuestos antes de finalizar');
      return;
    }

    try {
      setLoading(true);

      // Actualizar detalles
      for (const detalle of detallesConteo) {
        await supabase
          .from('inventario_ciclico_detalle')
          .update({
            cantidad_fisica: detalle.cantidad_fisica,
            diferencia: detalle.diferencia,
            notas: detalle.notas
          })
          .eq('inventario_id', conteoActivo)
          .eq('codigo_repuesto', detalle.codigo_repuesto);
      }

      // Marcar conteo como completado
      await supabase
        .from('inventario_ciclico')
        .update({
          estado: 'completado',
          fecha_completado: new Date().toISOString()
        })
        .eq('id', conteoActivo);

      toast.success('Conteo finalizado correctamente');
      setConteoActivo(null);
      setDetallesConteo([]);
      setUbicacionSeleccionada('');
      await fetchHistorialConteos();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al finalizar conteo');
    } finally {
      setLoading(false);
    }
  };

  const planSemanaActual = PLAN_SEMANAL.find(p => p.semana === semanaActual);
  const itemsConDiferencia = detallesConteo.filter(d => d.diferencia !== 0).length;
  const precisionActual = detallesConteo.length > 0
    ? ((detallesConteo.length - itemsConDiferencia) / detallesConteo.length * 100).toFixed(1)
    : 0;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ClipboardCheck className="h-8 w-8 text-primary" />
          Inventario Cíclico Semanal
        </h1>
        <p className="text-muted-foreground mt-2">
          Sistema de conteo semanal rotativo para mantener precisión ≥98%
        </p>
      </div>

      {/* Plan de rotación semanal */}
      <Card className="border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Plan de Rotación - Semana {semanaActual}
          </CardTitle>
          <CardDescription>
            {planSemanaActual?.descripcion} - Zonas asignadas esta semana
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {PLAN_SEMANAL.map((plan) => (
              <Card
                key={plan.semana}
                className={plan.semana === semanaActual ? 'border-primary bg-primary/5' : ''}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Semana {plan.semana}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {plan.zonas.map(zona => (
                      <Badge key={zona} variant={plan.semana === semanaActual ? 'default' : 'outline'}>
                        {zona}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{plan.descripcion}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="nuevo" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="nuevo">Nuevo Conteo</TabsTrigger>
          <TabsTrigger value="historial">Historial y Reportes</TabsTrigger>
        </TabsList>

        <TabsContent value="nuevo" className="space-y-4">
          {!conteoActivo ? (
            <Card>
              <CardHeader>
                <CardTitle>Iniciar Conteo Cíclico</CardTitle>
                <CardDescription>
                  Seleccione el centro de servicio y la ubicación a contar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Centro de Servicio</Label>
                    <Select value={centroSeleccionado} onValueChange={setCentroSeleccionado}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar centro" />
                      </SelectTrigger>
                      <SelectContent>
                        {centrosServicio.map((centro) => (
                          <SelectItem key={centro.id} value={centro.id}>
                            {centro.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Ubicación (Código)</Label>
                    <Select value={ubicacionSeleccionada} onValueChange={setUbicacionSeleccionada}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar ubicación" />
                      </SelectTrigger>
                      <SelectContent>
                        {planSemanaActual?.zonas.map((zona) => (
                          <SelectItem key={zona} value={zona}>
                            {zona}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Instrucciones:
                  </h4>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>Seleccione las ubicaciones asignadas para esta semana</li>
                    <li>Registre cantidad física, diferencia y observaciones</li>
                    <li>Repita semanalmente rotando las ubicaciones</li>
                    <li>Todo el almacén debe ser cubierto cada mes</li>
                  </ul>
                </div>

                <Button
                  onClick={iniciarConteo}
                  disabled={loading || !ubicacionSeleccionada || !centroSeleccionado}
                  className="w-full"
                >
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  Iniciar Conteo
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Conteo en Progreso - {ubicacionSeleccionada}</CardTitle>
                    <CardDescription>
                      Registre las cantidades físicas encontradas
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{precisionActual}%</div>
                    <p className="text-xs text-muted-foreground">Precisión actual</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="text-right">Stock Sistema</TableHead>
                        <TableHead className="text-right">Stock Físico</TableHead>
                        <TableHead className="text-right">Diferencia</TableHead>
                        <TableHead>Observaciones</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detallesConteo.map((detalle) => (
                        <TableRow key={detalle.codigo_repuesto}>
                          <TableCell className="font-medium">{detalle.codigo_repuesto}</TableCell>
                          <TableCell>{detalle.descripcion}</TableCell>
                          <TableCell className="text-right">{detalle.cantidad_sistema}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={detalle.cantidad_fisica ?? ''}
                              onChange={(e) => actualizarCantidadFisica(
                                detalle.codigo_repuesto,
                                e.target.value,
                                detalle.notas
                              )}
                              className="w-24 text-right"
                              placeholder="0"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            {detalle.cantidad_fisica !== null && (
                              <span className={detalle.diferencia !== 0 ? 'text-orange-500 font-bold' : 'text-green-500'}>
                                {detalle.diferencia > 0 ? '+' : ''}{detalle.diferencia}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Input
                              value={detalle.notas}
                              onChange={(e) => actualizarCantidadFisica(
                                detalle.codigo_repuesto,
                                String(detalle.cantidad_fisica ?? 0),
                                e.target.value
                              )}
                              placeholder="Observaciones..."
                              className="w-40"
                            />
                          </TableCell>
                          <TableCell>
                            {detalle.cantidad_fisica !== null ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-orange-500" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setConteoActivo(null);
                      setDetallesConteo([]);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={finalizarConteo} disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    Finalizar Conteo
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="historial" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Conteos</CardTitle>
              <CardDescription>
                Últimos 20 conteos realizados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historialConteos.length === 0 ? (
                <div className="text-center py-12">
                  <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No hay conteos registrados</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Centro</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead>Fecha Inicio</TableHead>
                      <TableHead>Fecha Completado</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Responsable</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historialConteos.map((conteo) => (
                      <TableRow key={conteo.id}>
                        <TableCell className="font-medium">{conteo.numero_conteo}</TableCell>
                        <TableCell>{conteo.centro_servicio}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{conteo.ubicacion}</Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(conteo.fecha_inicio).toLocaleDateString('es-GT')}
                        </TableCell>
                        <TableCell>
                          {conteo.fecha_completado
                            ? new Date(conteo.fecha_completado).toLocaleDateString('es-GT')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              conteo.estado === 'completado' ? 'default' : 'secondary'
                            }
                          >
                            {conteo.estado}
                          </Badge>
                        </TableCell>
                        <TableCell>{conteo.responsable}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
