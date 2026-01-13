import { useState, useEffect } from "react";
import { ShoppingCart, Clock, CheckCircle, Package, User, ChevronRight, Search, MapPin, Calendar, Box, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

type Repuesto = {
  codigo: string;
  descripcion: string;
  cantidad: number;
};

type Ubicacion = {
  id: string;
  codigo_repuesto: string;
  ubicacion_legacy: string;
  cantidad: number;
  bodega: string | null;
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
  const [ubicacionesPorCodigo, setUbicacionesPorCodigo] = useState<Record<string, Ubicacion[]>>({});
  const [asignando, setAsignando] = useState<string | null>(null);
  
  // Filters
  const [filtroTexto, setFiltroTexto] = useState("");

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

  const fetchUbicaciones = async (codigosRepuestos: string[]) => {
    if (codigosRepuestos.length === 0) return;
    
    try {
      const { data: inventario, error } = await supabase
        .from('inventario')
        .select('id, codigo_repuesto, ubicacion_legacy, cantidad, bodega')
        .in('codigo_repuesto', codigosRepuestos)
        .gt('cantidad', 0)
        .order('cantidad', { ascending: false });
      
      if (error) throw error;

      const agrupado = (inventario || []).reduce((acc, item) => {
        if (!acc[item.codigo_repuesto]) {
          acc[item.codigo_repuesto] = [];
        }
        acc[item.codigo_repuesto].push(item);
        return acc;
      }, {} as Record<string, Ubicacion[]>);
      
      setUbicacionesPorCodigo(agrupado);
    } catch (error) {
      console.error('Error fetching ubicaciones:', error);
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
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const todosLosCodigos = new Set<string>();
      
      const solicitudesMapeadas = await Promise.all((data || []).map(async (sol: any) => {
        let nombre_asignado = null;
        if (sol.asignado_a) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('nombre, apellido')
            .eq('user_id', sol.asignado_a)
            .maybeSingle();
          
          if (profile) {
            nombre_asignado = `${profile.nombre} ${profile.apellido}`;
          }
        }

        const repuestos = sol.repuestos || [];
        repuestos.forEach((r: Repuesto) => todosLosCodigos.add(r.codigo));

        return {
          id: sol.id,
          incidente_id: sol.incidente_id,
          incidente_codigo: sol.incidentes?.codigo || 'N/A',
          tecnico_solicitante: sol.tecnico_solicitante,
          repuestos,
          estado: sol.estado,
          created_at: sol.created_at,
          fecha_entrega: sol.fecha_entrega,
          asignado_a: sol.asignado_a,
          fecha_asignacion: sol.fecha_asignacion,
          nombre_asignado
        };
      }));

      setSolicitudes(solicitudesMapeadas);
      await fetchUbicaciones(Array.from(todosLosCodigos));
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  };

  const handleAsignarYDespachar = async (solicitud: Solicitud) => {
    if (!currentUserId) {
      toast.error('No se pudo identificar el usuario');
      return;
    }

    // If it's pending and not assigned, assign first then navigate
    if (solicitud.estado === "pendiente" && !solicitud.asignado_a) {
      setAsignando(solicitud.id);
      try {
        const { error } = await supabase
          .from('solicitudes_repuestos')
          .update({ 
            asignado_a: currentUserId,
            fecha_asignacion: new Date().toISOString(),
            estado: 'en_proceso'
          })
          .eq('id', solicitud.id);

        if (error) throw error;
        toast.success('Solicitud asignada');
        navigate(`/bodega/solicitudes/${solicitud.id}`);
      } catch (error) {
        console.error('Error:', error);
        toast.error('Error al asignar solicitud');
      } finally {
        setAsignando(null);
      }
    } else {
      // Already assigned or in process, just navigate
      navigate(`/bodega/solicitudes/${solicitud.id}`);
    }
  };

  // Filter solicitudes
  const solicitudesFiltradas = solicitudes.filter(s => {
    if (filtroTexto) {
      const texto = filtroTexto.toLowerCase();
      const coincideTexto = 
        s.incidente_codigo?.toLowerCase().includes(texto) ||
        s.tecnico_solicitante?.toLowerCase().includes(texto) ||
        s.repuestos?.some(r => 
          r.codigo.toLowerCase().includes(texto) || 
          r.descripcion?.toLowerCase().includes(texto)
        );
      if (!coincideTexto) return false;
    }
    return true;
  });

  const pendientes = solicitudes.filter(s => s.estado === "pendiente");
  const misSolicitudes = solicitudes.filter(s => s.asignado_a === currentUserId && s.estado === "en_proceso");
  const despachados = solicitudesFiltradas.filter(s => s.estado === "entregado");
  
  // Combine pending and my requests for the queue
  const cola = solicitudesFiltradas.filter(s => s.estado !== "entregado");

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-7 w-7 text-primary" />
            Solicitudes de Repuestos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Toca una solicitud para asignarla y despachar
          </p>
        </div>
        
        {/* Quick Stats */}
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300">
            <Clock className="h-4 w-4" />
            <span className="font-semibold">{pendientes.length}</span>
            <span className="text-xs hidden sm:inline">Pendientes</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300">
            <User className="h-4 w-4" />
            <span className="font-semibold">{misSolicitudes.length}</span>
            <span className="text-xs hidden sm:inline">Mías</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Buscar por incidente, técnico o repuesto..."
          className="pl-10"
          value={filtroTexto}
          onChange={(e) => setFiltroTexto(e.target.value)}
        />
      </div>

      {/* Queue - Clickable Cards */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Box className="h-5 w-5 text-primary" />
          Cola de Despacho
          <Badge variant="outline" className="ml-2">{cola.length}</Badge>
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : cola.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No hay solicitudes pendientes</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {cola.map((solicitud) => {
              const isPending = solicitud.estado === "pendiente" && !solicitud.asignado_a;
              const isMine = solicitud.asignado_a === currentUserId;
              const isLoading = asignando === solicitud.id;
              const totalRepuestos = solicitud.repuestos?.reduce((sum, r) => sum + r.cantidad, 0) || 0;

              return (
                <Card 
                  key={solicitud.id}
                  onClick={() => !isLoading && handleAsignarYDespachar(solicitud)}
                  className={`cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden ${
                    isPending 
                      ? "border-orange-300 bg-gradient-to-br from-orange-50/80 to-background dark:from-orange-950/30" 
                      : isMine 
                        ? "border-blue-300 bg-gradient-to-br from-blue-50/80 to-background dark:from-blue-950/30 ring-2 ring-blue-400/50" 
                        : "border-blue-200 bg-gradient-to-br from-blue-50/50 to-background dark:from-blue-950/20"
                  } ${isLoading ? "opacity-70 pointer-events-none" : ""}`}
                >
                  {/* Status indicator line */}
                  <div className={`absolute top-0 left-0 right-0 h-1 ${
                    isPending ? "bg-orange-500" : "bg-blue-500"
                  }`} />

                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <p className="font-mono font-bold text-sm">{solicitud.incidente_codigo}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <User className="h-3 w-3" />
                          {solicitud.tecnico_solicitante}
                        </p>
                      </div>
                      <div className="text-right">
                        {isPending ? (
                          <Badge className="bg-orange-500/15 text-orange-600 border-orange-200 text-[10px]">
                            <Clock className="h-3 w-3 mr-0.5" />
                            Pendiente
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-500/15 text-blue-600 border-blue-200 text-[10px]">
                            <Send className="h-3 w-3 mr-0.5" />
                            En proceso
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Repuestos preview */}
                    <div className="space-y-1.5 mb-3">
                      {solicitud.repuestos?.slice(0, 3).map((rep, idx) => {
                        const ubicacion = ubicacionesPorCodigo[rep.codigo]?.[0];
                        return (
                          <div 
                            key={`${rep.codigo}-${idx}`}
                            className="flex items-center justify-between text-xs bg-background/80 rounded px-2 py-1.5 border"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="font-mono font-medium truncate">{rep.codigo}</span>
                              {ubicacion && (
                                <span className="text-muted-foreground flex items-center gap-0.5 shrink-0">
                                  <MapPin className="h-2.5 w-2.5" />
                                  {ubicacion.ubicacion_legacy}
                                </span>
                              )}
                            </div>
                            <Badge variant="secondary" className="ml-2 h-5 text-[10px] shrink-0">
                              {rep.cantidad}
                            </Badge>
                          </div>
                        );
                      })}
                      {(solicitud.repuestos?.length || 0) > 3 && (
                        <p className="text-[10px] text-muted-foreground text-center">
                          +{(solicitud.repuestos?.length || 0) - 3} más
                        </p>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(new Date(solicitud.created_at), { addSuffix: true, locale: es })}
                      </div>
                      <div className="flex items-center gap-1 font-medium">
                        {isPending ? (
                          <>Toca para asignar</>
                        ) : (
                          <>Despachar <ChevronRight className="h-3 w-3" /></>
                        )}
                      </div>
                    </div>

                    {isMine && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500" />
                    )}
                  </CardContent>

                  {isLoading && (
                    <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Dispatched History - Compact Table */}
      {despachados.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Historial Despachado
            <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
              {despachados.length}
            </Badge>
          </h2>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Incidente</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead className="text-center">Repuestos</TableHead>
                  <TableHead className="text-right">Fecha Entrega</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {despachados.slice(0, 10).map((solicitud) => (
                  <TableRow 
                    key={solicitud.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/bodega/solicitudes/${solicitud.id}`)}
                  >
                    <TableCell className="font-mono font-medium">
                      {solicitud.incidente_codigo}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {solicitud.tecnico_solicitante}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        {solicitud.repuestos?.length || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      {solicitud.fecha_entrega 
                        ? new Date(solicitud.fecha_entrega).toLocaleDateString('es-GT', { 
                            day: '2-digit', 
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {despachados.length > 10 && (
              <div className="p-3 text-center border-t">
                <Button variant="ghost" size="sm">
                  Ver todos ({despachados.length})
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
