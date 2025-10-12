import { useState, useEffect } from "react";
import { ShoppingCart, Clock, CheckCircle, XCircle, Package, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type Repuesto = {
  codigo: string;
  descripcion: string;
  cantidad: number;
};

type Solicitud = {
  id: string;
  incidente_id: string;
  incidente_codigo?: string;
  tecnico_solicitante: string;
  repuestos: Repuesto[];
  estado: string;
  created_at: string;
  fecha_entrega?: string;
};

export default function Solicitudes() {
  const navigate = useNavigate();
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSolicitudes();
  }, []);

  const fetchSolicitudes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('solicitudes_repuestos')
        .select(`
          *,
          incidentes (
            codigo
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const solicitudesMapeadas = (data || []).map((sol: any) => ({
        id: sol.id,
        incidente_id: sol.incidente_id,
        incidente_codigo: sol.incidentes?.codigo || 'N/A',
        tecnico_solicitante: sol.tecnico_solicitante,
        repuestos: sol.repuestos || [],
        estado: sol.estado,
        created_at: sol.created_at,
        fecha_entrega: sol.fecha_entrega
      }));

      setSolicitudes(solicitudesMapeadas);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  };

  const handleMarcarEnProceso = async (id: string) => {
    try {
      const { error } = await supabase
        .from('solicitudes_repuestos')
        .update({ estado: 'en_proceso' })
        .eq('id', id);

      if (error) throw error;

      setSolicitudes(prev => prev.map(s =>
        s.id === id ? { ...s, estado: 'en_proceso' } : s
      ));
      toast.success('Solicitud marcada en proceso');
      await fetchSolicitudes();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al actualizar solicitud');
    }
  };

  const handleDespachar = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('nombre, apellido')
        .eq('user_id', user.id)
        .maybeSingle();

      const entregadoPor = profile ? `${profile.nombre} ${profile.apellido}` : user.email || 'Bodega';

      const { error } = await supabase
        .from('solicitudes_repuestos')
        .update({ 
          estado: 'entregado',
          fecha_entrega: new Date().toISOString(),
          entregado_por: entregadoPor
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Repuestos despachados exitosamente');
      await fetchSolicitudes();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al despachar repuestos');
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "pendiente":
        return <Badge className="bg-orange-500"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>;
      case "en_proceso":
        return <Badge className="bg-blue-500"><Package className="h-3 w-3 mr-1" />En Proceso</Badge>;
      case "entregado":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Despachado</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const pendientes = solicitudes.filter(s => s.estado === "pendiente").length;
  const enProceso = solicitudes.filter(s => s.estado === "en_proceso").length;
  const despachados = solicitudes.filter(s => s.estado === "entregado").length;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ShoppingCart className="h-8 w-8 text-primary" />
          Solicitudes de Repuestos
        </h1>
        <p className="text-muted-foreground mt-2">
          Gestión de solicitudes del taller
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendientes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-500" />
              En Proceso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enProceso}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Despachados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{despachados}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Solicitudes</CardTitle>
          <CardDescription>
            {solicitudes.length} solicitudes registradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Incidente</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead>Repuestos</TableHead>
                  <TableHead>Fecha Solicitud</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {solicitudes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No hay solicitudes de repuestos
                    </TableCell>
                  </TableRow>
                ) : (
                  solicitudes.map((solicitud) => (
                    <>
                      <TableRow key={solicitud.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRow(solicitud.id)}
                            className="h-8 w-8 p-0"
                          >
                            {expandedRows.has(solicitud.id) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="link"
                            className="p-0 h-auto font-medium"
                            onClick={() => navigate(`/mostrador/seguimiento/${solicitud.incidente_id}`)}
                          >
                            {solicitud.incidente_codigo}
                          </Button>
                        </TableCell>
                        <TableCell>{solicitud.tecnico_solicitante}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {solicitud.repuestos?.length || 0} items
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(solicitud.created_at).toLocaleDateString('es-GT')}</TableCell>
                        <TableCell>{getEstadoBadge(solicitud.estado)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {solicitud.estado === "pendiente" && (
                              <Button
                                size="sm"
                                onClick={() => handleMarcarEnProceso(solicitud.id)}
                              >
                                Marcar En Proceso
                              </Button>
                            )}
                            {solicitud.estado === "en_proceso" && (
                              <Button
                                size="sm"
                                className="bg-green-500 hover:bg-green-600"
                                onClick={() => handleDespachar(solicitud.id)}
                              >
                                Despachar
                              </Button>
                            )}
                            {solicitud.estado === "entregado" && solicitud.fecha_entrega && (
                              <span className="text-xs text-muted-foreground">
                                {new Date(solicitud.fecha_entrega).toLocaleDateString('es-GT')}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedRows.has(solicitud.id) && (
                        <TableRow>
                          <TableCell colSpan={7} className="bg-muted/30">
                            <div className="p-4 space-y-2">
                              <h4 className="font-semibold text-sm mb-3">Detalle de Repuestos Solicitados:</h4>
                              {solicitud.repuestos && solicitud.repuestos.length > 0 ? (
                                <div className="grid gap-2">
                                  {solicitud.repuestos.map((rep: Repuesto, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-card rounded-lg border">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center">
                                          <Package className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                          <p className="font-medium text-sm">{rep.descripcion}</p>
                                          <p className="text-xs text-muted-foreground">Código: {rep.codigo}</p>
                                        </div>
                                      </div>
                                      <Badge variant="secondary">
                                        Cantidad: {rep.cantidad}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">No hay repuestos en esta solicitud</p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
