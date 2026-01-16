import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, Package, MapPin, CheckCircle2, Clock, ScanLine, 
  Building2, ArrowRight, History, LayoutGrid, AlertTriangle,
  Calendar, RefreshCw, Layers
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, differenceInDays, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { InventoryKPICard } from "@/components/bodega/InventoryKPICard";
import { BarcodeScanner } from "@/components/bodega/BarcodeScanner";
import { MovimientoTimeline } from "@/components/bodega/MovimientoTimeline";
import { TablePagination } from "@/components/TablePagination";
import { cn } from "@/lib/utils";

type InventarioItem = {
  id: string;
  codigo_repuesto: string;
  centro_servicio_id: string;
  cantidad: number;
  ubicacion_legacy: string | null;
  ubicacion_id: number | null;
  descripcion: string | null;
  created_at: string;
  centros_servicio: {
    nombre: string;
  } | null;
};

type CentroServicio = {
  id: string;
  nombre: string;
};

type Ubicacion = {
  id: number;
  pasillo: string | null;
  rack: string | null;
  nivel: string | null;
  bodega_id: string | null;
};

type MovimientoReubicacion = {
  id: string;
  tipo_movimiento: string;
  cantidad: number;
  motivo: string | null;
  created_at: string;
  codigo_repuesto: string;
  ubicacion: string | null;
  stock_anterior?: number | null;
  stock_nuevo?: number | null;
};

type CentroConPendientes = {
  id: string;
  nombre: string;
  pendientes: number;
};

