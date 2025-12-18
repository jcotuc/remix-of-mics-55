import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Package, CheckCircle, XCircle, AlertTriangle, MapPin, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { buscarAlternativaDisponible, registrarSustitucion } from "@/lib/repuestosService";

type DetalleRepuesto = {
  id: string;
  codigo_repuesto: string;
  cantidad_solicitada: number;
  cantidad_encontrada: number;
  estado: string;
  notas: string | null;
  descripcion?: string;
  ubicacion_bodega?: string;
  stock_actual?: number;
  codigo_alternativo?: string | null;
  tipo_sustitucion?: string | null;
};

type Solicitud = {
  id: string;
  incidente_codigo: string;
  tecnico_solicitante: string;
  estado: string;
  created_at: string;
};

export default function DetalleSolicitud() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [detalles, setDetalles] = useState<DetalleRepuesto[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentUser();
    fetchSolicitud();
  }, [id]);

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchSolicitud = async () => {
    if (!id) return;

    try {
      setLoading(true);

      // Fetch solicitud info
      const { data: solicitudData, error: solicitudError } = await supabase
        .from('solicitudes_repuestos')
        .select(`
          id,
          estado,
          tecnico_solicitante,
          created_at,
          repuestos,
          incidentes (
            codigo
          )
        `)
        .eq('id', id)
        .single();

      if (solicitudError) throw solicitudError;

      setSolicitud({
        id: solicitudData.id,
        incidente_codigo: solicitudData.incidentes?.codigo || 'N/A',
        tecnico_solicitante: solicitudData.tecnico_solicitante,
        estado: solicitudData.estado,
        created_at: solicitudData.created_at
      });

      // Check if detalles already exist
      const { data: existingDetalles, error: detallesError } = await supabase
        .from('repuestos_solicitud_detalle')
        .select('*')
        .eq('solicitud_id', id);

      if (detallesError) throw detallesError;

      // If no detalles exist, create them from the repuestos JSONB
      if (!existingDetalles || existingDetalles.length === 0) {
        const repuestos = solicitudData.repuestos as any[];
        
        if (repuestos && repuestos.length > 0) {
          const detallesToInsert = repuestos.map((rep: any) => ({
            solicitud_id: id,
            codigo_repuesto: rep.codigo,
            cantidad_solicitada: rep.cantidad,
            cantidad_encontrada: 0,
            estado: 'pendiente'
          }));

          const { error: insertError } = await supabase
            .from('repuestos_solicitud_detalle')
            .insert(detallesToInsert);

          if (insertError) throw insertError;
        }
      }

      // Fetch detalles
      const { data: detallesData, error: detallesInfoError } = await supabase
        .from('repuestos_solicitud_detalle')
        .select('*')
        .eq('solicitud_id', id);

      if (detallesInfoError) throw detallesInfoError;

      // Obtener centro de servicio ZONA5
      const { data: centroData } = await supabase
        .from('centros_servicio')
        .select('id')
        .eq('nombre', 'ZONA5')
        .maybeSingle();

      // Para cada detalle, buscar la info del repuesto y alternativas
      const detallesMapeados = await Promise.all(
        (detallesData || []).map(async (det: any) => {
          const { data: repuestoInfo } = await supabase
            .from('repuestos')
            .select('descripcion, ubicacion_bodega, stock_actual')
            .eq('codigo', det.codigo_repuesto)
            .maybeSingle();

          // Buscar alternativa si no hay stock
          let alternativa = null;
          let tipoSustitucion = null;
          if (centroData && (repuestoInfo?.stock_actual || 0) === 0) {
            const alt = await buscarAlternativaDisponible(det.codigo_repuesto, centroData.id);
            if (alt && alt.tipo_coincidencia !== 'solicitado') {
              alternativa = alt.codigo_encontrado;
              tipoSustitucion = alt.tipo_coincidencia;
            }
          }

          return {
            id: det.id,
            codigo_repuesto: det.codigo_repuesto,
            cantidad_solicitada: det.cantidad_solicitada,
            cantidad_encontrada: det.cantidad_encontrada,
            estado: det.estado,
            notas: det.notas,
            descripcion: repuestoInfo?.descripcion || det.codigo_repuesto,
            ubicacion_bodega: repuestoInfo?.ubicacion_bodega || 'No especificada',
            stock_actual: repuestoInfo?.stock_actual || 0,
            codigo_alternativo: alternativa,
            tipo_sustitucion: tipoSustitucion
          };
        })
      );

      setDetalles(detallesMapeados);

    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar solicitud');
      navigate('/bodega/solicitudes');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEncontrado = async (detalleId: string, currentEstado: string) => {
    const nuevoEstado = currentEstado === 'encontrado' ? 'pendiente' : 'encontrado';
    
    try {
      const { error } = await supabase
        .from('repuestos_solicitud_detalle')
        .update({ 
          estado: nuevoEstado,
          verificado_por: currentUserId,
          fecha_verificacion: new Date().toISOString()
        })
        .eq('id', detalleId);

      if (error) throw error;

      setDetalles(prev => prev.map(d =>
        d.id === detalleId ? { ...d, estado: nuevoEstado } : d
      ));
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al actualizar estado');
    }
  };

  const handleMarcarDescuadre = async (detalleId: string, notas: string) => {
    try {
      const { error } = await supabase
        .from('repuestos_solicitud_detalle')
        .update({ 
          estado: 'descuadre',
          notas,
          verificado_por: currentUserId,
          fecha_verificacion: new Date().toISOString()
        })
        .eq('id', detalleId);

      if (error) throw error;

      // Crear notificación para el técnico
      const { data: solicitudData } = await supabase
        .from('solicitudes_repuestos')
        .select('incidente_id, tecnico_solicitante')
        .eq('id', id)
        .single();

      if (solicitudData) {
        const detalle = detalles.find(d => d.id === detalleId);
        await supabase
          .from('notificaciones')
          .insert({
            user_id: currentUserId,
            tipo: 'descuadre_repuesto',
            mensaje: `Descuadre en repuesto ${detalle?.codigo_repuesto} - ${detalle?.descripcion}. ${notas}`,
            incidente_id: solicitudData.incidente_id,
            metadata: {
              solicitud_id: id,
              codigo_repuesto: detalle?.codigo_repuesto,
              tecnico: solicitudData.tecnico_solicitante
            }
          });
      }

      toast.success('Descuadre reportado y técnico notificado');
      await fetchSolicitud();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al reportar descuadre');
    }
  };

  const handleCompletarSolicitud = async () => {
    if (!id || !currentUserId) return;

    const todosVerificados = detalles.every(d => 
      d.estado === 'encontrado' || d.estado === 'descuadre'
    );

    if (!todosVerificados) {
      toast.error('Debes verificar todos los repuestos antes de completar');
      return;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('nombre, apellido')
        .eq('user_id', currentUserId)
        .maybeSingle();

      const entregadoPor = profile ? `${profile.nombre} ${profile.apellido}` : 'Bodega';

      const { error } = await supabase
        .from('solicitudes_repuestos')
        .update({ 
          estado: 'entregado',
          fecha_entrega: new Date().toISOString(),
          entregado_por: entregadoPor
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Solicitud completada exitosamente');
      navigate('/bodega/solicitudes');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al completar solicitud');
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'encontrado':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'descuadre':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'faltante':
        return <XCircle className="h-5 w-5 text-orange-500" />;
      default:
        return <Package className="h-5 w-5 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Cargando...</div>
      </div>
    );
  }

  if (!solicitud) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Solicitud no encontrada</div>
      </div>
    );
  }

  const todosCompletados = detalles.every(d => d.estado === 'encontrado' || d.estado === 'descuadre');

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/bodega/solicitudes')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Detalle de Solicitud</h1>
          <p className="text-muted-foreground">
            Incidente: {solicitud.incidente_codigo} - Técnico: {solicitud.tecnico_solicitante}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Repuestos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{detalles.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Encontrados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {detalles.filter(d => d.estado === 'encontrado').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Descuadres</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {detalles.filter(d => d.estado === 'descuadre').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Checklist de Repuestos</CardTitle>
          <CardDescription>
            Verifica cada repuesto en la bodega
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {detalles.map((detalle) => (
            <Card key={detalle.id} className="border-2">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="pt-1">
                    <Checkbox
                      checked={detalle.estado === 'encontrado'}
                      onCheckedChange={() => handleToggleEncontrado(detalle.id, detalle.estado)}
                      disabled={solicitud.estado === 'entregado'}
                    />
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {getEstadoIcon(detalle.estado)}
                          <h4 className="font-semibold text-lg">{detalle.descripcion}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Código solicitado: <span className="font-mono font-medium">{detalle.codigo_repuesto}</span>
                        </p>
                        {detalle.codigo_alternativo && (
                          <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200">
                            <div className="flex items-center gap-2 text-sm">
                              <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                              <span className="text-blue-700 dark:text-blue-400 font-medium">
                                Se despachará: <span className="font-mono">{detalle.codigo_alternativo}</span>
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {detalle.tipo_sustitucion === 'padre' && 'Código Padre'}
                                {detalle.tipo_sustitucion === 'hermano' && 'Código Hermano'}
                                {detalle.tipo_sustitucion === 'equivalente' && 'Equivalente'}
                              </Badge>
                            </div>
                          </div>
                        )}
                      </div>
                      <Badge variant={detalle.estado === 'encontrado' ? 'default' : 'secondary'}>
                        Cant: {detalle.cantidad_solicitada}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Ubicación:</span>
                        <span className="font-medium">{detalle.ubicacion_bodega || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Stock:</span>
                        <span className="font-medium">{detalle.stock_actual || 0}</span>
                      </div>
                    </div>

                    {detalle.estado === 'descuadre' && detalle.notas && (
                      <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg">
                        <p className="text-sm text-red-700 dark:text-red-400">
                          <strong>Descuadre:</strong> {detalle.notas}
                        </p>
                      </div>
                    )}

                    {detalle.estado === 'pendiente' && solicitud.estado !== 'entregado' && (
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Describe el problema del descuadre..."
                          className="flex-1"
                          id={`notas-${detalle.id}`}
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            const textarea = document.getElementById(`notas-${detalle.id}`) as HTMLTextAreaElement;
                            if (textarea?.value.trim()) {
                              handleMarcarDescuadre(detalle.id, textarea.value);
                            } else {
                              toast.error('Debes describir el problema del descuadre');
                            }
                          }}
                        >
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          Reportar Descuadre
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {solicitud.estado !== 'entregado' && (
        <div className="flex justify-end">
          <Button
            size="lg"
            disabled={!todosCompletados}
            onClick={handleCompletarSolicitud}
            className="bg-green-500 hover:bg-green-600"
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            Completar Solicitud
          </Button>
        </div>
      )}
    </div>
  );
}
