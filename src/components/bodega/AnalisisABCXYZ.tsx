import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Search, Download, AlertTriangle, Package, TrendingUp, TrendingDown, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";


interface AnalisisItem {
  id: string;
  codigo_repuesto: string;
  stock_actual: number;
  dias_en_inventario: number;
  dias_sin_movimiento: number;
  total_movimientos: number;
  total_salidas: number;
  clasificacion_abc: string | null;
  clasificacion_xyz: string | null;
  valor_inventario: number;
  costo_unitario: number;
  meses_con_movimiento: number;
  primera_entrada: string | null;
  ultimo_movimiento: string | null;
}

interface CentroServicio {
  id: string;
  nombre: string;
  es_central: boolean;
}

const ITEMS_PER_PAGE = 20;

const AnalisisABCXYZ = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<AnalisisItem[]>([]);
  const [centros, setCentros] = useState<CentroServicio[]>([]);
  const [selectedCentro, setSelectedCentro] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterABC, setFilterABC] = useState<string>("all");
  const [filterXYZ, setFilterXYZ] = useState<string>("all");
  const [filterDias, setFilterDias] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchCentros();
  }, []);

  useEffect(() => {
    if (selectedCentro) {
      fetchAnalisis();
    }
  }, [selectedCentro]);

  const fetchCentros = async () => {
    try {
      const { data, error } = await supabase
        .from("centros_servicio")
        .select("id, nombre, es_central")
        .eq("activo", true)
        .order("nombre");
      
      if (error) throw error;
      setCentros(data || []);
      
      // Seleccionar Zona 5 por defecto
      const zona5 = data?.find(c => c.nombre.toLowerCase().includes("zona 5") || c.es_central);
      if (zona5) {
        setSelectedCentro(zona5.id);
      } else if (data && data.length > 0) {
        setSelectedCentro(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching centros:", error);
      toast.error("Error al cargar los centros");
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalisis = async () => {
    if (!selectedCentro) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("analisis_inventario")
        .select("*")
        .eq("centro_servicio_id", selectedCentro)
        .order("total_movimientos", { ascending: false });
      
      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error("Error fetching analisis:", error);
      toast.error("Error al cargar el análisis");
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshAnalisis = async () => {
    if (!selectedCentro) return;
    
    setRefreshing(true);
    try {
      const { error } = await supabase.rpc("calcular_analisis_inventario", {
        p_centro_servicio_id: selectedCentro
      });
      
      if (error) throw error;
      
      toast.success("Análisis actualizado correctamente");
      await fetchAnalisis();
    } catch (error) {
      console.error("Error refreshing analisis:", error);
      const message = (error as any)?.message ? String((error as any).message) : "Error desconocido";
      toast.error(`Error al actualizar el análisis: ${message}`);
    } finally {
      setRefreshing(false);
    }
  };

  const handleExport = () => {
    const dataToExport = filteredItems.map(item => ({
      "Código": item.codigo_repuesto,
      "Stock Actual": item.stock_actual,
      "Costo Unitario": item.costo_unitario,
      "Valor Inventario": item.valor_inventario,
      "Días en Inventario": item.dias_en_inventario,
      "Días sin Movimiento": item.dias_sin_movimiento,
      "Total Movimientos": item.total_movimientos,
      "Total Salidas": item.total_salidas,
      "Meses con Mov.": item.meses_con_movimiento,
      "Clasificación ABC": item.clasificacion_abc || "-",
      "Clasificación XYZ": item.clasificacion_xyz || "-"
    }));
    
    // CSV export
    const headers = Object.keys(dataToExport[0] || {}).join(",");
    const rows = dataToExport.map(row => Object.values(row).join(",")).join("\n");
    const csv = `${headers}\n${rows}`;
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analisis-abc-xyz-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    
    toast.success("Exportación completada");
  };

  // Filtrar items
  const filteredItems = items.filter(item => {
    const matchesSearch = item.codigo_repuesto.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesABC = filterABC === "all" || item.clasificacion_abc === filterABC;
    const matchesXYZ = filterXYZ === "all" || item.clasificacion_xyz === filterXYZ;
    
    let matchesDias = true;
    if (filterDias === "30") matchesDias = item.dias_sin_movimiento <= 30;
    else if (filterDias === "30-90") matchesDias = item.dias_sin_movimiento > 30 && item.dias_sin_movimiento <= 90;
    else if (filterDias === "90+") matchesDias = item.dias_sin_movimiento > 90;
    
    return matchesSearch && matchesABC && matchesXYZ && matchesDias;
  });

  // Paginación
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Estadísticas para gráficos
  const statsABC = {
    A: items.filter(i => i.clasificacion_abc === "A").length,
    B: items.filter(i => i.clasificacion_abc === "B").length,
    C: items.filter(i => i.clasificacion_abc === "C").length,
  };

  const statsXYZ = {
    X: items.filter(i => i.clasificacion_xyz === "X").length,
    Y: items.filter(i => i.clasificacion_xyz === "Y").length,
    Z: items.filter(i => i.clasificacion_xyz === "Z").length,
  };

  const valorPorClasificacion = {
    A: items.filter(i => i.clasificacion_abc === "A").reduce((acc, i) => acc + Number(i.valor_inventario), 0),
    B: items.filter(i => i.clasificacion_abc === "B").reduce((acc, i) => acc + Number(i.valor_inventario), 0),
    C: items.filter(i => i.clasificacion_abc === "C").reduce((acc, i) => acc + Number(i.valor_inventario), 0),
  };

  const codigosSinMovimiento90 = items.filter(i => i.dias_sin_movimiento > 90).length;

  const pieDataABC = [
    { name: "A", value: statsABC.A, color: "#22c55e" },
    { name: "B", value: statsABC.B, color: "#eab308" },
    { name: "C", value: statsABC.C, color: "#ef4444" },
  ];

  const pieDataXYZ = [
    { name: "X", value: statsXYZ.X, color: "#3b82f6" },
    { name: "Y", value: statsXYZ.Y, color: "#8b5cf6" },
    { name: "Z", value: statsXYZ.Z, color: "#f97316" },
  ];

  const barData = [
    { name: "A", valor: valorPorClasificacion.A },
    { name: "B", valor: valorPorClasificacion.B },
    { name: "C", valor: valorPorClasificacion.C },
  ];

  const getABCBadge = (abc: string | null) => {
    if (!abc) return <Badge variant="outline">-</Badge>;
    const colors: Record<string, string> = {
      A: "bg-green-500/20 text-green-700 border-green-500/50",
      B: "bg-yellow-500/20 text-yellow-700 border-yellow-500/50",
      C: "bg-red-500/20 text-red-700 border-red-500/50",
    };
    return <Badge className={colors[abc]}>{abc}</Badge>;
  };

  const getXYZBadge = (xyz: string | null) => {
    if (!xyz) return <Badge variant="outline">-</Badge>;
    const colors: Record<string, string> = {
      X: "bg-blue-500/20 text-blue-700 border-blue-500/50",
      Y: "bg-purple-500/20 text-purple-700 border-purple-500/50",
      Z: "bg-orange-500/20 text-orange-700 border-orange-500/50",
    };
    return <Badge className={colors[xyz]}>{xyz}</Badge>;
  };

  const getDiasBadge = (dias: number) => {
    if (dias <= 30) return <Badge className="bg-green-500/20 text-green-700">{dias} días</Badge>;
    if (dias <= 90) return <Badge className="bg-yellow-500/20 text-yellow-700">{dias} días</Badge>;
    return <Badge className="bg-red-500/20 text-red-700">{dias} días</Badge>;
  };

  if (loading && !items.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con selector y acciones */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <Select value={selectedCentro} onValueChange={setSelectedCentro}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Seleccionar centro" />
            </SelectTrigger>
            <SelectContent>
              {centros.map(centro => (
                <SelectItem key={centro.id} value={centro.id}>
                  {centro.nombre} {centro.es_central && "(Central)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefreshAnalisis}
            disabled={refreshing || !selectedCentro}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Recalcular
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={filteredItems.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* KPIs y Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Total SKUs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{items.length}</p>
            <p className="text-xs text-muted-foreground">Códigos analizados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Clase A (Alto mov.)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{statsABC.A}</p>
            <p className="text-xs text-muted-foreground">
              Q{valorPorClasificacion.A.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Clase C (Bajo mov.)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{statsABC.C}</p>
            <p className="text-xs text-muted-foreground">
              Q{valorPorClasificacion.C.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Sin mov. +90 días
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{codigosSinMovimiento90}</p>
            <p className="text-xs text-muted-foreground">Códigos estancados</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Distribución ABC</CardTitle>
          </CardHeader>
          <CardContent className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieDataABC}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {pieDataABC.map((entry, index) => (
                    <Cell key={`cell-abc-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Distribución XYZ</CardTitle>
          </CardHeader>
          <CardContent className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieDataXYZ}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {pieDataXYZ.map((entry, index) => (
                    <Cell key={`cell-xyz-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Valor por Clasificación ABC</CardTitle>
          </CardHeader>
          <CardContent className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `Q${(value / 1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value: number) => [`Q${value.toLocaleString("es-GT", { minimumFractionDigits: 2 })}`, "Valor"]}
                />
                <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar código..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
              />
            </div>
            
            <Select value={filterABC} onValueChange={(v) => { setFilterABC(v); setCurrentPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Clase ABC" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas ABC</SelectItem>
                <SelectItem value="A">Clase A</SelectItem>
                <SelectItem value="B">Clase B</SelectItem>
                <SelectItem value="C">Clase C</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterXYZ} onValueChange={(v) => { setFilterXYZ(v); setCurrentPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Clase XYZ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas XYZ</SelectItem>
                <SelectItem value="X">Clase X</SelectItem>
                <SelectItem value="Y">Clase Y</SelectItem>
                <SelectItem value="Z">Clase Z</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterDias} onValueChange={(v) => { setFilterDias(v); setCurrentPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Días sin mov." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los días</SelectItem>
                <SelectItem value="30">≤ 30 días</SelectItem>
                <SelectItem value="30-90">30-90 días</SelectItem>
                <SelectItem value="90+">+90 días</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Costo Unit.</TableHead>
                  <TableHead className="text-right">Valor Inv.</TableHead>
                  <TableHead className="text-center">Días Inv.</TableHead>
                  <TableHead className="text-center">Sin Mov.</TableHead>
                  <TableHead className="text-right">Movimientos</TableHead>
                  <TableHead className="text-right">Salidas</TableHead>
                  <TableHead className="text-center">ABC</TableHead>
                  <TableHead className="text-center">XYZ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      {items.length === 0 
                        ? "No hay datos de análisis. Haz clic en 'Recalcular' para generar."
                        : "No se encontraron resultados con los filtros aplicados."}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">{item.codigo_repuesto}</TableCell>
                      <TableCell className="text-right">{item.stock_actual}</TableCell>
                      <TableCell className="text-right">
                        Q{Number(item.costo_unitario).toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        Q{Number(item.valor_inventario).toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center">{item.dias_en_inventario}</TableCell>
                      <TableCell className="text-center">
                        {getDiasBadge(item.dias_sin_movimiento)}
                      </TableCell>
                      <TableCell className="text-right">{item.total_movimientos}</TableCell>
                      <TableCell className="text-right">{item.total_salidas}</TableCell>
                      <TableCell className="text-center">{getABCBadge(item.clasificacion_abc)}</TableCell>
                      <TableCell className="text-center">{getXYZBadge(item.clasificacion_xyz)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {totalPages > 1 && (
            <div className="border-t p-4 flex justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Anterior</Button>
              <span className="text-sm py-2">Página {currentPage} de {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Siguiente</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalisisABCXYZ;