export default function ReubicacionRepuestos() {
  // State management
  const [inventarioItems, setInventarioItems] = useState<InventarioItem[]>([]);
  const [centrosServicio, setCentrosServicio] = useState<CentroServicio[]>([]);
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [historialMovimientos, setHistorialMovimientos] = useState<MovimientoReubicacion[]>([]);
  const [centrosPendientes, setCentrosPendientes] = useState<CentroConPendientes[]>([]);
  
  // Filters & search
  const [centroSeleccionado, setCentroSeleccionado] = useState<string>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [soloAntiguos, setSoloAntiguos] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Selection
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
  // Dialogs
  const [showReubicacionDialog, setShowReubicacionDialog] = useState(false);
  const [showReubicacionMasivaDialog, setShowReubicacionMasivaDialog] = useState(false);
  const [itemAUbicar, setItemAUbicar] = useState<InventarioItem | null>(null);
  const [modoUbicacion, setModoUbicacion] = useState<"existente" | "nueva">("nueva");
  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState<string>("");
  const [nuevaUbicacion, setNuevaUbicacion] = useState({ pasillo: "", rack: "", nivel: "" });
  
  // Loading & stats
  const [loading, setLoading] = useState(true);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [stats, setStats] = useState({
    pendientesTotal: 0,
    reubicadosHoy: 0,
    centrosAfectados: 0,
    antiguosSinUbicar: 0
  });

  // Active tab
  const [activeTab, setActiveTab] = useState("pendientes");

  // Initial data fetch
  useEffect(() => {
    fetchCentrosServicio();
    fetchUbicaciones();
  }, []);

  useEffect(() => {
    fetchInventario();
    fetchStats();
  }, [centroSeleccionado]);

  useEffect(() => {
    if (activeTab === "historial") {
      fetchHistorial();
    }
    if (activeTab === "por-centro") {
      fetchCentrosPendientes();
    }
  }, [activeTab]);

  // Fetch functions
  const fetchCentrosServicio = async () => {
    try {
      const { data, error } = await supabase
        .from("centros_servicio")
        .select("id, nombre")
        .eq("activo", true)
        .order("nombre");

      if (error) throw error;
      setCentrosServicio(data || []);
    } catch (error) {
      console.error("Error fetching centros:", error);
      toast.error("Error al cargar centros de servicio");
    }
  };

  const fetchUbicaciones = async () => {
    try {
      const { data, error } = await supabase
        .from("Ubicación_CDS")
        .select("id, pasillo, rack, nivel, bodega_id")
        .order("pasillo")
        .order("rack")
        .order("nivel");

      if (error) throw error;
      setUbicaciones(data || []);
    } catch (error) {
      console.error("Error fetching ubicaciones:", error);
    }
  };

  const fetchInventario = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("inventario")
        .select(`
          id,
          codigo_repuesto,
          centro_servicio_id,
          cantidad,
          ubicacion_legacy,
          ubicacion_id,
          descripcion,
          created_at,
          centros_servicio (
            nombre
          )
        `)
        .is("ubicacion_id", null);

      if (centroSeleccionado && centroSeleccionado !== "todos") {
        query = query.eq("centro_servicio_id", centroSeleccionado);
      }

      const { data, error } = await query.order("created_at", { ascending: true });

      if (error) throw error;
      setInventarioItems(data || []);
      setSelectedItems(new Set());
    } catch (error) {
      console.error("Error fetching inventario:", error);
      toast.error("Error al cargar inventario pendiente");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Total pendientes
      let pendientesQuery = supabase
        .from("inventario")
        .select("id, centro_servicio_id, created_at", { count: "exact" })
        .is("ubicacion_id", null);

      if (centroSeleccionado && centroSeleccionado !== "todos") {
        pendientesQuery = pendientesQuery.eq("centro_servicio_id", centroSeleccionado);
      }

      const { data: pendientesData, count: pendientesTotal } = await pendientesQuery;

      // Centros afectados (unique)
      const centrosUnicos = new Set(pendientesData?.map(p => p.centro_servicio_id) || []);

      // Antiguos (> 7 días)
      const hace7Dias = new Date();
      hace7Dias.setDate(hace7Dias.getDate() - 7);
      const antiguosSinUbicar = pendientesData?.filter(
        p => new Date(p.created_at) < hace7Dias
      ).length || 0;

      // Reubicados hoy
      const today = startOfDay(new Date()).toISOString();
      let reubicadosQuery = supabase
        .from("movimientos_inventario")
        .select("id", { count: "exact", head: true })
        .eq("tipo_movimiento", "reubicacion")
        .gte("created_at", today);

      if (centroSeleccionado && centroSeleccionado !== "todos") {
        reubicadosQuery = reubicadosQuery.eq("centro_servicio_id", centroSeleccionado);
      }

      const { count: reubicadosHoy } = await reubicadosQuery;

      setStats({
        pendientesTotal: pendientesTotal || 0,
        reubicadosHoy: reubicadosHoy || 0,
        centrosAfectados: centrosUnicos.size,
        antiguosSinUbicar
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchHistorial = async () => {
    try {
      setLoadingHistorial(true);
      let query = supabase
        .from("movimientos_inventario")
        .select("*")
        .eq("tipo_movimiento", "reubicacion")
        .order("created_at", { ascending: false })
        .limit(50);

      if (centroSeleccionado && centroSeleccionado !== "todos") {
        query = query.eq("centro_servicio_id", centroSeleccionado);
      }

      const { data, error } = await query;

      if (error) throw error;
      setHistorialMovimientos(data || []);
    } catch (error) {
      console.error("Error fetching historial:", error);
    } finally {
      setLoadingHistorial(false);
    }
  };

  const fetchCentrosPendientes = async () => {
    try {
      const { data, error } = await supabase
        .from("inventario")
        .select("centro_servicio_id, centros_servicio(nombre)")
        .is("ubicacion_id", null);

      if (error) throw error;

      // Group by centro
      const grouped: Record<string, CentroConPendientes> = {};
      data?.forEach(item => {
        const id = item.centro_servicio_id;
        if (!grouped[id]) {
          grouped[id] = {
            id,
            nombre: (item.centros_servicio as any)?.nombre || "Sin nombre",
            pendientes: 0
          };
        }
        grouped[id].pendientes++;
      });

      setCentrosPendientes(Object.values(grouped).sort((a, b) => b.pendientes - a.pendientes));
    } catch (error) {
      console.error("Error fetching centros pendientes:", error);
    }
  };

  // Filter items
  const itemsFiltrados = useMemo(() => {
    let filtered = inventarioItems;
    
    if (busqueda) {
      const search = busqueda.toLowerCase();
      filtered = filtered.filter(item =>
        item.codigo_repuesto.toLowerCase().includes(search) ||
        item.descripcion?.toLowerCase().includes(search)
      );
    }

    if (soloAntiguos) {
      const hace7Dias = new Date();
      hace7Dias.setDate(hace7Dias.getDate() - 7);
      filtered = filtered.filter(item => new Date(item.created_at) < hace7Dias);
    }

    return filtered;
  }, [inventarioItems, busqueda, soloAntiguos]);

  // Pagination
  const totalPages = Math.ceil(itemsFiltrados.length / itemsPerPage);
  const paginatedItems = itemsFiltrados.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(paginatedItems.map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(itemId);
    } else {
      newSelected.delete(itemId);
    }
    setSelectedItems(newSelected);
  };

  // Scanner handler
  const handleScan = (code: string) => {
    setBusqueda(code);
    setShowScanner(false);
  };

  // Reubicación handlers
  const handleIniciarReubicacion = (item: InventarioItem) => {
    setItemAUbicar(item);
    setModoUbicacion("nueva");
    setUbicacionSeleccionada("");
    setNuevaUbicacion({ pasillo: "", rack: "", nivel: "" });
    setShowReubicacionDialog(true);
  };

  const handleIniciarReubicacionMasiva = () => {
    if (selectedItems.size === 0) {
      toast.warning("Selecciona al menos un repuesto");
      return;
    }
    setModoUbicacion("nueva");
    setUbicacionSeleccionada("");
    setNuevaUbicacion({ pasillo: "", rack: "", nivel: "" });
    setShowReubicacionMasivaDialog(true);
  };

  const getUbicacionFinal = (): string | null => {
    if (modoUbicacion === "existente" && ubicacionSeleccionada) {
      const ub = ubicaciones.find(u => u.id.toString() === ubicacionSeleccionada);
      if (ub) {
        return `${ub.pasillo || ""}.${ub.rack || ""}.${ub.nivel || ""}`;
      }
    } else if (modoUbicacion === "nueva" && nuevaUbicacion.pasillo && nuevaUbicacion.rack && nuevaUbicacion.nivel) {
      return `${nuevaUbicacion.pasillo}.${nuevaUbicacion.rack}.${nuevaUbicacion.nivel}`;
    }
    return null;
  };

  const handleConfirmarReubicacion = async () => {
    if (!itemAUbicar) return;
    
    const ubicacionFinal = getUbicacionFinal();
    if (!ubicacionFinal) {
      toast.error("Completa la ubicación");
      return;
    }

    try {
      const user = await supabase.auth.getUser();

      const { error: updateError } = await supabase
        .from("inventario")
        .update({ ubicacion_legacy: ubicacionFinal })
        .eq("id", itemAUbicar.id);

      if (updateError) throw updateError;

      await supabase.from("movimientos_inventario").insert({
        centro_servicio_id: itemAUbicar.centro_servicio_id,
        codigo_repuesto: itemAUbicar.codigo_repuesto,
        tipo_movimiento: "reubicacion",
        cantidad: itemAUbicar.cantidad,
        ubicacion: ubicacionFinal,
        referencia: `Ubicado en ${ubicacionFinal}`,
        created_by: user.data.user?.id,
      });

      toast.success(`Repuesto ubicado en ${ubicacionFinal}`);
      setShowReubicacionDialog(false);
      fetchInventario();
      fetchStats();
    } catch (error) {
      console.error("Error al reubicar:", error);
      toast.error("Error al reubicar repuesto");
    }
  };

  const handleConfirmarReubicacionMasiva = async () => {
    const ubicacionFinal = getUbicacionFinal();
    if (!ubicacionFinal) {
      toast.error("Completa la ubicación");
      return;
    }

    try {
      const user = await supabase.auth.getUser();
      const itemsToUpdate = inventarioItems.filter(item => selectedItems.has(item.id));

      for (const item of itemsToUpdate) {
        await supabase
          .from("inventario")
          .update({ ubicacion_legacy: ubicacionFinal })
          .eq("id", item.id);

        await supabase.from("movimientos_inventario").insert({
          centro_servicio_id: item.centro_servicio_id,
          codigo_repuesto: item.codigo_repuesto,
          tipo_movimiento: "reubicacion",
          cantidad: item.cantidad,
          ubicacion: ubicacionFinal,
          referencia: `Ubicado en ${ubicacionFinal} (masivo)`,
          created_by: user.data.user?.id,
        });
      }

      toast.success(`${itemsToUpdate.length} repuestos ubicados en ${ubicacionFinal}`);
      setShowReubicacionMasivaDialog(false);
      setSelectedItems(new Set());
      fetchInventario();
      fetchStats();
    } catch (error) {
      console.error("Error al reubicar masivamente:", error);
      toast.error("Error al reubicar repuestos");
    }
  };

  // Helper to get age badge
  const getAgeBadge = (createdAt: string) => {
    const days = differenceInDays(new Date(), new Date(createdAt));
    if (days > 7) {
      return <Badge variant="destructive" className="text-xs">+{days} días</Badge>;
    } else if (days > 3) {
      return <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">{days} días</Badge>;
    }
    return <Badge variant="outline" className="text-xs">{days}d</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reubicación de Repuestos</h1>
          <p className="text-muted-foreground mt-1">
            Asigna ubicación a repuestos pendientes
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { fetchInventario(); fetchStats(); }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <InventoryKPICard
          title="Pendientes Total"
          value={stats.pendientesTotal}
          icon={Package}
          color="primary"
          subtitle="Sin ubicación asignada"
        />
        <InventoryKPICard
          title="Reubicados Hoy"
          value={stats.reubicadosHoy}
          icon={CheckCircle2}
          color="success"
          subtitle="Movimientos del día"
        />
        <InventoryKPICard
          title="Centros Afectados"
          value={stats.centrosAfectados}
          icon={Building2}
          color="warning"
          subtitle="Con pendientes"
        />
        <InventoryKPICard
          title="Antiguos (+7 días)"
          value={stats.antiguosSinUbicar}
          icon={AlertTriangle}
          color="danger"
          subtitle="Requieren atención"
          isClickable
          onClick={() => { setSoloAntiguos(true); setActiveTab("pendientes"); }}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="pendientes" className="gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Pendientes</span>
            <Badge variant="secondary" className="ml-1">{itemsFiltrados.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="historial" className="gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Historial</span>
          </TabsTrigger>
          <TabsTrigger value="por-centro" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Por Centro</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Pendientes */}
        <TabsContent value="pendientes" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Centro de Servicio</Label>
                    <Select value={centroSeleccionado} onValueChange={setCentroSeleccionado}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los centros" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos los centros</SelectItem>
                        {centrosServicio.map((centro) => (
                          <SelectItem key={centro.id} value={centro.id}>
                            {centro.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Buscar</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Código o descripción..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="flex items-end gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setShowScanner(true)}>
                      <ScanLine className="h-4 w-4 mr-2" />
                      Escanear
                    </Button>
                    <Button
                      variant={soloAntiguos ? "default" : "outline"}
                      size="icon"
                      onClick={() => setSoloAntiguos(!soloAntiguos)}
                      title="Mostrar solo antiguos (+7 días)"
                    >
                      <Clock className={cn("h-4 w-4", soloAntiguos && "text-white")} />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Selection actions */}
              {selectedItems.size > 0 && (
                <div className="mt-4 flex items-center gap-4 p-3 bg-primary/5 rounded-lg border border-primary/10">
                  <span className="text-sm font-medium">
                    {selectedItems.size} seleccionado{selectedItems.size > 1 ? "s" : ""}
                  </span>
                  <Button size="sm" onClick={handleIniciarReubicacionMasiva}>
                    <Layers className="h-4 w-4 mr-2" />
                    Reubicar Seleccionados
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedItems(new Set())}>
                    Limpiar selección
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : paginatedItems.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-16 w-16 text-green-500/30 mx-auto mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">
                    {itemsFiltrados.length === 0 && inventarioItems.length > 0
                      ? "No hay resultados para tu búsqueda"
                      : "¡Todos los repuestos están ubicados!"}
                  </p>
                </div>
              ) : (
                <>
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-12">
                            <Checkbox
                              checked={paginatedItems.length > 0 && paginatedItems.every(item => selectedItems.has(item.id))}
                              onCheckedChange={handleSelectAll}
                            />
                          </TableHead>
                          <TableHead className="w-24">Antigüedad</TableHead>
                          <TableHead>Código</TableHead>
                          <TableHead className="hidden md:table-cell">Descripción</TableHead>
                          <TableHead>Centro</TableHead>
                          <TableHead className="text-right">Cant.</TableHead>
                          <TableHead className="w-28"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedItems.map((item) => (
                          <TableRow 
                            key={item.id}
                            className={cn(
                              "transition-colors",
                              selectedItems.has(item.id) && "bg-primary/5"
                            )}
                          >
                            <TableCell>
                              <Checkbox
                                checked={selectedItems.has(item.id)}
                                onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)}
                              />
                            </TableCell>
                            <TableCell>{getAgeBadge(item.created_at)}</TableCell>
                            <TableCell className="font-mono font-medium">{item.codigo_repuesto}</TableCell>
                            <TableCell className="hidden md:table-cell text-muted-foreground max-w-[200px] truncate">
                              {item.descripcion || "-"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-normal">
                                {item.centros_servicio?.nombre}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">{item.cantidad}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                className="w-full"
                                onClick={() => handleIniciarReubicacion(item)}
                              >
                                <MapPin className="h-4 w-4 mr-1" />
                                Ubicar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <TablePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    itemsPerPage={itemsPerPage}
                    totalItems={itemsFiltrados.length}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Historial */}
        <TabsContent value="historial">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Historial de Reubicaciones
              </CardTitle>
              <CardDescription>Últimos 50 movimientos de reubicación</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingHistorial ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : historialMovimientos.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay movimientos de reubicación registrados</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-4">
                    {historialMovimientos.map((mov) => (
                      <div key={mov.id} className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 border">
                        <div className="p-2 rounded-full bg-green-100 text-green-600">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-medium">{mov.codigo_repuesto}</span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <Badge variant="secondary">{mov.ubicacion}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{mov.cantidad} unidades</p>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <p>{format(new Date(mov.created_at), "dd/MM/yyyy", { locale: es })}</p>
                          <p>{format(new Date(mov.created_at), "HH:mm")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Por Centro */}
        <TabsContent value="por-centro">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {centrosPendientes.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <CheckCircle2 className="h-16 w-16 text-green-500/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">Todos los centros están al día</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              centrosPendientes.map((centro) => (
                <Card 
                  key={centro.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => {
                    setCentroSeleccionado(centro.id);
                    setActiveTab("pendientes");
                  }}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold">{centro.nombre}</h3>
                        <p className="text-2xl font-bold text-primary">{centro.pendientes}</p>
                        <p className="text-xs text-muted-foreground">repuestos pendientes</p>
                      </div>
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Building2 className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all"
                        style={{ width: `${Math.min((centro.pendientes / (stats.pendientesTotal || 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog: Reubicación Individual */}
      <Dialog open={showReubicacionDialog} onOpenChange={setShowReubicacionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Asignar Ubicación
            </DialogTitle>
            <DialogDescription>
              Define dónde se almacenará este repuesto
            </DialogDescription>
          </DialogHeader>

          {itemAUbicar && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <p className="font-mono font-bold">{itemAUbicar.codigo_repuesto}</p>
                <p className="text-sm text-muted-foreground">{itemAUbicar.descripcion}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{itemAUbicar.centros_servicio?.nombre}</Badge>
                  <Badge>{itemAUbicar.cantidad} uds</Badge>
                </div>
              </div>

              {/* Modo selector */}
              <Tabs value={modoUbicacion} onValueChange={(v) => setModoUbicacion(v as "existente" | "nueva")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="nueva">Nueva Ubicación</TabsTrigger>
                  <TabsTrigger value="existente">Existente</TabsTrigger>
                </TabsList>

                <TabsContent value="nueva" className="space-y-4 mt-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Pasillo</Label>
                      <Input
                        placeholder="A"
                        value={nuevaUbicacion.pasillo}
                        onChange={(e) => setNuevaUbicacion({ ...nuevaUbicacion, pasillo: e.target.value.toUpperCase() })}
                        maxLength={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Rack</Label>
                      <Input
                        placeholder="01"
                        value={nuevaUbicacion.rack}
                        onChange={(e) => setNuevaUbicacion({ ...nuevaUbicacion, rack: e.target.value })}
                        maxLength={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Nivel</Label>
                      <Input
                        placeholder="03"
                        value={nuevaUbicacion.nivel}
                        onChange={(e) => setNuevaUbicacion({ ...nuevaUbicacion, nivel: e.target.value })}
                        maxLength={3}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="existente" className="mt-4">
                  <Select value={ubicacionSeleccionada} onValueChange={setUbicacionSeleccionada}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una ubicación" />
                    </SelectTrigger>
                    <SelectContent>
                      {ubicaciones.map((ub) => (
                        <SelectItem key={ub.id} value={ub.id.toString()}>
                          {ub.pasillo}.{ub.rack}.{ub.nivel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TabsContent>
              </Tabs>

              {/* Preview */}
              {getUbicacionFinal() && (
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Ubicación final</p>
                  <p className="text-xl font-bold text-primary">{getUbicacionFinal()}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowReubicacionDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmarReubicacion} disabled={!getUbicacionFinal()}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Reubicación Masiva */}
      <Dialog open={showReubicacionMasivaDialog} onOpenChange={setShowReubicacionMasivaDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Reubicación Masiva
            </DialogTitle>
            <DialogDescription>
              Asigna la misma ubicación a {selectedItems.size} repuestos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-2">Repuestos seleccionados:</p>
              <ScrollArea className="h-[120px]">
                <div className="space-y-1">
                  {inventarioItems
                    .filter(item => selectedItems.has(item.id))
                    .map(item => (
                      <div key={item.id} className="flex items-center gap-2 text-sm">
                        <Package className="h-3 w-3 text-muted-foreground" />
                        <span className="font-mono">{item.codigo_repuesto}</span>
                        <span className="text-muted-foreground">({item.cantidad})</span>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </div>

            <Tabs value={modoUbicacion} onValueChange={(v) => setModoUbicacion(v as "existente" | "nueva")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="nueva">Nueva Ubicación</TabsTrigger>
                <TabsTrigger value="existente">Existente</TabsTrigger>
              </TabsList>

              <TabsContent value="nueva" className="space-y-4 mt-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Pasillo</Label>
                    <Input
                      placeholder="A"
                      value={nuevaUbicacion.pasillo}
                      onChange={(e) => setNuevaUbicacion({ ...nuevaUbicacion, pasillo: e.target.value.toUpperCase() })}
                      maxLength={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Rack</Label>
                    <Input
                      placeholder="01"
                      value={nuevaUbicacion.rack}
                      onChange={(e) => setNuevaUbicacion({ ...nuevaUbicacion, rack: e.target.value })}
                      maxLength={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Nivel</Label>
                    <Input
                      placeholder="03"
                      value={nuevaUbicacion.nivel}
                      onChange={(e) => setNuevaUbicacion({ ...nuevaUbicacion, nivel: e.target.value })}
                      maxLength={3}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="existente" className="mt-4">
                <Select value={ubicacionSeleccionada} onValueChange={setUbicacionSeleccionada}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una ubicación" />
                  </SelectTrigger>
                  <SelectContent>
                    {ubicaciones.map((ub) => (
                      <SelectItem key={ub.id} value={ub.id.toString()}>
                        {ub.pasillo}.{ub.rack}.{ub.nivel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TabsContent>
            </Tabs>

            {getUbicacionFinal() && (
              <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 text-center">
                <p className="text-xs text-muted-foreground mb-1">Ubicación final</p>
                <p className="text-xl font-bold text-primary">{getUbicacionFinal()}</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowReubicacionMasivaDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmarReubicacionMasiva} disabled={!getUbicacionFinal()}>
              Reubicar {selectedItems.size} repuestos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner */}
      <BarcodeScanner
        open={showScanner}
        onOpenChange={setShowScanner}
        onScan={handleScan}
        title="Buscar Repuesto"
        description="Escanea o ingresa el código del repuesto a ubicar"
      />
    </div>
  );
}
