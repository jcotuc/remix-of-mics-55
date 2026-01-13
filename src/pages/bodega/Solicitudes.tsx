import { useState, useEffect } from "react";
import { ShoppingCart, Clock, CheckCircle, Package, User, Eye, ChevronDown, Search, MapPin, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

// Component for displaying a spare part with its locations
function RepuestoCard({
  repuesto,
  ubicaciones,
}: {
  repuesto: Repuesto;
  ubicaciones: Ubicacion[] | undefined;
}) {
  const stockTotal = ubicaciones?.reduce((sum, u) => sum + u.cantidad, 0) || 0;
  const hayStock = stockTotal >= repuesto.cantidad;
  const ubicacionDespacho = ubicaciones?.[0];
  const otrasUbicaciones = ubicaciones?.slice(1) || [];

  return (
    <div className="border rounded-lg p-3 bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* Código */}
          <Badge variant="outline" className="font-mono text-xs mb-1.5">
            {repuesto.codigo}
          </Badge>

          {/* Descripción */}
          <p className="text-sm text-muted-foreground truncate" title={repuesto.descripcion}>
            {repuesto.descripcion || "Sin descripción"}
          </p>

          {/* Ubicación / existencias */}
          {ubicaciones && ubicaciones.length > 0 ? (
            <div className="mt-2 space-y-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Ubicación de despacho:
                </p>
                {ubicacionDespacho && (
                  <div className="mt-1 flex items-center justify-between text-xs bg-background rounded px-2 py-1.5 border">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-semibold truncate">
                        {ubicacionDespacho.ubicacion_legacy}
                      </span>
                      {ubicaciones.length > 1 && (
                        <Badge variant="outline" className="text-[10px] h-5">
                          +{ubicaciones.length - 1}
                        </Badge>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-xs h-5">
                      {ubicacionDespacho.cantidad} disp.
                    </Badge>
                  </div>
                )}
              </div>

              {otrasUbicaciones.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground">Otras ubicaciones:</p>
                  <div className="space-y-1 max-h-24 overflow-y-auto mt-1">
                    {otrasUbicaciones.map((ub) => (
                      <div
                        key={ub.id}
                        className="flex items-center justify-between text-xs bg-background rounded px-2 py-1.5 border"
                      >
                        <span className="font-mono font-medium">{ub.ubicacion_legacy}</span>
                        <Badge variant="secondary" className="text-xs h-5">
                          {ub.cantidad} disp.
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-2 text-xs text-destructive flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Sin ubicaciones registradas
            </div>
          )}
        </div>

        {/* Cantidad solicitada (más visible) */}
        <div className="text-right flex-shrink-0">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Solicitado</p>
          <p className={`text-3xl font-bold ${hayStock ? "text-primary" : "text-destructive"}`}>
            {repuesto.cantidad}
          </p>
          {!hayStock && stockTotal > 0 && (
            <p className="text-[10px] text-destructive">Stock: {stockTotal}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Solicitudes() {
  const navigate = useNavigate();
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [ubicacionesPorCodigo, setUbicacionesPorCodigo] = useState<Record<string, Ubicacion[]>>({});
  
  // Filters
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");

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

      // Group by code
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

      // Collect all spare part codes
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

        // Add codes to set
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
      
      // Fetch locations for all codes
      await fetchUbicaciones(Array.from(todosLosCodigos));
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
        return <Badge className="bg-orange-500 hover:bg-orange-600"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>;
      case "en_proceso":
        return <Badge className="bg-blue-500 hover:bg-blue-600"><Package className="h-3 w-3 mr-1" />En Proceso</Badge>;
      case "entregado":
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Despachado</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const getBorderColor = (estado: string) => {
    switch (estado) {
      case "pendiente":
        return "border-l-orange-500";
      case "en_proceso":
        return "border-l-blue-500";
      default:
        return "border-l-muted";
    }
  };

  // Filter solicitudes
  const solicitudesFiltradas = solicitudes.filter(s => {
    // Text filter
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
    
    // Status filter
    if (filtroEstado !== "todos") {
      if (filtroEstado === "activos" && s.estado === "entregado") return false;
      if (filtroEstado === "pendiente" && s.estado !== "pendiente") return false;
      if (filtroEstado === "en_proceso" && s.estado !== "en_proceso") return false;
    }
    
    return true;
  });

  const pendientes = solicitudes.filter(s => s.estado === "pendiente").length;
  const misSolicitudes = solicitudes.filter(s => s.asignado_a === currentUserId && s.estado !== "entregado").length;
  const despachados = solicitudes.filter(s => s.estado === "entregado").length;
  
  const solicitudesActivas = solicitudesFiltradas.filter(s => s.estado !== "entregado");
  const solicitudesDespachadas = solicitudesFiltradas.filter(s => s.estado === "entregado");

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ShoppingCart className="h-8 w-8 text-primary" />
          Solicitudes de Repuestos
        </h1>
        <p className="text-muted-foreground mt-2">
          Gestión de solicitudes del taller
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/20 dark:to-orange-900/10 border-orange-200 dark:border-orange-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="p-2 bg-orange-500 rounded-full">
                <Clock className="h-4 w-4 text-white" />
              </div>
              Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">{pendientes}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="p-2 bg-blue-500 rounded-full">
                <User className="h-4 w-4 text-white" />
              </div>
              Mis Solicitudes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{misSolicitudes}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 border-green-200 dark:border-green-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="p-2 bg-green-500 rounded-full">
                <CheckCircle className="h-4 w-4 text-white" />
              </div>
              Despachados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{despachados}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por incidente, técnico o repuesto..."
                className="pl-10"
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
              />
            </div>
            
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="activos">Solo Activos</SelectItem>
                <SelectItem value="pendiente">Pendientes</SelectItem>
                <SelectItem value="en_proceso">En Proceso</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Active Requests - Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Solicitudes Activas</h2>
          <Badge variant="outline" className="text-sm">
            {solicitudesActivas.length} solicitudes
          </Badge>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando solicitudes...</p>
          </div>
        ) : solicitudesActivas.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay solicitudes activas</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {solicitudesActivas.map((solicitud) => (
              <Card 
                key={solicitud.id} 
                className={`hover:shadow-lg transition-all border-l-4 ${getBorderColor(solicitud.estado)}`}
              >
                {/* Header */}
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-primary" />
                      <Button
                        variant="link"
                        className="p-0 h-auto font-mono font-bold text-base"
                        onClick={() => navigate(`/mostrador/seguimiento/${solicitud.incidente_id}`)}
                      >
                        {solicitud.incidente_codigo}
                      </Button>
                    </div>
                    {getEstadoBadge(solicitud.estado)}
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      <span>{solicitud.tecnico_solicitante}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span title={new Date(solicitud.created_at).toLocaleString('es-GT')}>
                        {formatDistanceToNow(new Date(solicitud.created_at), { addSuffix: true, locale: es })}
                      </span>
                    </div>
                  </div>
                  {solicitud.nombre_asignado && (
                    <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1 mt-1">
                      Asignado a: <span className="font-medium">{solicitud.nombre_asignado}</span>
                    </div>
                  )}
                </CardHeader>
                
                {/* Content: List of spare parts */}
                <CardContent className="space-y-2 pb-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Repuestos ({solicitud.repuestos?.length || 0})
                  </p>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {solicitud.repuestos?.map((rep, idx) => (
                      <RepuestoCard 
                        key={`${rep.codigo}-${idx}`}
                        repuesto={rep}
                        ubicaciones={ubicacionesPorCodigo[rep.codigo]}
                      />
                    ))}
                  </div>
                </CardContent>
                
                {/* Footer: Actions */}
                <CardFooter className="pt-0 gap-2">
                  {solicitud.estado === "pendiente" && !solicitud.asignado_a && (
                    <Button
                      className="flex-1"
                      onClick={() => handleAsignarme(solicitud.id)}
                    >
                      <User className="h-4 w-4 mr-1" />
                      Asignarme
                    </Button>
                  )}
                  <Button
                    variant={solicitud.estado === "en_proceso" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => handleVerDetalle(solicitud.id)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Ver Detalle
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dispatched History */}
      <Collapsible>
        <Card>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 -mx-6 -my-4 px-6 py-4 rounded-t-lg transition-colors">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Historial de Solicitudes Despachadas
                  </CardTitle>
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
              {solicitudesDespachadas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay solicitudes despachadas
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {solicitudesDespachadas.map((solicitud) => (
                    <Card 
                      key={solicitud.id} 
                      className="border-l-4 border-l-green-500 opacity-75 hover:opacity-100 transition-opacity"
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold">{solicitud.incidente_codigo}</span>
                          {getEstadoBadge(solicitud.estado)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Técnico: {solicitud.tecnico_solicitante}
                        </p>
                        {solicitud.fecha_entrega && (
                          <p className="text-xs text-muted-foreground">
                            Entregado: {new Date(solicitud.fecha_entrega).toLocaleDateString('es-GT')}
                          </p>
                        )}
                      </CardHeader>
                      <CardContent className="pb-3">
                        <Badge variant="outline">
                          {solicitud.repuestos?.length || 0} repuestos
                        </Badge>
                      </CardContent>
                      <CardFooter className="pt-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full"
                          onClick={() => handleVerDetalle(solicitud.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver Detalle
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
