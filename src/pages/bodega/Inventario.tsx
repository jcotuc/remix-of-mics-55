import { useState, useEffect, useCallback } from "react";
import { 
  Package, Search, AlertTriangle, TrendingUp, TrendingDown, Edit, 
  ScanLine, BarChart3, History, Filter, RefreshCw, Boxes, ArrowUpDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TablePagination } from "@/components/TablePagination";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subDays, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend 
} from "recharts";

// Componentes bodega
import { InventoryKPICard } from "@/components/bodega/InventoryKPICard";
import { StockAlertBanner } from "@/components/bodega/StockAlertBanner";
import { BarcodeScanner } from "@/components/bodega/BarcodeScanner";
import { ExportDropdown } from "@/components/bodega/ExportDropdown";
import { MovimientoTimeline } from "@/components/bodega/MovimientoTimeline";
import { InventarioDetailSheet } from "@/components/bodega/InventarioDetailSheet";
import { cn } from "@/lib/utils";

type InventarioItem = {
  id: string;
  codigo_repuesto: string;
  descripcion: string | null;
  cantidad: number;
  ubicacion_legacy: string;
  bodega: string | null;
  costo_unitario: number | null;
  centro_servicio_id: string;
  centro_nombre?: string;
};

type Stats = {
  totalItems: number;
  stockBajo: number;
  stockTotal: number;
  valorTotal: number;
  movimientosHoy: number;
};

type StockAlert = {
  codigo: string;
  descripcion: string;
  cantidad: number;
  ubicacion?: string;
};

type Movimiento = {
  id: string;
  tipo_movimiento: "entrada" | "salida";
  cantidad: number;
  motivo?: string | null;
  created_at: string;
  stock_anterior?: number | null;
  stock_nuevo?: number | null;
  codigo_repuesto: string;
};

const CHART_COLORS = [
  "hsl(var(--primary))", "#22c55e", "#f97316", "#ef4444", "#8b5cf6", "#06b6d4",
  "#ec4899", "#14b8a6", "#f59e0b", "#6366f1", "#84cc16", "#0ea5e9", "#d946ef", "#10b981"
];

type CentroServicio = {
  id: string;
  nombre: string;
};

