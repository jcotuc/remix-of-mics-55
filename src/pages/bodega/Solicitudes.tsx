import { useState, useEffect } from "react";
import { ShoppingCart, Clock, CheckCircle, Package, User, Eye, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

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
  asignado_a?: string;
  fecha_asignacion?: string;
  nombre_asignado?: string;
};

export default function Solicitudes() {
  const navigate = useNavigate();
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>("");

  useEffect(() => {
    fetchCurrentUser();
    fetchSolicitudes();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: profile } = await supabase
          .from('profiles')
          .select('nombre, apellido')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profile) {
          setCurrentUserName(`${profile.nombre} ${profile.apellido}`);
        }
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchSolicitudes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('solicitudes_repuestos')
        .select(`
          *,
          incidentes (
            codigo
          ),
          profiles!solicitudes_repuestos_asignado_a_fkey (
            nombre,
            apellido
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
        fecha_entrega: sol.fecha_entrega,
        asignado_a: sol.asignado_a,
        fecha_asignacion: sol.fecha_asignacion,
        nombre_asignado: sol.profiles ? `${sol.profiles.nombre} ${sol.profiles.apellido}` : null
      }));

      setSolicitudes(solicitudesMapeadas);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  };

  const handleAsignarme = async (id: string) => {
    if (!currentUserId) {
      toast.error('No se pudo identificar el usuario');
      return;
    }

    try {
      const { error } = await supabase
        .from('solicitudes_repuestos')
        .update({ 
          asignado_a: currentUserId,
          fecha_asignacion: new Date().toISOString(),
          estado: 'en_proceso'
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Solicitud asignada exitosamente');
      await fetchSolicitudes();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al asignar solicitud');
    }
  };

  const handleVerDetalle = (id: string) => {
    navigate(`/bodega/solicitudes/${id}`);
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
  const misSolicitudes = solicitudes.filter(s => s.asignado_a === currentUserId && s.estado !== "entregado").length;
  const despachados = solicitudes.filter(s => s.estado === "entregado").length;
  
  const solicitudesActivas = solicitudes.filter(s => s.estado !== "entregado");
  const solicitudesDespachadas = solicitudes.filter(s => s.estado === "entregado");

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
              <User className="h-4 w-4 text-blue-500" />
              Mis Solicitudes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{misSolicitudes}</div>
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
          <CardTitle>Solicitudes Activas</CardTitle>
          <CardDescription>
            {solicitudesActivas.length} solicitudes pendientes o en proceso
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Incidente</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead>Repuestos</TableHead>
                  <TableHead>Asignado a</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {solicitudesActivas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No hay solicitudes activas
                    </TableCell>
                  </TableRow>
                ) : (
                  solicitudesActivas.map((solicitud) => (
                    <TableRow key={solicitud.id} className="hover:bg-muted/50">
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
                      <TableCell>
                        {solicitud.nombre_asignado ? (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{solicitud.nombre_asignado}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Sin asignar</span>
                        )}
                      </TableCell>
                      <TableCell>{new Date(solicitud.created_at).toLocaleDateString('es-GT')}</TableCell>
                      <TableCell>{getEstadoBadge(solicitud.estado)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {solicitud.estado === "pendiente" && !solicitud.asignado_a && (
                            <Button
                              size="sm"
                              onClick={() => handleAsignarme(solicitud.id)}
                            >
                              <User className="h-4 w-4 mr-1" />
                              Asignarme
                            </Button>
                          )}
                          {solicitud.estado === "en_proceso" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleVerDetalle(solicitud.id)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Ver Detalle
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Collapsible>
        <Card>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <div>
                  <CardTitle>Historial de Solicitudes Despachadas</CardTitle>
                  <CardDescription>
                    {solicitudesDespachadas.length} solicitudes completadas
                  </CardDescription>
                </div>
                <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200" />
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Incidente</TableHead>
                    <TableHead>Técnico</TableHead>
                    <TableHead>Repuestos</TableHead>
                    <TableHead>Asignado a</TableHead>
                    <TableHead>Fecha Solicitud</TableHead>
                    <TableHead>Fecha Entrega</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {solicitudesDespachadas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No hay solicitudes despachadas
                      </TableCell>
                    </TableRow>
                  ) : (
                    solicitudesDespachadas.map((solicitud) => (
                      <TableRow key={solicitud.id} className="hover:bg-muted/50">
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
                        <TableCell>
                          {solicitud.nombre_asignado ? (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{solicitud.nombre_asignado}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Sin asignar</span>
                          )}
                        </TableCell>
                        <TableCell>{new Date(solicitud.created_at).toLocaleDateString('es-GT')}</TableCell>
                        <TableCell>
                          {solicitud.fecha_entrega 
                            ? new Date(solicitud.fecha_entrega).toLocaleDateString('es-GT')
                            : '-'
                          }
                        </TableCell>
                        <TableCell>{getEstadoBadge(solicitud.estado)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleVerDetalle(solicitud.id)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver Detalle
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
