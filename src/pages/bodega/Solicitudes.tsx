import { useState, useEffect } from "react";
import { ShoppingCart, Clock, CheckCircle, Package, User, ChevronRight, Search, Calendar, AlertTriangle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const [asignando, setAsignando] = useState<string | null>(null);
  
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
        fecha_asignacion: sol.fecha_asignacion
      }));

      setSolicitudes(solicitudesMapeadas);
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
      navigate(`/bodega/solicitudes/${solicitud.id}`);
    }
  };

  // Filter
  const solicitudesFiltradas = solicitudes.filter(s => {
    if (filtroTexto) {
      const texto = filtroTexto.toLowerCase();
      const coincide = 
        s.incidente_codigo?.toLowerCase().includes(texto) ||
        s.tecnico_solicitante?.toLowerCase().includes(texto) ||
        s.repuestos?.some(r => 
          r.codigo.toLowerCase().includes(texto) || 
          r.descripcion?.toLowerCase().includes(texto)
        );
      if (!coincide) return false;
    }
    return true;
  });

  const sinAsignar = solicitudesFiltradas.filter(s => s.estado === "pendiente" && !s.asignado_a);
  const misAsignadas = solicitudesFiltradas.filter(s => s.asignado_a === currentUserId && s.estado === "en_proceso");
  const pendientesDecision = solicitudesFiltradas.filter(s => s.estado === "pendiente_decision_tecnico");
  const despachadas = solicitudesFiltradas.filter(s => s.estado === "entregado");
  const sinStock = solicitudesFiltradas.filter(s => s.estado === "sin_stock" || s.estado === "cancelado_tecnico");

  const totalPendientes = solicitudes.filter(s => s.estado === "pendiente" && !s.asignado_a).length;
  const totalMias = solicitudes.filter(s => s.asignado_a === currentUserId && s.estado === "en_proceso").length;
  const totalPendientesDecision = solicitudes.filter(s => s.estado === "pendiente_decision_tecnico").length;
  const totalDespachadas = solicitudes.filter(s => s.estado === "entregado").length;

  const SolicitudCard = ({ 
    solicitud, 
    variant 
  }: { 
    solicitud: Solicitud; 
    variant: 'pending' | 'mine' 
  }) => {
    const isLoading = asignando === solicitud.id;
    const totalRepuestos = solicitud.repuestos?.reduce((sum, r) => sum + r.cantidad, 0) || 0;

    return (
      <Card 
        onClick={() => !isLoading && handleAsignarYDespachar(solicitud)}
        className={`cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden ${
          variant === 'pending' 
            ? "border-orange-300 bg-gradient-to-br from-orange-50/80 to-background dark:from-orange-950/30" 
            : "border-blue-300 bg-gradient-to-br from-blue-50/80 to-background dark:from-blue-950/30 ring-2 ring-blue-400/50"
        } ${isLoading ? "opacity-70 pointer-events-none" : ""}`}
      >
        <div className={`absolute top-0 left-0 right-0 h-1 ${
          variant === 'pending' ? "bg-orange-500" : "bg-blue-500"
        }`} />

        <CardContent className="pt-4 pb-3 px-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-mono font-bold text-base truncate">{solicitud.incidente_codigo}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                <User className="h-3 w-3 shrink-0" />
                <span className="truncate">{solicitud.tecnico_solicitante}</span>
              </p>
            </div>
            <Badge variant="secondary" className="shrink-0 text-xs">
              {totalRepuestos} rep
            </Badge>
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-3 pt-2 border-t">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(solicitud.created_at), { addSuffix: true, locale: es })}
            </span>
            <span className="flex items-center gap-0.5 font-medium">
              {variant === 'pending' ? 'Asignar' : 'Despachar'}
              <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </CardContent>

        {isLoading && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-7 w-7 text-primary" />
            Solicitudes de Repuestos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestiona las solicitudes de repuestos
          </p>
        </div>
        
        {/* Quick Stats */}
        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 text-sm">
            <Clock className="h-4 w-4" />
            <span className="font-semibold">{totalPendientes}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-sm">
            <User className="h-4 w-4" />
            <span className="font-semibold">{totalMias}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-semibold">{totalPendientesDecision}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 text-sm">
            <CheckCircle className="h-4 w-4" />
            <span className="font-semibold">{totalDespachadas}</span>
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

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        /* 4 Column Layout */
        <div className="grid gap-4 lg:grid-cols-4">
          {/* Sin Asignar */}
          <Card className="border-orange-200 dark:border-orange-900">
            <CardHeader className="py-3 px-4 bg-orange-50 dark:bg-orange-950/30 border-b border-orange-200 dark:border-orange-900">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-orange-700 dark:text-orange-300">
                <Clock className="h-4 w-4" />
                Sin Asignar
                <Badge className="ml-auto bg-orange-500 text-white">
                  {sinAsignar.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <ScrollArea className="h-[calc(100vh-320px)] min-h-[300px]">
                {sinAsignar.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Package className="h-10 w-10 mb-2 opacity-30" />
                    <p className="text-sm">Sin solicitudes pendientes</p>
                  </div>
                ) : (
                  <div className="space-y-2 pr-2">
                    {sinAsignar.map((solicitud) => (
                      <SolicitudCard 
                        key={solicitud.id} 
                        solicitud={solicitud} 
                        variant="pending" 
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Mis Asignadas */}
          <Card className="border-blue-200 dark:border-blue-900">
            <CardHeader className="py-3 px-4 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-900">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <User className="h-4 w-4" />
                Mis Asignadas
                <Badge className="ml-auto bg-blue-500 text-white">
                  {misAsignadas.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <ScrollArea className="h-[calc(100vh-320px)] min-h-[300px]">
                {misAsignadas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Package className="h-10 w-10 mb-2 opacity-30" />
                    <p className="text-sm">No tienes asignadas</p>
                  </div>
                ) : (
                  <div className="space-y-2 pr-2">
                    {misAsignadas.map((solicitud) => (
                      <SolicitudCard 
                        key={solicitud.id} 
                        solicitud={solicitud} 
                        variant="mine" 
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Esperando Decisión Técnico */}
          <Card className="border-amber-200 dark:border-amber-900">
            <CardHeader className="py-3 px-4 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4" />
                Esperando Técnico
                <Badge className="ml-auto bg-amber-500 text-white">
                  {pendientesDecision.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-320px)] min-h-[300px]">
                {pendientesDecision.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Package className="h-10 w-10 mb-2 opacity-30" />
                    <p className="text-sm">Sin solicitudes pendientes</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {pendientesDecision.map((solicitud) => (
                      <div 
                        key={solicitud.id}
                        onClick={() => navigate(`/bodega/solicitudes/${solicitud.id}`)}
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-mono font-medium text-sm truncate">
                            {solicitud.incidente_codigo}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {solicitud.tecnico_solicitante}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-[10px]">
                            Sin stock
                          </Badge>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Esperando decisión
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Despachadas */}
          <Card className="border-green-200 dark:border-green-900">
            <CardHeader className="py-3 px-4 bg-green-50 dark:bg-green-950/30 border-b border-green-200 dark:border-green-900">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-green-700 dark:text-green-300">
                <CheckCircle className="h-4 w-4" />
                Despachadas
                <Badge className="ml-auto bg-green-500 text-white">
                  {despachadas.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-320px)] min-h-[300px]">
                {despachadas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Package className="h-10 w-10 mb-2 opacity-30" />
                    <p className="text-sm">Sin despachos recientes</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {despachadas.slice(0, 50).map((solicitud) => (
                      <div 
                        key={solicitud.id}
                        onClick={() => navigate(`/bodega/solicitudes/${solicitud.id}`)}
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-mono font-medium text-sm truncate">
                            {solicitud.incidente_codigo}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {solicitud.tecnico_solicitante}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px]">
                            {solicitud.repuestos?.reduce((sum, r) => sum + r.cantidad, 0) || 0} rep
                          </Badge>
                          <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-end gap-1">
                            <Calendar className="h-2.5 w-2.5" />
                            {solicitud.fecha_entrega 
                              ? new Date(solicitud.fecha_entrega).toLocaleDateString('es-GT', { 
                                  day: '2-digit', 
                                  month: 'short'
                                })
                              : '-'
                            }
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