export default function Inventario() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("inventario");
  
  // Search & filters
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStockBajo, setFilterStockBajo] = useState(false);
  const [filterCentroId, setFilterCentroId] = useState<string>("todos");
  const [centrosServicio, setCentrosServicio] = useState<CentroServicio[]>([]);
  
  // Data
  const [inventario, setInventario] = useState<InventarioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ totalItems: 0, stockBajo: 0, stockTotal: 0, valorTotal: 0, movimientosHoy: 0 });
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [movimientosRecientes, setMovimientosRecientes] = useState<Movimiento[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
  // Charts data
  const [chartPorCentro, setChartPorCentro] = useState<{ name: string; value: number }[]>([]);
  const [chartTendencia, setChartTendencia] = useState<{ date: string; entradas: number; salidas: number }[]>([]);
  
  // Modals & sheets
  const [showMovimiento, setShowMovimiento] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventarioItem | null>(null);
  
  // Movement form
  const [tipoMovimiento, setTipoMovimiento] = useState<"entrada" | "salida">("entrada");
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState("");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [totalCount, setTotalCount] = useState(0);

  // Sparkline data for KPIs (simulated last 7 days trend)
  const [sparklineStock, setSparklineStock] = useState<number[]>([]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Initial load - only essential data
  useEffect(() => {
    fetchCentrosServicio();
    fetchStats();
    fetchStockAlerts();
    fetchMovimientosHoy();
    // Don't fetch chart data on initial load - wait for user to click on tab
  }, []);

  const fetchCentrosServicio = async () => {
    try {
      const { data } = await supabase
        .from("centros_servicio")
        .select("id, nombre")
        .eq("activo", true)
        .order("nombre");
      setCentrosServicio(data || []);
    } catch (error) {
      console.error("Error fetching centros:", error);
    }
  };

  // Fetch inventory and stats when filters change
  useEffect(() => {
    fetchInventario();
    fetchStats();
    fetchStockAlerts();
  }, [currentPage, itemsPerPage, debouncedSearch, filterStockBajo, filterCentroId]);

  const fetchStats = async () => {
    try {
      // Use the selected centro or null for all
      const centroId = filterCentroId && filterCentroId !== "todos" ? filterCentroId : null;
      
      // Use the optimized database function for totals
      const { data: totalesData, error: totalesError } = await supabase
        .rpc("inventario_totales", { 
          p_centro_servicio_id: centroId, 
          p_search: "" 
        });

      if (totalesError) {
        console.error("Error fetching totales:", totalesError);
      }

      const totales = totalesData?.[0] || { skus: 0, unidades: 0, valor: 0 };

      // Get stock bajo count with centro filter
      let stockBajoQuery = supabase
        .from("inventario")
        .select("id", { count: "exact", head: true })
        .lte("cantidad", 5);
      
      if (centroId) {
        stockBajoQuery = stockBajoQuery.eq("centro_servicio_id", centroId);
      }
      
      const { count: stockBajo } = await stockBajoQuery;

      // Get movimientos hoy (lightweight query)
      const today = startOfDay(new Date()).toISOString();
      // Get movimientos hoy with centro filter
      let movQuery = supabase
        .from("movimientos_inventario")
        .select("id", { count: "exact", head: true })
        .gte("created_at", today);
      
      if (centroId) {
        movQuery = movQuery.eq("centro_servicio_id", centroId);
      }
      
      const { count: movimientosHoy } = await movQuery;

      setStats({
        totalItems: Number(totales.skus) || 0,
        stockBajo: stockBajo || 0,
        stockTotal: Number(totales.unidades) || 0,
        valorTotal: Number(totales.valor) || 0,
        movimientosHoy: movimientosHoy || 0
      });

      // Generate sparkline (simulated trend)
      const baseValue = Number(totales.unidades) || 0;
      const sparkline = Array.from({ length: 7 }, (_, i) => 
        Math.round(baseValue * (0.95 + Math.random() * 0.1))
      );
      sparkline[6] = baseValue;
      setSparklineStock(sparkline);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchStockAlerts = async () => {
    try {
      const { data } = await supabase
        .from("inventario")
        .select("codigo_repuesto, descripcion, cantidad, ubicacion_legacy")
        .lte("cantidad", 5)
        .order("cantidad", { ascending: true })
        .limit(30); // Reduced limit for faster loading

      const alerts: StockAlert[] = (data || []).map(item => ({
        codigo: item.codigo_repuesto,
        descripcion: item.descripcion || "",
        cantidad: item.cantidad,
        ubicacion: item.ubicacion_legacy
      }));

      setStockAlerts(alerts);
    } catch (error) {
      console.error("Error fetching stock alerts:", error);
    }
  };

  const fetchMovimientosHoy = async () => {
    try {
      const today = startOfDay(new Date()).toISOString();
      const { data } = await supabase
        .from("movimientos_inventario")
        .select("*")
        .gte("created_at", today)
        .order("created_at", { ascending: false })
        .limit(20);

      setMovimientosRecientes((data as Movimiento[]) || []);
    } catch (error) {
      console.error("Error fetching movimientos:", error);
    }
  };

  const [chartDataLoaded, setChartDataLoaded] = useState(false);

  const fetchChartData = async () => {
    if (chartDataLoaded) return; // Don't refetch if already loaded
    
    try {
      // Stock por centro - fetch all 14 centers
      const { data: centrosData } = await supabase
        .from("centros_servicio")
        .select("id, nombre")
        .eq("activo", true)
        .order("nombre");

      const porCentro: { name: string; value: number }[] = [];
      
      // Get counts for ALL centers (14 total)
      const promises = (centrosData || []).map(async (centro) => {
        const { data: stockData } = await supabase
          .rpc("inventario_totales", { 
            p_centro_servicio_id: centro.id, 
            p_search: "" 
          });
        
        return {
          name: centro.nombre,
          value: Number(stockData?.[0]?.unidades || 0)
        };
      });

      const results = await Promise.all(promises);
      results.forEach(r => {
        if (r.value > 0) {
          porCentro.push(r);
        }
      });

      setChartPorCentro(porCentro.sort((a, b) => b.value - a.value));

      // Tendencia últimos 7 días - this is lightweight since movimientos table is smaller
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        return {
          date: format(date, "dd/MM", { locale: es }),
          dateISO: format(date, "yyyy-MM-dd"),
          entradas: 0,
          salidas: 0
        };
      });

      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      const { data: movData } = await supabase
        .from("movimientos_inventario")
        .select("created_at, tipo_movimiento, cantidad")
        .gte("created_at", sevenDaysAgo)
        .limit(500);

      (movData || []).forEach((mov: any) => {
        const movDate = format(new Date(mov.created_at), "yyyy-MM-dd");
        const dayData = last7Days.find(d => d.dateISO === movDate);
        if (dayData) {
          if (mov.tipo_movimiento === "entrada") {
            dayData.entradas += mov.cantidad || 0;
          } else {
            dayData.salidas += mov.cantidad || 0;
          }
        }
      });

      setChartTendencia(last7Days.map(({ date, entradas, salidas }) => ({ date, entradas, salidas })));
      setChartDataLoaded(true);
    } catch (error) {
      console.error("Error fetching chart data:", error);
    }
  };

  // Fetch chart data when tab changes to graficos
  useEffect(() => {
    if (activeTab === "graficos" && !chartDataLoaded) {
      fetchChartData();
    }
  }, [activeTab, chartDataLoaded]);

  const fetchInventario = async () => {
    try {
      setLoading(true);
      
      const start = (currentPage - 1) * itemsPerPage;
      const end = start + itemsPerPage - 1;

      let query = supabase
        .from("inventario")
        .select(`
          *,
          centros_servicio(nombre)
        `, { count: "exact" });

      // Apply centro filter
      if (filterCentroId && filterCentroId !== "todos") {
        query = query.eq("centro_servicio_id", filterCentroId);
      }

      // Apply search filter
      if (debouncedSearch) {
        query = query.or(`codigo_repuesto.ilike.%${debouncedSearch}%,descripcion.ilike.%${debouncedSearch}%,ubicacion_legacy.ilike.%${debouncedSearch}%`);
      }

      // Apply stock bajo filter
      if (filterStockBajo) {
        query = query.lte("cantidad", 5);
      }

      const { data, error, count } = await query
        .order("codigo_repuesto")
        .range(start, end);

      if (error) throw error;

      const formateado = (data || []).map(item => ({
        id: item.id,
        codigo_repuesto: item.codigo_repuesto,
        descripcion: item.descripcion,
        cantidad: item.cantidad || 0,
        ubicacion_legacy: item.ubicacion_legacy,
        bodega: item.bodega,
        costo_unitario: item.costo_unitario,
        centro_servicio_id: item.centro_servicio_id,
        centro_nombre: (item.centros_servicio as any)?.nombre || "Sin centro"
      }));

      setInventario(formateado);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar inventario");
    } finally {
      setLoading(false);
    }
  };

  const handleMovimiento = (item: InventarioItem) => {
    setSelectedItem(item);
    setShowMovimiento(true);
    setShowDetailSheet(false);
  };

  const handleItemClick = (item: InventarioItem) => {
    setSelectedItem(item);
    setShowDetailSheet(true);
  };

  const handleScan = (code: string) => {
    setSearchTerm(code);
    setShowScanner(false);
    toast.info(`Buscando: ${code}`);
  };

  const handleAlertClick = (codigo: string) => {
    setSearchTerm(codigo);
    setFilterStockBajo(false);
  };

  const handleKPIStockBajoClick = () => {
    setFilterStockBajo(true);
    setSearchTerm("");
    setActiveTab("inventario");
  };

  const handleKPIMovimientosClick = () => {
    setActiveTab("historial");
  };

  const toggleSelectItem = (id: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === inventario.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(inventario.map(i => i.id)));
    }
  };

  const guardarMovimiento = async () => {
    if (!selectedItem || !cantidad) {
      toast.error("Complete todos los campos");
      return;
    }

    const cantidadNum = parseInt(cantidad);
    const nuevoStock = tipoMovimiento === "entrada" 
      ? selectedItem.cantidad + cantidadNum
      : selectedItem.cantidad - cantidadNum;

    if (nuevoStock < 0) {
      toast.error("Stock insuficiente");
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from("inventario")
        .update({ cantidad: nuevoStock })
        .eq("id", selectedItem.id);

      if (updateError) throw updateError;

      const { error: movError } = await supabase
        .from("movimientos_inventario")
        .insert({
          codigo_repuesto: selectedItem.codigo_repuesto,
          tipo_movimiento: tipoMovimiento,
          cantidad: cantidadNum,
          motivo: motivo || null,
          centro_servicio_id: selectedItem.centro_servicio_id,
          stock_anterior: selectedItem.cantidad,
          stock_nuevo: nuevoStock,
        });

      if (movError) {
        console.error("Error registrando movimiento:", movError);
      }

      // Update local state
      setInventario(prev => prev.map(item => 
        item.id === selectedItem.id 
          ? { ...item, cantidad: nuevoStock }
          : item
      ));

      // Refresh data
      fetchStats();
      fetchStockAlerts();
      fetchMovimientosHoy();

      toast.success(`Movimiento registrado: ${tipoMovimiento === "entrada" ? "+" : "-"}${cantidadNum} unidades`);
      setShowMovimiento(false);
      setCantidad("");
      setMotivo("");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al guardar movimiento");
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));

  // Export columns config
  const exportColumns = [
    { key: "ubicacion_legacy", label: "Ubicación" },
    { key: "codigo_repuesto", label: "SKU" },
    { key: "descripcion", label: "Descripción" },
    { key: "centro_nombre", label: "Centro" },
    { key: "cantidad", label: "Cantidad" },
    { key: "costo_unitario", label: "Costo Unitario" },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Package className="h-7 w-7 text-primary" />
            </div>
            Control de Inventario
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestión de stock de repuestos y movimientos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowScanner(true)}>
            <ScanLine className="h-4 w-4 mr-2" />
            Escanear
          </Button>
          <ExportDropdown 
            data={inventario} 
            columns={exportColumns}
            filename="inventario"
          />
          <Button variant="ghost" size="icon" onClick={() => {
            fetchStats();
            fetchInventario();
            fetchStockAlerts();
            toast.success("Datos actualizados");
          }}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <InventoryKPICard
          title="Stock Total"
          value={stats.stockTotal}
          subtitle={`${stats.totalItems.toLocaleString()} referencias`}
          icon={Boxes}
          color="primary"
          sparklineData={sparklineStock}
          isLoading={loading && stats.stockTotal === 0}
        />
        <InventoryKPICard
          title="Valor del Inventario"
          value={`Q${stats.valorTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle="Costo total en stock"
          icon={TrendingUp}
          color="success"
          isLoading={loading && stats.valorTotal === 0}
        />
        <InventoryKPICard
          title="Stock Bajo"
          value={stats.stockBajo}
          subtitle="≤ 5 unidades"
          icon={AlertTriangle}
          color={stats.stockBajo > 0 ? "warning" : "success"}
          onClick={handleKPIStockBajoClick}
          isClickable={stats.stockBajo > 0}
          isLoading={loading && stats.stockBajo === 0}
        />
        <InventoryKPICard
          title="Movimientos Hoy"
          value={stats.movimientosHoy}
          subtitle="Entradas y salidas"
          icon={ArrowUpDown}
          color="primary"
          onClick={handleKPIMovimientosClick}
          isClickable={stats.movimientosHoy > 0}
          isLoading={loading && stats.movimientosHoy === 0}
        />
      </div>

      {/* Stock Alert Banner */}
      <StockAlertBanner 
        alerts={stockAlerts}
        onAlertClick={handleAlertClick}
      />

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="inventario" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Inventario
          </TabsTrigger>
          <TabsTrigger value="graficos" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Gráficos
          </TabsTrigger>
          <TabsTrigger value="historial" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        {/* Tab: Inventario */}
        <TabsContent value="inventario" className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Inventario de Repuestos</CardTitle>
                  <CardDescription>
                    {filterStockBajo 
                      ? `${totalCount.toLocaleString()} items con stock bajo`
                      : debouncedSearch 
                        ? `${totalCount.toLocaleString()} resultados para "${debouncedSearch}"`
                        : `${stats.totalItems.toLocaleString()} repuestos en inventario`
                    }
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {filterStockBajo && (
                    <Badge 
                      variant="secondary" 
                      className="cursor-pointer"
                      onClick={() => setFilterStockBajo(false)}
                    >
                      Stock bajo ✕
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search & Filters */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por SKU, descripción o ubicación..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={filterCentroId} onValueChange={(value) => {
                  setFilterCentroId(value);
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-full sm:w-[220px]">
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
                <Button 
                  variant={filterStockBajo ? "default" : "outline"}
                  onClick={() => setFilterStockBajo(!filterStockBajo)}
                  className={cn(filterStockBajo && "bg-orange-500 hover:bg-orange-600")}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Stock bajo
                </Button>
              </div>

              {/* Table */}
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-10">
                            <Checkbox 
                              checked={selectedItems.size === inventario.length && inventario.length > 0}
                              onCheckedChange={toggleSelectAll}
                            />
                          </TableHead>
                          <TableHead>Ubicación</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead className="hidden md:table-cell">Descripción</TableHead>
                          <TableHead className="hidden lg:table-cell">Centro</TableHead>
                          <TableHead className="text-right">Cantidad</TableHead>
                          <TableHead className="text-right hidden sm:table-cell">Costo</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inventario.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                              <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                              <p>
                                {debouncedSearch 
                                  ? `No se encontraron resultados para "${debouncedSearch}"`
                                  : filterStockBajo
                                    ? "No hay items con stock bajo 🎉"
                                    : "No hay datos de inventario"
                                }
                              </p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          inventario.map((item) => (
                            <TableRow 
                              key={item.id}
                              className="cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => handleItemClick(item)}
                            >
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <Checkbox 
                                  checked={selectedItems.has(item.id)}
                                  onCheckedChange={() => toggleSelectItem(item.id)}
                                />
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {item.ubicacion_legacy || "-"}
                              </TableCell>
                              <TableCell className="font-mono font-medium">
                                {item.codigo_repuesto}
                              </TableCell>
                              <TableCell className="hidden md:table-cell max-w-xs truncate">
                                {item.descripcion || "-"}
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                                <Badge variant="outline" className="font-normal">
                                  {item.centro_nombre}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <span className={cn(
                                  "font-semibold",
                                  item.cantidad === 0 && "text-destructive",
                                  item.cantidad <= 5 && item.cantidad > 0 && "text-orange-500"
                                )}>
                                  {item.cantidad}
                                </span>
                              </TableCell>
                              <TableCell className="text-right hidden sm:table-cell">
                                Q{(item.costo_unitario || 0).toFixed(2)}
                              </TableCell>
                              <TableCell>
                                {item.cantidad === 0 ? (
                                  <Badge variant="destructive" className="text-xs">Sin stock</Badge>
                                ) : item.cantidad <= 5 ? (
                                  <Badge className="bg-orange-500 text-white text-xs">Bajo</Badge>
                                ) : (
                                  <Badge className="bg-green-500 text-white text-xs">Normal</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleMovimiento(item)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Selection actions */}
                  {selectedItems.size > 0 && (
                    <div className="flex items-center gap-4 p-3 bg-muted rounded-lg mt-4">
                      <span className="text-sm font-medium">
                        {selectedItems.size} item{selectedItems.size !== 1 ? "s" : ""} seleccionado{selectedItems.size !== 1 ? "s" : ""}
                      </span>
                      <ExportDropdown 
                        data={inventario.filter(i => selectedItems.has(i.id))} 
                        columns={exportColumns}
                        filename="inventario_seleccion"
                      />
                      <Button variant="ghost" size="sm" onClick={() => setSelectedItems(new Set())}>
                        Deseleccionar
                      </Button>
                    </div>
                  )}

                  {totalCount > 0 && (
                    <TablePagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      totalItems={totalCount}
                      itemsPerPage={itemsPerPage}
                      onPageChange={setCurrentPage}
                      onItemsPerPageChange={(value) => {
                        setItemsPerPage(value);
                        setCurrentPage(1);
                      }}
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Gráficos */}
        <TabsContent value="graficos" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Stock por Centro */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Stock por Centro de Servicio</CardTitle>
                <CardDescription>Distribución de unidades por centro</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartPorCentro} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value: number) => [value.toLocaleString(), "Unidades"]}
                        contentStyle={{ borderRadius: "8px" }}
                      />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Estado del stock */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Estado del Stock</CardTitle>
                <CardDescription>Distribución por nivel de stock</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Normal", value: stats.totalItems - stats.stockBajo },
                          { name: "Stock Bajo", value: stats.stockBajo }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        <Cell fill="#22c55e" />
                        <Cell fill="#f97316" />
                      </Pie>
                      <Tooltip formatter={(value: number) => [value.toLocaleString(), "Items"]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Tendencia de movimientos */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Tendencia de Movimientos</CardTitle>
                <CardDescription>Últimos 7 días de entradas y salidas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartTendencia}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip contentStyle={{ borderRadius: "8px" }} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="entradas" 
                        stroke="#22c55e" 
                        strokeWidth={2}
                        dot={{ fill: "#22c55e" }}
                        name="Entradas"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="salidas" 
                        stroke="#ef4444" 
                        strokeWidth={2}
                        dot={{ fill: "#ef4444" }}
                        name="Salidas"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Historial */}
        <TabsContent value="historial" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Movimientos de Hoy
              </CardTitle>
              <CardDescription>
                {movimientosRecientes.length} movimiento{movimientosRecientes.length !== 1 ? "s" : ""} registrado{movimientosRecientes.length !== 1 ? "s" : ""} hoy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MovimientoTimeline 
                movimientos={movimientosRecientes}
                maxHeight="500px"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        open={showScanner}
        onOpenChange={setShowScanner}
        onScan={handleScan}
        title="Escanear Repuesto"
        description="Escanee el código de barras o ingrese el SKU manualmente"
      />

      {/* Detail Sheet */}
      <InventarioDetailSheet
        item={selectedItem}
        open={showDetailSheet}
        onOpenChange={setShowDetailSheet}
        onMovimiento={handleMovimiento}
      />

      {/* Movement Dialog */}
      <Dialog open={showMovimiento} onOpenChange={setShowMovimiento}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              Registrar Movimiento
            </DialogTitle>
            <DialogDescription>
              <span className="font-mono">{selectedItem?.codigo_repuesto}</span> - {selectedItem?.descripcion}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Tipo de Movimiento</Label>
              <Select value={tipoMovimiento} onValueChange={(v) => setTipoMovimiento(v as "entrada" | "salida")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Entrada
                    </div>
                  </SelectItem>
                  <SelectItem value="salida">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      Salida
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Cantidad</Label>
              <Input
                type="number"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                placeholder="0"
              />
            </div>

            <div>
              <Label>Motivo</Label>
              <Input
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: Reparación INC-000123"
              />
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Stock actual</span>
                <span className="font-bold">{selectedItem?.cantidad}</span>
              </div>
              {cantidad && (
                <div className="flex justify-between items-center mt-2 pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Nuevo stock</span>
                  <span className={cn(
                    "font-bold",
                    tipoMovimiento === "entrada" ? "text-green-600" : "text-red-600"
                  )}>
                    {tipoMovimiento === "entrada"
                      ? (selectedItem?.cantidad || 0) + parseInt(cantidad || "0")
                      : (selectedItem?.cantidad || 0) - parseInt(cantidad || "0")
                    }
                  </span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMovimiento(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarMovimiento}>
              Guardar Movimiento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
