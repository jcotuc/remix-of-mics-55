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
import { Switch } from "@/components/ui/switch";
import { 
  Search, Package, MapPin, CheckCircle2, Clock, ScanLine, 
  Building2, ArrowRight, History, LayoutGrid, AlertTriangle,
  RefreshCw, Layers, MoveRight
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { differenceInDays, startOfDay } from "date-fns";
import { formatFechaCorta, formatHora } from "@/utils/dateFormatters";
import { InventoryKPICard } from "@/components/bodega/InventoryKPICard";
import { BarcodeScanner } from "@/components/bodega/BarcodeScanner";
import { TablePagination } from "@/components/shared";
import { cn } from "@/lib/utils";

type InventarioItem = {
  id: number;
  codigo_repuesto: string;
  centro_servicio_id: number;
  cantidad: number;
  ubicacion_legacy: string | null;
  ubicacion_id: number | null;
  descripcion: string | null;
  created_at: string;
  centro_nombre?: string;
};

type CentroServicio = {
  id: number;
  nombre: string;
};

type Ubicacion = {
  id: number;
  codigo: string | null;
  pasillo: string | null;
  rack: string | null;
  nivel: string | null;
  caja: string | null;
  bodega_id: number | null;
};

type MovimientoReubicacion = {
  id: number;
  tipo_movimiento: string;
  cantidad: number;
  motivo: string | null;
  created_at: string;
  codigo_repuesto?: string;
  ubicacion: string | null;
  referencia: string | null;
  stock_anterior?: number | null;
  stock_nuevo?: number | null;
  repuesto_id?: number;
};

type CentroConPendientes = {
  id: number;
  nombre: string;
  pendientes: number;
};

// Excel-style sorting: numbers first (1,2,3...), then letters (A,B,C...)
const sortExcelStyle = (a: string | null, b: string | null): number => {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  
  const numA = parseInt(a);
  const numB = parseInt(b);
  
  const isNumA = !isNaN(numA);
  const isNumB = !isNaN(numB);
  
  if (isNumA && isNumB) return numA - numB;
  if (isNumA) return -1;  // Numbers before letters
  if (isNumB) return 1;
  return a.localeCompare(b);
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
  const [soloSinUbicar, setSoloSinUbicar] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Selection
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  
  // Dialogs
  const [showReubicacionDialog, setShowReubicacionDialog] = useState(false);
  const [showReubicacionMasivaDialog, setShowReubicacionMasivaDialog] = useState(false);
  const [itemAUbicar, setItemAUbicar] = useState<InventarioItem | null>(null);
  const [modoUbicacion, setModoUbicacion] = useState<"existente" | "nueva">("nueva");
  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState<string>("");
  const [nuevaUbicacion, setNuevaUbicacion] = useState({ pasillo: "", rack: "", nivel: "", caja: "" });
  
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
  }, [centroSeleccionado, soloSinUbicar]);

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
      const { data, error } = await (supabase as any)
        .from("centros_de_servicio")
        .select("id, nombre")
        .eq("activo", true)
        .order("nombre");

      if (error) throw error;
      setCentrosServicio((data || []) as CentroServicio[]);
    } catch (error) {
      console.error("Error fetching centros:", error);
      toast.error("Error al cargar centros de servicio");
    }
  };

  const fetchUbicaciones = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("ubicaciones")
        .select("id, codigo, pasillo, rack, nivel, caja, bodega_id")
        .order("pasillo")
        .order("rack")
        .order("nivel");

      if (error) throw error;
      
      // Sort with Excel-style for caja
      const sorted = ((data || []) as Ubicacion[]).sort((a, b) => {
        const pasilloCompare = sortExcelStyle(a.pasillo, b.pasillo);
        if (pasilloCompare !== 0) return pasilloCompare;
        
        const rackCompare = sortExcelStyle(a.rack, b.rack);
        if (rackCompare !== 0) return rackCompare;
        
        const nivelCompare = sortExcelStyle(a.nivel, b.nivel);
        if (nivelCompare !== 0) return nivelCompare;
        
        return sortExcelStyle(a.caja, b.caja);
      });
      
      setUbicaciones(sorted);
    } catch (error) {
      console.error("Error fetching ubicaciones:", error);
    }
  };

  const fetchInventario = async () => {
    try {
      setLoading(true);
      
      // Fetch inventory items
      let query = supabase
        .from("inventario")
        .select("id, codigo_repuesto, centro_servicio_id, cantidad, ubicacion_legacy, ubicacion_id, descripcion, created_at");

      if (soloSinUbicar) {
        query = query.is("ubicacion_id", null);
      }

      if (centroSeleccionado && centroSeleccionado !== "todos") {
        query = query.eq("centro_servicio_id", Number(centroSeleccionado));
      }

      const { data: inventarioData, error } = await query.order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch centros to map names
      const { data: centrosData } = await (supabase as any)
        .from("centros_de_servicio")
        .select("id, nombre");

      const centrosMap = new Map((centrosData || []).map((c: any) => [c.id, c.nombre]));

      const items: InventarioItem[] = (inventarioData || []).map((item: any) => ({
        ...item,
        centro_nombre: centrosMap.get(item.centro_servicio_id) || "Sin centro"
      }));

      setInventarioItems(items);
      setSelectedItems(new Set());
    } catch (error) {
      console.error("Error fetching inventario:", error);
      toast.error("Error al cargar inventario");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Total pendientes (siempre sin ubicación)
      let pendientesQuery = supabase
        .from("inventario")
        .select("id, centro_servicio_id, created_at", { count: "exact" })
        .is("ubicacion_id", null);

      if (centroSeleccionado && centroSeleccionado !== "todos") {
        pendientesQuery = pendientesQuery.eq("centro_servicio_id", Number(centroSeleccionado));
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

      // Reubicados hoy - use AJUSTE as the type for reubicación
      const today = startOfDay(new Date()).toISOString();
      let reubicadosQuery = supabase
        .from("movimientos_inventario")
        .select("id", { count: "exact", head: true })
        .eq("tipo_movimiento", "AJUSTE")
        .ilike("motivo", "%ubicac%")
        .gte("created_at", today);

      if (centroSeleccionado && centroSeleccionado !== "todos") {
        reubicadosQuery = reubicadosQuery.eq("centro_servicio_id", Number(centroSeleccionado));
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
        .select("id, tipo_movimiento, cantidad, motivo, created_at, ubicacion, referencia, stock_anterior, stock_nuevo, repuesto_id")
        .eq("tipo_movimiento", "AJUSTE")
        .ilike("motivo", "%ubicac%")
        .order("created_at", { ascending: false })
        .limit(50);

      if (centroSeleccionado && centroSeleccionado !== "todos") {
        query = query.eq("centro_servicio_id", Number(centroSeleccionado));
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Map data to include codigo_repuesto from repuesto_id
      const movimientos: MovimientoReubicacion[] = (data || []).map((mov: any) => ({
        ...mov,
        codigo_repuesto: String(mov.repuesto_id ? `REP-${mov.repuesto_id}` : 'N/A')
      }));
      
      setHistorialMovimientos(movimientos);
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
        .select("centro_servicio_id")
        .is("ubicacion_id", null);

      if (error) throw error;

      // Fetch centros to map names
      const { data: centrosData } = await (supabase as any)
        .from("centros_de_servicio")
        .select("id, nombre");

      const centrosMap = new Map((centrosData || []).map((c: any) => [c.id, c.nombre]));

      // Group by centro
      const grouped: Record<number, CentroConPendientes> = {};
      data?.forEach(item => {
        const id = item.centro_servicio_id;
        if (!grouped[id]) {
          grouped[id] = {
            id,
            nombre: (centrosMap.get(id) as string) || "Sin nombre",
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
        item.descripcion?.toLowerCase().includes(search) ||
        item.ubicacion_legacy?.toLowerCase().includes(search)
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

  const handleSelectItem = (itemId: number, checked: boolean) => {
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

  // Helper to get location string from form
  const getUbicacionFinal = (): string | null => {
    if (modoUbicacion === "existente" && ubicacionSeleccionada) {
      const ub = ubicaciones.find(u => u.id.toString() === ubicacionSeleccionada);
      if (ub && ub.codigo) {
        return ub.codigo;
      }
      // Fallback to building from parts
      if (ub) {
        let code = `${ub.pasillo || ""}.${ub.rack || ""}.${ub.nivel || ""}`;
        if (ub.caja) {
          code += `.${ub.caja}`;
        }
        return code;
      }
    } else if (modoUbicacion === "nueva") {
      if (nuevaUbicacion.pasillo && nuevaUbicacion.rack && nuevaUbicacion.nivel) {
        let code = `${nuevaUbicacion.pasillo}.${nuevaUbicacion.rack}.${nuevaUbicacion.nivel}`;
        if (nuevaUbicacion.caja) {
          code += `.${nuevaUbicacion.caja}`;
        }
        return code;
      }
    }
    return null;
  };

  // Reubicación handlers
  const handleIniciarReubicacion = (item: InventarioItem) => {
    setItemAUbicar(item);
    setModoUbicacion("nueva");
    setUbicacionSeleccionada("");
    setNuevaUbicacion({ pasillo: "", rack: "", nivel: "", caja: "" });
    setShowReubicacionDialog(true);
  };

  const handleIniciarReubicacionMasiva = () => {
    if (selectedItems.size === 0) {
      toast.warning("Selecciona al menos un repuesto");
      return;
    }
    setModoUbicacion("nueva");
    setUbicacionSeleccionada("");
    setNuevaUbicacion({ pasillo: "", rack: "", nivel: "", caja: "" });
    setShowReubicacionMasivaDialog(true);
  };

  const handleConfirmarReubicacion = async () => {
    if (!itemAUbicar) return;
    
    const ubicacionFinal = getUbicacionFinal();
    if (!ubicacionFinal) {
      toast.error("Completa la ubicación (mínimo: pasillo, rack y nivel)");
      return;
    }

    // Check if trying to move to same location
    if (itemAUbicar.ubicacion_legacy === ubicacionFinal) {
      toast.warning("El repuesto ya está en esta ubicación");
      return;
    }

    try {
      const user = await supabase.auth.getUser();
      const ubicacionAnterior = itemAUbicar.ubicacion_legacy;

      const { error: updateError } = await supabase
        .from("inventario")
        .update({ ubicacion_legacy: ubicacionFinal })
        .eq("id", itemAUbicar.id);

      if (updateError) throw updateError;

      // Get user profile id
      const { data: profileData } = await (supabase as any)
        .from("usuarios")
        .select("id")
        .eq("auth_uid", user.data.user?.id)
        .single();

      await (supabase as any).from("movimientos_inventario").insert({
        centro_servicio_id: itemAUbicar.centro_servicio_id,
        repuesto_id: itemAUbicar.id,
        tipo_movimiento: "AJUSTE",
        cantidad: itemAUbicar.cantidad,
        stock_anterior: itemAUbicar.cantidad,
        stock_nuevo: itemAUbicar.cantidad,
        ubicacion: ubicacionFinal,
        motivo: ubicacionAnterior 
          ? `Reubicación de ${ubicacionAnterior} a ${ubicacionFinal}` 
          : `Ubicado en ${ubicacionFinal}`,
        referencia: ubicacionAnterior ? "cambio_ubicacion" : "asignacion_inicial",
        created_by_id: profileData?.id || 1,
      });

      toast.success(
        ubicacionAnterior 
          ? `Repuesto movido de ${ubicacionAnterior} a ${ubicacionFinal}` 
          : `Repuesto ubicado en ${ubicacionFinal}`
      );
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
      toast.error("Completa la ubicación (mínimo: pasillo, rack y nivel)");
      return;
    }

    try {
      const user = await supabase.auth.getUser();
      const itemsToUpdate = inventarioItems.filter(item => selectedItems.has(item.id));

      // Get user profile id
      const { data: profileData } = await (supabase as any)
        .from("usuarios")
        .select("id")
        .eq("auth_uid", user.data.user?.id)
        .single();

      for (const item of itemsToUpdate) {
        const ubicacionAnterior = item.ubicacion_legacy;
        
        await supabase
          .from("inventario")
          .update({ ubicacion_legacy: ubicacionFinal })
          .eq("id", item.id);

        await (supabase as any).from("movimientos_inventario").insert({
          centro_servicio_id: item.centro_servicio_id,
          repuesto_id: item.id,
          tipo_movimiento: "AJUSTE",
          cantidad: item.cantidad,
          stock_anterior: item.cantidad,
          stock_nuevo: item.cantidad,
          ubicacion: ubicacionFinal,
          motivo: ubicacionAnterior 
            ? `Reubicación masiva de ${ubicacionAnterior} a ${ubicacionFinal}` 
            : `Ubicado en ${ubicacionFinal} (masivo)`,
          referencia: "reubicacion_masiva",
          created_by_id: profileData?.id || 1,
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

  // Preview component for location code
  const UbicacionPreview = () => {
    const preview = getUbicacionFinal();
    if (!preview) return null;
    
    return (
      <div className="p-3 bg-muted/50 rounded-lg border border-dashed">
        <p className="text-xs text-muted-foreground mb-1">Código de ubicación:</p>
        <p className="font-mono text-lg font-bold text-primary">{preview}</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reubicación de Repuestos</h1>
          <p className="text-muted-foreground mt-1">
            Asigna o cambia la ubicación de repuestos
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
          onClick={() => { setSoloAntiguos(true); setSoloSinUbicar(true); setActiveTab("pendientes"); }}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="pendientes" className="gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Repuestos</span>
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
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Centro de Servicio</Label>
                    <Select value={centroSeleccionado} onValueChange={setCentroSeleccionado}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los centros" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos los centros</SelectItem>
                        {centrosServicio.map((centro) => (
                          <SelectItem key={centro.id} value={String(centro.id)}>
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
                        placeholder="Código, descripción o ubicación..."
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

                  {/* Toggle to show all or only pending */}
                  <div className="flex items-end">
                    <div className="flex items-center space-x-2 p-2 rounded-lg border bg-muted/30">
                      <Switch
                        id="solo-sin-ubicar"
                        checked={soloSinUbicar}
                        onCheckedChange={setSoloSinUbicar}
                      />
                      <Label htmlFor="solo-sin-ubicar" className="text-sm cursor-pointer">
                        Solo pendientes
                      </Label>
                    </div>
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
                      : soloSinUbicar 
                        ? "¡Todos los repuestos están ubicados!"
                        : "No hay repuestos en este centro"}
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
                          <TableHead>Ubicación Actual</TableHead>
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
                              {item.ubicacion_legacy ? (
                                <Badge variant="secondary" className="font-mono">
                                  {item.ubicacion_legacy}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground">
                                  Sin ubicación
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-normal">
                                {item.centro_nombre}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">{item.cantidad}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                className="w-full"
                                variant={item.ubicacion_legacy ? "outline" : "default"}
                                onClick={() => handleIniciarReubicacion(item)}
                              >
                                {item.ubicacion_legacy ? (
                                  <>
                                    <MoveRight className="h-4 w-4 mr-1" />
                                    Mover
                                  </>
                                ) : (
                                  <>
                                    <MapPin className="h-4 w-4 mr-1" />
                                    Ubicar
                                  </>
                                )}
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
                            <Badge variant="secondary" className="font-mono">{mov.ubicacion}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {mov.cantidad} unidades • {mov.motivo || mov.referencia}
                          </p>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <p>{formatFechaCorta(mov.created_at)}</p>
                          <p>{formatHora(mov.created_at)}</p>
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
                    setCentroSeleccionado(String(centro.id));
                    setSoloSinUbicar(true);
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              {itemAUbicar?.ubicacion_legacy ? "Cambiar Ubicación" : "Asignar Ubicación"}
            </DialogTitle>
            <DialogDescription>
              {itemAUbicar?.ubicacion_legacy 
                ? "Mueve este repuesto a una nueva ubicación"
                : "Define dónde se almacenará este repuesto"}
            </DialogDescription>
          </DialogHeader>

          {itemAUbicar && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <p className="font-mono font-bold">{itemAUbicar.codigo_repuesto}</p>
                <p className="text-sm text-muted-foreground">{itemAUbicar.descripcion}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">{itemAUbicar.centro_nombre}</Badge>
                  <Badge>{itemAUbicar.cantidad} uds</Badge>
                  {itemAUbicar.ubicacion_legacy && (
                    <Badge variant="secondary" className="font-mono">
                      Actual: {itemAUbicar.ubicacion_legacy}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Modo selector */}
              <Tabs value={modoUbicacion} onValueChange={(v) => setModoUbicacion(v as "existente" | "nueva")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="nueva">Nueva Ubicación</TabsTrigger>
                  <TabsTrigger value="existente">Existente</TabsTrigger>
                </TabsList>

                <TabsContent value="nueva" className="space-y-4 mt-4">
                  <div className="grid grid-cols-4 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Pasillo</Label>
                      <Input
                        placeholder="A01"
                        value={nuevaUbicacion.pasillo}
                        onChange={(e) => setNuevaUbicacion({ ...nuevaUbicacion, pasillo: e.target.value.toUpperCase() })}
                        maxLength={4}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Rack</Label>
                      <Input
                        placeholder="001"
                        value={nuevaUbicacion.rack}
                        onChange={(e) => setNuevaUbicacion({ ...nuevaUbicacion, rack: e.target.value })}
                        maxLength={4}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Nivel</Label>
                      <Input
                        placeholder="02"
                        value={nuevaUbicacion.nivel}
                        onChange={(e) => setNuevaUbicacion({ ...nuevaUbicacion, nivel: e.target.value })}
                        maxLength={4}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Caja <span className="text-muted-foreground">(opc.)</span></Label>
                      <Input
                        placeholder="15"
                        value={nuevaUbicacion.caja}
                        onChange={(e) => setNuevaUbicacion({ ...nuevaUbicacion, caja: e.target.value })}
                        maxLength={4}
                      />
                    </div>
                  </div>
                  <UbicacionPreview />
                </TabsContent>

                <TabsContent value="existente" className="mt-4 space-y-4">
                  <Select value={ubicacionSeleccionada} onValueChange={setUbicacionSeleccionada}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una ubicación" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {ubicaciones.map((ub) => (
                        <SelectItem key={ub.id} value={ub.id.toString()}>
                          <span className="font-mono">
                            {ub.codigo || `${ub.pasillo}.${ub.rack}.${ub.nivel}${ub.caja ? `.${ub.caja}` : ""}`}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <UbicacionPreview />
                </TabsContent>
              </Tabs>

              {/* Show change indicator if item has existing location */}
              {itemAUbicar.ubicacion_legacy && getUbicacionFinal() && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
                  <MoveRight className="h-4 w-4" />
                  <span className="text-sm">
                    <span className="font-mono">{itemAUbicar.ubicacion_legacy}</span>
                    <ArrowRight className="h-3 w-3 inline mx-2" />
                    <span className="font-mono font-bold">{getUbicacionFinal()}</span>
                  </span>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowReubicacionDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmarReubicacion}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {itemAUbicar?.ubicacion_legacy ? "Confirmar Cambio" : "Confirmar Ubicación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Reubicación Masiva */}
      <Dialog open={showReubicacionMasivaDialog} onOpenChange={setShowReubicacionMasivaDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Reubicación Masiva
            </DialogTitle>
            <DialogDescription>
              Asigna la misma ubicación a {selectedItems.size} repuestos seleccionados
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">{selectedItems.size} repuestos seleccionados</p>
              <ScrollArea className="h-20 mt-2">
                <div className="flex flex-wrap gap-1">
                  {inventarioItems
                    .filter(item => selectedItems.has(item.id))
                    .map(item => (
                      <Badge key={item.id} variant="outline" className="text-xs font-mono">
                        {item.codigo_repuesto}
                      </Badge>
                    ))}
                </div>
              </ScrollArea>
            </div>

            {/* Modo selector */}
            <Tabs value={modoUbicacion} onValueChange={(v) => setModoUbicacion(v as "existente" | "nueva")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="nueva">Nueva Ubicación</TabsTrigger>
                <TabsTrigger value="existente">Existente</TabsTrigger>
              </TabsList>

              <TabsContent value="nueva" className="space-y-4 mt-4">
                <div className="grid grid-cols-4 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Pasillo</Label>
                    <Input
                      placeholder="A01"
                      value={nuevaUbicacion.pasillo}
                      onChange={(e) => setNuevaUbicacion({ ...nuevaUbicacion, pasillo: e.target.value.toUpperCase() })}
                      maxLength={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Rack</Label>
                    <Input
                      placeholder="001"
                      value={nuevaUbicacion.rack}
                      onChange={(e) => setNuevaUbicacion({ ...nuevaUbicacion, rack: e.target.value })}
                      maxLength={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Nivel</Label>
                    <Input
                      placeholder="02"
                      value={nuevaUbicacion.nivel}
                      onChange={(e) => setNuevaUbicacion({ ...nuevaUbicacion, nivel: e.target.value })}
                      maxLength={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Caja <span className="text-muted-foreground">(opc.)</span></Label>
                    <Input
                      placeholder="15"
                      value={nuevaUbicacion.caja}
                      onChange={(e) => setNuevaUbicacion({ ...nuevaUbicacion, caja: e.target.value })}
                      maxLength={4}
                    />
                  </div>
                </div>
                <UbicacionPreview />
              </TabsContent>

              <TabsContent value="existente" className="mt-4 space-y-4">
                <Select value={ubicacionSeleccionada} onValueChange={setUbicacionSeleccionada}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una ubicación" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {ubicaciones.map((ub) => (
                      <SelectItem key={ub.id} value={ub.id.toString()}>
                        <span className="font-mono">
                          {ub.codigo || `${ub.pasillo}.${ub.rack}.${ub.nivel}${ub.caja ? `.${ub.caja}` : ""}`}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <UbicacionPreview />
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowReubicacionMasivaDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmarReubicacionMasiva}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Confirmar Reubicación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scanner Dialog */}
      <BarcodeScanner 
        open={showScanner} 
        onOpenChange={setShowScanner} 
        onScan={handleScan} 
      />
    </div>
  );
}