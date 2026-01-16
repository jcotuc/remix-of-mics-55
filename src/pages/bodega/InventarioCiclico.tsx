import { useState, useEffect } from "react";
import { 
  Calendar, ClipboardCheck, Plus, Search, Eye, RefreshCw, 
  CheckCircle2, AlertTriangle, Clock, BarChart3, Users,
  Package, MapPin, ChevronRight, Minus, Check, X, Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface ConteoItem {
  id: string;
  codigo_repuesto: string;
  descripcion: string | null;
  cantidad_sistema: number;
  cantidad_fisica: number | null;
  diferencia: number | null;
  ajustado: boolean | null;
  contado_por: string | null;
  fecha_conteo: string | null;
  motivo_diferencia: string | null;
  requiere_aprobacion: boolean | null;
  aprobado: boolean | null;
  notas: string | null;
}

interface Conteo {
  id: string;
  numero_conteo: string;
  ubicacion: string;
  estado: string | null;
  fecha_inicio: string;
  fecha_completado: string | null;
  notas: string | null;
  centro_servicio_id: string;
  realizado_por: string | null;
  supervisor_asignador: string | null;
  auxiliar_asignado: string | null;
  fecha_programada: string | null;
  tipo_conteo: string | null;
  requiere_reconteo: boolean | null;
  aprobado_por: string | null;
  fecha_aprobacion: string | null;
  total_items: number | null;
  items_contados: number | null;
  centro_servicio?: { nombre: string };
  auxiliar_profile?: { nombre: string; apellido: string } | null;
}

interface Auxiliar {
  user_id: string;
  nombre: string;
  apellido: string;
}

const MOTIVOS_DIFERENCIA = [
  "Error de ingreso anterior",
  "Producto dañado",
  "Faltante sin explicación",
  "Error en ubicación",
  "Uso no registrado",
  "Otro"
];

export default function InventarioCiclico() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("coordinar");
  const [centroSeleccionado, setCentroSeleccionado] = useState("");
  const [centrosServicio, setCentrosServicio] = useState<any[]>([]);
  const [auxiliares, setAuxiliares] = useState<Auxiliar[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Conteos
  const [conteosProgramados, setConteosProgramados] = useState<Conteo[]>([]);
  const [conteosEnProceso, setConteosEnProceso] = useState<Conteo[]>([]);
  const [conteosPendientesAprobacion, setConteosPendientesAprobacion] = useState<Conteo[]>([]);
  
  // Mi conteo (auxiliar)
  const [miConteoActivo, setMiConteoActivo] = useState<Conteo | null>(null);
  const [itemsConteo, setItemsConteo] = useState<ConteoItem[]>([]);
  const [itemSeleccionado, setItemSeleccionado] = useState<ConteoItem | null>(null);
  const [modalConteo, setModalConteo] = useState(false);
  const [modalDiscrepancia, setModalDiscrepancia] = useState(false);
  const [cantidadContada, setCantidadContada] = useState<number>(0);
  const [motivoDiferencia, setMotivoDiferencia] = useState("");
  const [notasConteo, setNotasConteo] = useState("");
  
  // Nuevo conteo
  const [ubicacionNueva, setUbicacionNueva] = useState("");
  const [auxiliarSeleccionado, setAuxiliarSeleccionado] = useState("");
  const [fechaProgramada, setFechaProgramada] = useState("");
  
  // Detalle/Revisión
  const [conteoDetalle, setConteoDetalle] = useState<Conteo | null>(null);
  const [itemsDetalle, setItemsDetalle] = useState<ConteoItem[]>([]);
  const [modalDetalle, setModalDetalle] = useState(false);
  
  // KPIs
  const [kpis, setKpis] = useState({
    conteosHoy: 0,
    pendientes: 0,
    discrepancias: 0,
    precision: 0
  });

  useEffect(() => {
    fetchCentrosServicio();
    fetchAuxiliares();
    fetchConteos();
    fetchMiConteo();
    fetchKPIs();
  }, [user]);

  useEffect(() => {
    if (centroSeleccionado) {
      fetchConteos();
    }
  }, [centroSeleccionado]);

  const fetchCentrosServicio = async () => {
    const { data, error } = await supabase
      .from("centros_servicio")
      .select("*")
      .eq("activo", true);
    if (!error) setCentrosServicio(data || []);
  };

  const fetchAuxiliares = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, nombre, apellido");
    if (!error) setAuxiliares(data || []);
  };

  const fetchConteos = async () => {
    try {
      setLoading(true);
      
      // Conteos programados (pendientes de iniciar)
      const { data: programados } = await supabase
        .from("inventario_ciclico")
        .select(`
          *,
          centro_servicio:centros_servicio(nombre)
        `)
        .eq("estado", "programado")
        .order("fecha_programada", { ascending: true });
      
      // Conteos en proceso
      const { data: enProceso } = await supabase
        .from("inventario_ciclico")
        .select(`
          *,
          centro_servicio:centros_servicio(nombre)
        `)
        .eq("estado", "en_proceso")
        .order("fecha_inicio", { ascending: false });
      
      // Conteos pendientes de aprobación
      const { data: pendientesAprob } = await supabase
        .from("inventario_ciclico")
        .select(`
          *,
          centro_servicio:centros_servicio(nombre)
        `)
        .eq("estado", "pendiente_aprobacion")
        .order("fecha_completado", { ascending: false });
      
      setConteosProgramados(programados || []);
      setConteosEnProceso(enProceso || []);
      setConteosPendientesAprobacion(pendientesAprob || []);
      
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMiConteo = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("inventario_ciclico")
      .select(`
        *,
        centro_servicio:centros_servicio(nombre)
      `)
      .eq("auxiliar_asignado", user.id)
      .eq("estado", "en_proceso")
      .maybeSingle();
    
    if (!error && data) {
      setMiConteoActivo(data);
      fetchItemsConteo(data.id);
    }
  };

  const fetchItemsConteo = async (conteoId: string) => {
    const { data, error } = await supabase
      .from("inventario_ciclico_detalle")
      .select("*")
      .eq("inventario_id", conteoId)
      .order("codigo_repuesto", { ascending: true });
    
    if (!error) setItemsConteo(data || []);
  };

  const fetchKPIs = async () => {
    const hoy = new Date().toISOString().split('T')[0];
    
    // Conteos completados hoy
    const { count: conteosHoy } = await supabase
      .from("inventario_ciclico")
      .select("*", { count: "exact", head: true })
      .gte("fecha_inicio", hoy);
    
    // Pendientes
    const { count: pendientes } = await supabase
      .from("inventario_ciclico")
      .select("*", { count: "exact", head: true })
      .in("estado", ["programado", "en_proceso"]);
    
    // Items con discrepancia
    const { count: discrepancias } = await supabase
      .from("inventario_ciclico_detalle")
      .select("*", { count: "exact", head: true })
      .not("diferencia", "is", null)
      .neq("diferencia", 0);
    
    // Calcular precisión
    const { data: totales } = await supabase
      .from("inventario_ciclico_detalle")
      .select("cantidad_sistema, cantidad_fisica")
      .not("cantidad_fisica", "is", null);
    
    let precision = 100;
    if (totales && totales.length > 0) {
      const itemsSinDif = totales.filter(t => t.cantidad_fisica === t.cantidad_sistema).length;
      precision = Math.round((itemsSinDif / totales.length) * 100);
    }
    
    setKpis({
      conteosHoy: conteosHoy || 0,
      pendientes: pendientes || 0,
      discrepancias: discrepancias || 0,
      precision
    });
  };

  const crearConteo = async () => {
    if (!centroSeleccionado || !ubicacionNueva) {
      toast.error("Seleccione centro y ubicación");
      return;
    }

    try {
      setLoading(true);
      
      // Obtener items del inventario en esa ubicación
      const { data: items, error: itemsError } = await supabase
        .from("inventario")
        .select("*")
        .eq("centro_servicio_id", centroSeleccionado)
        .or(`ubicacion_legacy.ilike.%${ubicacionNueva}%`);

      if (itemsError) throw itemsError;

      if (!items || items.length === 0) {
        toast.error("No hay items en esa ubicación");
        return;
      }

      // Crear conteo
      const { data: conteo, error: conteoError } = await supabase
        .from("inventario_ciclico")
        .insert({
          centro_servicio_id: centroSeleccionado,
          ubicacion: ubicacionNueva,
          numero_conteo: `IC-${Date.now()}`,
          estado: (auxiliarSeleccionado && auxiliarSeleccionado !== "__self__") ? "programado" : "en_proceso",
          supervisor_asignador: user?.id,
          auxiliar_asignado: (auxiliarSeleccionado && auxiliarSeleccionado !== "__self__") ? auxiliarSeleccionado : user?.id,
          fecha_programada: fechaProgramada || new Date().toISOString().split('T')[0],
          tipo_conteo: "primer_conteo",
          total_items: items.length,
          items_contados: 0
        })
        .select()
        .single();

      if (conteoError) throw conteoError;

      // Crear detalles
      const detalles = items.map(item => ({
        inventario_id: conteo.id,
        codigo_repuesto: item.codigo_repuesto,
        descripcion: item.descripcion,
        cantidad_sistema: item.cantidad
      }));

      const { error: detallesError } = await supabase
        .from("inventario_ciclico_detalle")
        .insert(detalles);

      if (detallesError) throw detallesError;

      toast.success("Conteo creado exitosamente");
      setUbicacionNueva("");
      setAuxiliarSeleccionado("");
      setFechaProgramada("");
      fetchConteos();
      fetchMiConteo();
      fetchKPIs();
      
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al crear conteo");
    } finally {
      setLoading(false);
    }
  };

  const abrirModalConteo = (item: ConteoItem) => {
    setItemSeleccionado(item);
    setCantidadContada(0);
    setNotasConteo("");
    setModalConteo(true);
  };

  const guardarConteo = async () => {
    if (!itemSeleccionado || !miConteoActivo) return;
    
    const diferencia = cantidadContada - itemSeleccionado.cantidad_sistema;
    const tieneDiscrepancia = diferencia !== 0;
    
    if (tieneDiscrepancia) {
      setModalConteo(false);
      setModalDiscrepancia(true);
      return;
    }
    
    await guardarConteoItem(diferencia, null);
  };

  const guardarConteoConDiscrepancia = async () => {
    if (!itemSeleccionado) return;
    const diferencia = cantidadContada - itemSeleccionado.cantidad_sistema;
    await guardarConteoItem(diferencia, motivoDiferencia);
    setModalDiscrepancia(false);
    setMotivoDiferencia("");
  };

  const guardarConteoItem = async (diferencia: number, motivo: string | null) => {
    if (!itemSeleccionado || !miConteoActivo || !user) return;
    
    const requiereAprobacion = Math.abs(diferencia) > 0;
    
    const { error } = await supabase
      .from("inventario_ciclico_detalle")
      .update({
        cantidad_fisica: cantidadContada,
        diferencia,
        contado_por: user.id,
        fecha_conteo: new Date().toISOString(),
        motivo_diferencia: motivo,
        notas: notasConteo,
        requiere_aprobacion: requiereAprobacion
      })
      .eq("id", itemSeleccionado.id);
    
    if (error) {
      toast.error("Error al guardar conteo");
      return;
    }
    
    // Actualizar contador
    const nuevoContador = (miConteoActivo.items_contados || 0) + 1;
    await supabase
      .from("inventario_ciclico")
      .update({ items_contados: nuevoContador })
      .eq("id", miConteoActivo.id);
    
    toast.success("Conteo guardado");
    setModalConteo(false);
    fetchItemsConteo(miConteoActivo.id);
    fetchMiConteo();
    fetchKPIs();
  };

  const finalizarConteo = async () => {
    if (!miConteoActivo) return;
    
    const itemsSinContar = itemsConteo.filter(i => i.cantidad_fisica === null);
    if (itemsSinContar.length > 0) {
      toast.error(`Faltan ${itemsSinContar.length} items por contar`);
      return;
    }
    
    const tieneDiscrepancias = itemsConteo.some(i => i.diferencia !== 0);
    
    const { error } = await supabase
      .from("inventario_ciclico")
      .update({
        estado: tieneDiscrepancias ? "pendiente_aprobacion" : "completado",
        fecha_completado: new Date().toISOString(),
        realizado_por: user?.id
      })
      .eq("id", miConteoActivo.id);
    
    if (error) {
      toast.error("Error al finalizar conteo");
      return;
    }
    
    toast.success(tieneDiscrepancias ? "Conteo enviado a aprobación" : "Conteo completado");
    setMiConteoActivo(null);
    setItemsConteo([]);
    fetchConteos();
    fetchKPIs();
  };

  const verDetalleConteo = async (conteo: Conteo) => {
    setConteoDetalle(conteo);
    
    const { data } = await supabase
      .from("inventario_ciclico_detalle")
      .select("*")
      .eq("inventario_id", conteo.id)
      .order("diferencia", { ascending: true });
    
    setItemsDetalle(data || []);
    setModalDetalle(true);
  };

  const aprobarConteo = async () => {
    if (!conteoDetalle || !user) return;
    
    // Actualizar inventario con las cantidades físicas
    for (const item of itemsDetalle.filter(i => i.diferencia !== 0)) {
      await supabase
        .from("inventario")
        .update({ cantidad: item.cantidad_fisica || 0 })
        .eq("codigo_repuesto", item.codigo_repuesto)
        .eq("centro_servicio_id", conteoDetalle.centro_servicio_id);
      
      // Registrar movimiento de ajuste
      await supabase
        .from("movimientos_inventario")
        .insert({
          codigo_repuesto: item.codigo_repuesto,
          centro_servicio_id: conteoDetalle.centro_servicio_id,
          tipo_movimiento: "ajuste",
          cantidad: Math.abs(item.diferencia || 0),
          stock_anterior: item.cantidad_sistema,
          stock_nuevo: item.cantidad_fisica || 0,
          motivo: `Ajuste por conteo cíclico ${conteoDetalle.numero_conteo}: ${item.motivo_diferencia || 'Sin motivo'}`,
          referencia: conteoDetalle.numero_conteo,
          created_by: user.id
        });
    }
    
    // Marcar items como aprobados
    await supabase
      .from("inventario_ciclico_detalle")
      .update({ aprobado: true, ajustado: true })
      .eq("inventario_id", conteoDetalle.id);
    
    // Actualizar conteo
    await supabase
      .from("inventario_ciclico")
      .update({
        estado: "completado",
        aprobado_por: user.id,
        fecha_aprobacion: new Date().toISOString()
      })
      .eq("id", conteoDetalle.id);
    
    toast.success("Conteo aprobado y ajustes aplicados");
    setModalDetalle(false);
    fetchConteos();
    fetchKPIs();
  };

  const rechazarConteo = async () => {
    if (!conteoDetalle) return;
    
    await supabase
      .from("inventario_ciclico")
      .update({
        estado: "rechazado",
        requiere_reconteo: true
      })
      .eq("id", conteoDetalle.id);
    
    toast.info("Conteo rechazado - Se requiere reconteo");
    setModalDetalle(false);
    fetchConteos();
  };

  const itemsContados = itemsConteo.filter(i => i.cantidad_fisica !== null).length;
  const progresoConteo = itemsConteo.length > 0 ? (itemsContados / itemsConteo.length) * 100 : 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-7 w-7 text-primary" />
            Inventario Cíclico
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Conteos periódicos de inventario por ubicación
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { fetchConteos(); fetchKPIs(); }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conteos Hoy</p>
                <p className="text-2xl font-bold">{kpis.conteosHoy}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold">{kpis.pendientes}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Discrepancias</p>
                <p className="text-2xl font-bold">{kpis.discrepancias}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Precisión</p>
                <p className="text-2xl font-bold">{kpis.precision}%</p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="coordinar" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Coordinar
          </TabsTrigger>
          <TabsTrigger value="miconteo" className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Mi Conteo
            {miConteoActivo && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                1
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="analisis" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Análisis
          </TabsTrigger>
        </TabsList>

        {/* TAB: COORDINAR */}
        <TabsContent value="coordinar" className="space-y-6">
          {/* Nuevo Conteo */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Programar Nuevo Conteo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4 items-end">
                <div>
                  <Label className="text-xs">Centro de Servicio</Label>
                  <Select value={centroSeleccionado} onValueChange={setCentroSeleccionado}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {centrosServicio.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Ubicación</Label>
                  <Input 
                    value={ubicacionNueva}
                    onChange={(e) => setUbicacionNueva(e.target.value)}
                    placeholder="Ej: A1, B2..." 
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Auxiliar Asignado</Label>
                  <Select value={auxiliarSeleccionado} onValueChange={setAuxiliarSeleccionado}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Yo mismo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__self__">Yo mismo</SelectItem>
                      {auxiliares.map((a) => (
                        <SelectItem key={a.user_id} value={a.user_id}>
                          {a.nombre} {a.apellido}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Fecha Programada</Label>
                  <Input 
                    type="date"
                    value={fechaProgramada}
                    onChange={(e) => setFechaProgramada(e.target.value)}
                    className="h-9"
                  />
                </div>
                <Button onClick={crearConteo} disabled={loading} className="h-9">
                  <Plus className="h-4 w-4 mr-1" />
                  Crear Conteo
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Kanban de conteos */}
          <div className="grid grid-cols-3 gap-4">
            {/* Programados */}
            <Card className="border-t-4 border-t-blue-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  Programados
                  <Badge variant="secondary" className="ml-auto">{conteosProgramados.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {conteosProgramados.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Sin conteos programados</p>
                    ) : (
                      conteosProgramados.map((c) => (
                        <Card key={c.id} className="p-3 cursor-pointer hover:bg-muted/50" onClick={() => verDetalleConteo(c)}>
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-mono text-sm font-medium">{c.numero_conteo}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3" /> {c.ubicacion}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {c.centro_servicio?.nombre}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                          {c.fecha_programada && (
                            <Badge variant="outline" className="mt-2 text-xs">
                              {new Date(c.fecha_programada).toLocaleDateString()}
                            </Badge>
                          )}
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* En Proceso */}
            <Card className="border-t-4 border-t-amber-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-amber-500" />
                  En Proceso
                  <Badge variant="secondary" className="ml-auto">{conteosEnProceso.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {conteosEnProceso.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Sin conteos en proceso</p>
                    ) : (
                      conteosEnProceso.map((c) => (
                        <Card key={c.id} className="p-3 cursor-pointer hover:bg-muted/50" onClick={() => verDetalleConteo(c)}>
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-mono text-sm font-medium">{c.numero_conteo}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3" /> {c.ubicacion}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span>{c.items_contados || 0}/{c.total_items || 0} items</span>
                              <span>{c.total_items ? Math.round(((c.items_contados || 0) / c.total_items) * 100) : 0}%</span>
                            </div>
                            <Progress value={c.total_items ? ((c.items_contados || 0) / c.total_items) * 100 : 0} className="h-1" />
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Pendientes Aprobación */}
            <Card className="border-t-4 border-t-red-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Pendientes Aprobación
                  <Badge variant="destructive" className="ml-auto">{conteosPendientesAprobacion.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {conteosPendientesAprobacion.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Sin conteos pendientes</p>
                    ) : (
                      conteosPendientesAprobacion.map((c) => (
                        <Card key={c.id} className="p-3 cursor-pointer hover:bg-muted/50 border-l-4 border-l-red-500" onClick={() => verDetalleConteo(c)}>
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-mono text-sm font-medium">{c.numero_conteo}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3" /> {c.ubicacion}
                              </p>
                            </div>
                            <Badge variant="destructive" className="text-xs">
                              Revisar
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            {c.centro_servicio?.nombre}
                          </p>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB: MI CONTEO */}
        <TabsContent value="miconteo" className="space-y-6">
          {!miConteoActivo ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">Sin conteos asignados</h3>
                <p className="text-muted-foreground mt-1">
                  No tienes conteos pendientes. Espera a que un supervisor te asigne uno.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Info del conteo activo */}
              <Card className="border-l-4 border-l-primary">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono font-bold">{miConteoActivo.numero_conteo}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <MapPin className="h-4 w-4" /> Ubicación: <strong>{miConteoActivo.ubicacion}</strong>
                        <span className="mx-2">|</span>
                        {miConteoActivo.centro_servicio?.nombre}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Progreso</p>
                      <p className="text-lg font-bold">{itemsContados}/{itemsConteo.length} items</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Progress value={progresoConteo} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Lista de items */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Items a Contar</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={itemsContados < itemsConteo.length}
                        onClick={finalizarConteo}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Finalizar Conteo
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-2">
                      {itemsConteo.map((item) => (
                        <div 
                          key={item.id}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            item.cantidad_fisica !== null 
                              ? item.diferencia === 0 
                                ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900' 
                                : 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900'
                              : 'hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {item.cantidad_fisica !== null ? (
                              item.diferencia === 0 ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              ) : (
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                              )
                            ) : (
                              <Clock className="h-5 w-5 text-muted-foreground" />
                            )}
                            <div>
                              <p className="font-mono font-medium">{item.codigo_repuesto}</p>
                              <p className="text-sm text-muted-foreground">{item.descripcion}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {item.cantidad_fisica !== null && (
                              <div className="text-right">
                                <p className="text-sm">Contado: <strong>{item.cantidad_fisica}</strong></p>
                                {item.diferencia !== 0 && (
                                  <p className={`text-xs ${item.diferencia! > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    Dif: {item.diferencia! > 0 ? '+' : ''}{item.diferencia}
                                  </p>
                                )}
                              </div>
                            )}
                            {item.cantidad_fisica === null && (
                              <Button size="sm" onClick={() => abrirModalConteo(item)}>
                                Contar
                                <ChevronRight className="h-4 w-4 ml-1" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* TAB: ANÁLISIS */}
        <TabsContent value="analisis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Análisis de Conteos</CardTitle>
              <CardDescription>Métricas y estadísticas de inventario cíclico</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <Card className="bg-muted/50">
                  <CardContent className="pt-4 text-center">
                    <p className="text-3xl font-bold text-primary">{kpis.precision}%</p>
                    <p className="text-sm text-muted-foreground">Precisión General</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="pt-4 text-center">
                    <p className="text-3xl font-bold">{kpis.conteosHoy}</p>
                    <p className="text-sm text-muted-foreground">Conteos Hoy</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="pt-4 text-center">
                    <p className="text-3xl font-bold text-amber-500">{kpis.discrepancias}</p>
                    <p className="text-sm text-muted-foreground">Items con Diferencias</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="pt-4 text-center">
                    <p className="text-3xl font-bold text-blue-500">{kpis.pendientes}</p>
                    <p className="text-sm text-muted-foreground">Conteos Pendientes</p>
                  </CardContent>
                </Card>
              </div>
              
              <div className="mt-6 text-center text-muted-foreground">
                <BarChart3 className="h-16 w-16 mx-auto mb-2 opacity-50" />
                <p>Próximamente: Gráficos de tendencias, análisis por ubicación y desempeño por auxiliar</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal: Conteo de Item (CONTEO CIEGO) */}
      <Dialog open={modalConteo} onOpenChange={setModalConteo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Contar Item
            </DialogTitle>
            <DialogDescription>
              Ingrese la cantidad física encontrada
            </DialogDescription>
          </DialogHeader>
          
          {itemSeleccionado && (
            <div className="space-y-6">
              <div className="bg-muted p-4 rounded-lg">
                <p className="font-mono font-bold text-lg">{itemSeleccionado.codigo_repuesto}</p>
                <p className="text-muted-foreground">{itemSeleccionado.descripcion}</p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-center block">Cantidad Física Contada</Label>
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12"
                    onClick={() => setCantidadContada(Math.max(0, cantidadContada - 1))}
                  >
                    <Minus className="h-6 w-6" />
                  </Button>
                  <Input
                    type="number"
                    min={0}
                    value={cantidadContada}
                    onChange={(e) => setCantidadContada(parseInt(e.target.value) || 0)}
                    className="h-16 w-32 text-center text-3xl font-bold"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12"
                    onClick={() => setCantidadContada(cantidadContada + 1)}
                  >
                    <Plus className="h-6 w-6" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Notas (opcional)</Label>
                <Textarea
                  value={notasConteo}
                  onChange={(e) => setNotasConteo(e.target.value)}
                  placeholder="Observaciones del conteo..."
                  rows={2}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalConteo(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarConteo}>
              <Check className="h-4 w-4 mr-2" />
              Guardar Conteo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Discrepancia Detectada */}
      <Dialog open={modalDiscrepancia} onOpenChange={setModalDiscrepancia}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Discrepancia Detectada
            </DialogTitle>
          </DialogHeader>
          
          {itemSeleccionado && (
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg border border-amber-200 dark:border-amber-900">
                <p className="font-mono font-bold">{itemSeleccionado.codigo_repuesto}</p>
                <p className="text-sm text-muted-foreground">{itemSeleccionado.descripcion}</p>
                
                <div className="grid grid-cols-3 gap-4 mt-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Sistema</p>
                    <p className="text-xl font-bold">{itemSeleccionado.cantidad_sistema}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Contado</p>
                    <p className="text-xl font-bold">{cantidadContada}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Diferencia</p>
                    <p className={`text-xl font-bold ${(cantidadContada - itemSeleccionado.cantidad_sistema) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {cantidadContada - itemSeleccionado.cantidad_sistema > 0 ? '+' : ''}
                      {cantidadContada - itemSeleccionado.cantidad_sistema}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Motivo de la diferencia *</Label>
                <Select value={motivoDiferencia} onValueChange={setMotivoDiferencia}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar motivo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {MOTIVOS_DIFERENCIA.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalDiscrepancia(false)}>
              Volver
            </Button>
            <Button onClick={guardarConteoConDiscrepancia} disabled={!motivoDiferencia}>
              Confirmar Discrepancia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Detalle/Revisión de Conteo */}
      <Dialog open={modalDetalle} onOpenChange={setModalDetalle}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Detalle del Conteo: {conteoDetalle?.numero_conteo}
            </DialogTitle>
            <DialogDescription>
              Ubicación: {conteoDetalle?.ubicacion} | {conteoDetalle?.centro_servicio?.nombre}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-center">Sistema</TableHead>
                  <TableHead className="text-center">Contado</TableHead>
                  <TableHead className="text-center">Dif</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsDetalle.map((item) => (
                  <TableRow key={item.id} className={item.diferencia !== 0 ? 'bg-amber-50 dark:bg-amber-950/20' : ''}>
                    <TableCell className="font-mono text-sm">{item.codigo_repuesto}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{item.descripcion}</TableCell>
                    <TableCell className="text-center">{item.cantidad_sistema}</TableCell>
                    <TableCell className="text-center">{item.cantidad_fisica ?? '-'}</TableCell>
                    <TableCell className="text-center">
                      {item.diferencia !== null && item.diferencia !== 0 && (
                        <Badge variant={item.diferencia > 0 ? "default" : "destructive"}>
                          {item.diferencia > 0 ? '+' : ''}{item.diferencia}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                      {item.motivo_diferencia || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
          
          {conteoDetalle?.estado === 'pendiente_aprobacion' && (
            <DialogFooter className="border-t pt-4 mt-4">
              <Button variant="outline" onClick={rechazarConteo}>
                <X className="h-4 w-4 mr-2" />
                Rechazar (Reconteo)
              </Button>
              <Button onClick={aprobarConteo} className="bg-green-600 hover:bg-green-700">
                <Check className="h-4 w-4 mr-2" />
                Aprobar y Ajustar Inventario
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
