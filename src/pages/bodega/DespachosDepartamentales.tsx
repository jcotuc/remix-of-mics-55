import { useState, useEffect } from "react";
import { Truck, Package, MapPin, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type RepuestoSolicitado = {
  codigo: string;
  descripcion: string;
  cantidad: number;
};

type DespachoNecesario = {
  incidente_id: string;
  incidente_codigo: string;
  centro_servicio: string;
  repuestos_faltantes: {
    codigo: string;
    descripcion: string;
    cantidad_solicitada: number;
    stock_central: number;
    ubicacion_central: string;
  }[];
};

export default function DespachosDepartamentales() {
  const navigate = useNavigate();
  const [despachos, setDespachos] = useState<DespachoNecesario[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);

  useEffect(() => {
    fetchDespachosNecesarios();
  }, []);

  const fetchDespachosNecesarios = async () => {
    try {
      setLoading(true);
      
      // Obtener solicitudes de repuestos pendientes
      const { data: solicitudes, error: solicitudesError } = await supabase
        .from('solicitudes_repuestos')
        .select(`
          id,
          incidente_id,
          repuestos,
          incidentes (
            codigo,
            centro_servicio
          )
        `)
        .eq('estado', 'pendiente');

      if (solicitudesError) throw solicitudesError;

      const despachosTemp: DespachoNecesario[] = [];

      for (const solicitud of solicitudes || []) {
        const repuestos = solicitud.repuestos as RepuestoSolicitado[];
        const repuestosFaltantes = [];

        for (const rep of repuestos) {
          // Verificar stock en bodega del centro de servicio
          const { data: stockLocal } = await supabase
            .from('stock_departamental')
            .select('cantidad_actual, centros_servicio(nombre)')
            .eq('codigo_repuesto', rep.codigo)
            .maybeSingle();

          // Si no tiene stock localmente, verificar en bodega central
          if (!stockLocal || stockLocal.cantidad_actual < rep.cantidad) {
            const { data: stockCentral } = await supabase
              .from('repuestos')
              .select('stock_actual, ubicacion_bodega')
              .eq('codigo', rep.codigo)
              .single();

            if (stockCentral && stockCentral.stock_actual > 0) {
              repuestosFaltantes.push({
                codigo: rep.codigo,
                descripcion: rep.descripcion,
                cantidad_solicitada: rep.cantidad,
                stock_central: stockCentral.stock_actual,
                ubicacion_central: stockCentral.ubicacion_bodega || 'Sin ubicación'
              });
            }
          }
        }

        if (repuestosFaltantes.length > 0) {
          despachosTemp.push({
            incidente_id: solicitud.incidente_id,
            incidente_codigo: solicitud.incidentes?.codigo || 'N/A',
            centro_servicio: solicitud.incidentes?.centro_servicio || 'Sin especificar',
            repuestos_faltantes: repuestosFaltantes
          });
        }
      }

      setDespachos(despachosTemp);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar despachos necesarios');
    } finally {
      setLoading(false);
    }
  };

  const prepararDespacho = async (despacho: DespachoNecesario) => {
    setProcesando(despacho.incidente_id);
    
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

      // Obtener o crear centro destino
      let centroDestino = await supabase
        .from('centros_servicio')
        .select('id')
        .eq('nombre', despacho.centro_servicio)
        .single();

      if (!centroDestino.data) {
        const { data: nuevoCentro } = await supabase
          .from('centros_servicio')
          .insert({
            codigo: `CS-${Date.now()}`,
            nombre: despacho.centro_servicio,
            es_central: false,
            activo: true
          })
          .select()
          .single();
        
        centroDestino.data = nuevoCentro;
      }

      // Crear tránsito
      const numeroTransito = `TR-${Date.now()}`;
      const { data: transito, error: transitoError } = await supabase
        .from('transitos_bodega')
        .insert({
          numero_transito: numeroTransito,
          centro_origen_id: centroCentral?.id,
          centro_destino_id: centroDestino.data?.id,
          estado: 'en_transito',
          enviado_por: user.id,
          notas: `Despacho para incidente ${despacho.incidente_codigo}`
        })
        .select()
        .single();

      if (transitoError) throw transitoError;

      // Crear detalles del tránsito
      const detalles = despacho.repuestos_faltantes.map(rep => ({
        transito_id: transito.id,
        codigo_repuesto: rep.codigo,
        descripcion: rep.descripcion,
        cantidad_enviada: rep.cantidad_solicitada,
        verificado: false
      }));

      const { error: detallesError } = await supabase
        .from('transitos_detalle')
        .insert(detalles);

      if (detallesError) throw detallesError;

      toast.success(`Tránsito ${numeroTransito} creado exitosamente`);
      await fetchDespachosNecesarios();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al preparar despacho');
    } finally {
      setProcesando(null);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Truck className="h-8 w-8 text-primary" />
          Despachos Departamentales
        </h1>
        <p className="text-muted-foreground mt-2">
          Gestión de envíos a centros de servicio regionales
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              Pendientes de Despacho
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{despachos.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-500" />
              Total Repuestos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {despachos.reduce((acc, d) => acc + d.repuestos_faltantes.length, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-green-500" />
              Centros Afectados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(despachos.map(d => d.centro_servicio)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Repuestos Requeridos por Centros</CardTitle>
          <CardDescription>
            Repuestos sin existencias en bodegas departamentales
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : despachos.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Todo al día</h3>
              <p className="text-muted-foreground">
                No hay despachos pendientes en este momento
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {despachos.map((despacho, idx) => (
                <Card key={idx} className="border-l-4 border-l-orange-500">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          Incidente: {despacho.incidente_codigo}
                        </CardTitle>
                        <CardDescription>
                          Centro: {despacho.centro_servicio}
                        </CardDescription>
                      </div>
                      <Button
                        onClick={() => prepararDespacho(despacho)}
                        disabled={procesando === despacho.incidente_id}
                      >
                        {procesando === despacho.incidente_id ? 'Procesando...' : 'Preparar Despacho'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Descripción</TableHead>
                          <TableHead>Cant. Solicitada</TableHead>
                          <TableHead>Stock Central</TableHead>
                          <TableHead>Ubicación</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {despacho.repuestos_faltantes.map((rep, repIdx) => (
                          <TableRow key={repIdx}>
                            <TableCell className="font-medium">{rep.codigo}</TableCell>
                            <TableCell>{rep.descripcion}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{rep.cantidad_solicitada}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={rep.stock_central >= rep.cantidad_solicitada ? "bg-green-500" : "bg-yellow-500"}>
                                {rep.stock_central}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{rep.ubicacion_central}</Badge>
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
    </div>
  );
}