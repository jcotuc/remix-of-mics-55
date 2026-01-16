import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, MapPin, Package, Layers, LayoutGrid, Plus, Eye, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TablePagination } from "@/components/TablePagination";

interface Bodega {
  id: number;
  cds_id: string;
  nombre: string | null;
  codigo: string | null;
}

interface UbicacionConStats {
  id: number;
  codigo: string | null;
  pasillo: string | null;
  rack: string | null;
  nivel: string | null;
  caja: string | null;
  bodega_id: string | null;
  bodega?: { nombre: string | null; codigo: string | null } | null;
  items_count: number;
  total_stock: number;
  valor_total: number;
}

interface InventarioItem {
  codigo_repuesto: string;
  descripcion: string | null;
  cantidad: number;
  costo_unitario: number | null;
}

interface CentroServicio {
  id: string;
  nombre: string;
}

export default function GestionUbicaciones() {
  const [ubicaciones, setUbicaciones] = useState<UbicacionConStats[]>([]);
  const [topUbicaciones, setTopUbicaciones] = useState<UbicacionConStats[]>([]);
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [centrosServicio, setCentrosServicio] = useState<CentroServicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCentro, setSelectedCentro] = useState<string>("all");
  const [selectedBodega, setSelectedBodega] = useState<string>("all");
  const [kpis, setKpis] = useState({ totalUbicaciones: 0, totalItems: 0, promedioSKU: 0, ubicacionesVacias: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 15;

  const [selectedUbicacion, setSelectedUbicacion] = useState<UbicacionConStats | null>(null);
  const [contenidoUbicacion, setContenidoUbicacion] = useState<InventarioItem[]>([]);
  const [loadingContenido, setLoadingContenido] = useState(false);

  const [nuevaUbicacion, setNuevaUbicacion] = useState({ bodega_id: "", pasillo: "", rack: "", nivel: "", caja: "" });
  const [creando, setCreando] = useState(false);

  useEffect(() => { fetchCentrosServicio(); fetchBodegas(); }, []);
  useEffect(() => { fetchBodegas(); }, [selectedCentro]);
  useEffect(() => { fetchUbicacionesConStats(); }, [searchTerm, selectedBodega, currentPage]);
  useEffect(() => { fetchKPIs(); fetchTopUbicaciones(); }, [selectedBodega]);

  const fetchCentrosServicio = async () => {
    const { data } = await supabase.from('centros_servicio').select('id, nombre').eq('activo', true).order('nombre');
    if (data) setCentrosServicio(data);
  };

  const fetchBodegas = async () => {
    let query = supabase.from('Bodegas_CDS').select('id, cds_id, nombre, codigo, centro_servicio_id').eq('activo', true);
    if (selectedCentro !== "all") {
      query = query.eq('centro_servicio_id', selectedCentro);
    }
    const { data } = await query.order('nombre');
    if (data) setBodegas(data);
    // Reset bodega selection when centro changes
    if (selectedCentro !== "all" && selectedBodega !== "all") {
      const bodegaExists = data?.some(b => b.cds_id === selectedBodega);
      if (!bodegaExists) setSelectedBodega("all");
    }
  };

  const fetchKPIs = async () => {
    let query = supabase.from('Ubicación_CDS').select('id', { count: 'exact', head: true });
    if (selectedBodega !== "all") query = query.eq('bodega_id', selectedBodega);
    const { count: totalUbicaciones } = await query;
    const { data: inventarioData } = await supabase.from('inventario').select('cantidad, ubicacion_id');
    const ubicacionesConItems = new Set(inventarioData?.map(i => i.ubicacion_id).filter(Boolean) || []);
    const totalItems = inventarioData?.reduce((sum, i) => sum + i.cantidad, 0) || 0;
    setKpis({
      totalUbicaciones: totalUbicaciones || 0,
      totalItems,
      promedioSKU: ubicacionesConItems.size > 0 ? Math.round((inventarioData?.length || 0) / ubicacionesConItems.size) : 0,
      ubicacionesVacias: Math.max(0, (totalUbicaciones || 0) - ubicacionesConItems.size)
    });
  };

  const fetchTopUbicaciones = async () => {
    const { data: inventarioData } = await supabase.from('inventario').select('ubicacion_id, cantidad, costo_unitario');
    const statsMap = new Map<number, { count: number; stock: number; valor: number }>();
    inventarioData?.forEach(item => {
      if (item.ubicacion_id) {
        const c = statsMap.get(item.ubicacion_id) || { count: 0, stock: 0, valor: 0 };
        statsMap.set(item.ubicacion_id, { count: c.count + 1, stock: c.stock + item.cantidad, valor: c.valor + (item.cantidad * (item.costo_unitario || 0)) });
      }
    });
    const topIds = Array.from(statsMap.entries()).sort((a, b) => b[1].count - a[1].count).slice(0, 10).map(([id]) => id);
    if (topIds.length === 0) { setTopUbicaciones([]); return; }
    const { data: ubicacionesData } = await supabase.from('Ubicación_CDS').select('*, bodega:Bodegas_CDS(nombre, codigo)').in('id', topIds);
    const result: UbicacionConStats[] = (ubicacionesData || []).map(ub => {
      const stats = statsMap.get(ub.id) || { count: 0, stock: 0, valor: 0 };
      return {
        id: ub.id,
        codigo: ub.codigo,
        pasillo: ub.pasillo,
        rack: ub.rack,
        nivel: ub.nivel,
        caja: ub.caja,
        bodega_id: ub.bodega_id,
        bodega: ub.bodega,
        items_count: stats.count,
        total_stock: stats.stock,
        valor_total: stats.valor
      };
    }).sort((a, b) => b.items_count - a.items_count);
    setTopUbicaciones(result);
  };

  const fetchUbicacionesConStats = async () => {
    setLoading(true);
    const { data: inventarioData } = await supabase.from('inventario').select('ubicacion_id, cantidad, costo_unitario');
    const statsMap = new Map<number, { count: number; stock: number; valor: number }>();
    inventarioData?.forEach(item => {
      if (item.ubicacion_id) {
        const c = statsMap.get(item.ubicacion_id) || { count: 0, stock: 0, valor: 0 };
        statsMap.set(item.ubicacion_id, { count: c.count + 1, stock: c.stock + item.cantidad, valor: c.valor + (item.cantidad * (item.costo_unitario || 0)) });
      }
    });
    let query = supabase.from('Ubicación_CDS').select('*, bodega:Bodegas_CDS(nombre, codigo)', { count: 'exact' });
    if (selectedBodega !== "all") query = query.eq('bodega_id', selectedBodega);
    if (searchTerm) query = query.ilike('codigo', `%${searchTerm}%`);
    const from = (currentPage - 1) * pageSize;
    const { data, count, error } = await query.order('codigo').range(from, from + pageSize - 1);
    if (error) { toast.error("Error al cargar ubicaciones"); setLoading(false); return; }
    const result: UbicacionConStats[] = (data || []).map(ub => {
      const stats = statsMap.get(ub.id) || { count: 0, stock: 0, valor: 0 };
      return {
        id: ub.id,
        codigo: ub.codigo,
        pasillo: ub.pasillo,
        rack: ub.rack,
        nivel: ub.nivel,
        caja: ub.caja,
        bodega_id: ub.bodega_id,
        bodega: ub.bodega,
        items_count: stats.count,
        total_stock: stats.stock,
        valor_total: stats.valor
      };
    });
    setUbicaciones(result);
    setTotalCount(count || 0);
    setLoading(false);
  };

  const fetchContenidoUbicacion = async (ubicacion: UbicacionConStats) => {
    setSelectedUbicacion(ubicacion);
    setLoadingContenido(true);
    const { data } = await supabase.from('inventario').select('codigo_repuesto, descripcion, cantidad, costo_unitario').eq('ubicacion_id', ubicacion.id).order('descripcion');
    setContenidoUbicacion(data || []);
    setLoadingContenido(false);
  };

  const getPreviewCode = () => {
    const { pasillo, rack, nivel, caja } = nuevaUbicacion;
    if (!pasillo) return "---";
    let code = pasillo.toUpperCase();
    if (rack) code += `.${rack.padStart(3, '0')}`;
    if (nivel) code += `.${nivel.padStart(2, '0')}`;
    if (caja) code += `.${caja}`;
    return code;
  };

  const handleCrearUbicacion = async () => {
    const { bodega_id, pasillo, rack, nivel, caja } = nuevaUbicacion;
    if (!bodega_id || !pasillo || !rack || !nivel) { toast.error("Complete bodega, pasillo, rack y nivel"); return; }
    const codigo = getPreviewCode();
    setCreando(true);
    const { data: existente } = await supabase.from('Ubicación_CDS').select('id').eq('codigo', codigo).eq('bodega_id', bodega_id).maybeSingle();
    if (existente) { toast.error("Ya existe esta ubicación"); setCreando(false); return; }
    const { error } = await supabase.from('Ubicación_CDS').insert({ bodega_id, codigo, pasillo: pasillo.toUpperCase(), rack, nivel, caja: caja || null });
    if (error) toast.error("Error al crear"); else { toast.success(`Ubicación ${codigo} creada`); setNuevaUbicacion({ bodega_id: "", pasillo: "", rack: "", nivel: "", caja: "" }); fetchUbicacionesConStats(); fetchKPIs(); }
    setCreando(false);
  };

  const getDensityColor = (c: number) => c > 100 ? "bg-blue-600" : c > 50 ? "bg-blue-500" : c > 10 ? "bg-blue-400" : c > 0 ? "bg-slate-400" : "bg-red-400";

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <MapPin className="h-7 w-7 text-primary" />
          Gestión de Ubicaciones
        </h1>
        <p className="text-muted-foreground">Administración de ubicaciones en bodegas</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{kpis.totalUbicaciones.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Ubicaciones</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{kpis.totalItems.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Unidades</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{kpis.promedioSKU}</p>
                <p className="text-xs text-muted-foreground">SKU promedio</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{kpis.ubicacionesVacias}</p>
                <p className="text-xs text-muted-foreground">Vacías</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por código..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-10"
              />
            </div>
            <Select value={selectedCentro} onValueChange={(v) => { setSelectedCentro(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-full md:w-[220px]">
                <SelectValue placeholder="Centro de Servicio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los centros</SelectItem>
                {centrosServicio.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedBodega} onValueChange={(v) => { setSelectedBodega(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Bodega" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las bodegas</SelectItem>
                {bodegas.map(b => (
                  <SelectItem key={b.id} value={b.cds_id}>{b.nombre || b.codigo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Layout de 3 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna 1: Top ubicaciones */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-500" />
                Top Ubicaciones
              </CardTitle>
              <CardDescription>Por cantidad de SKUs</CardDescription>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              {topUbicaciones.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
              ) : (
                topUbicaciones.map((ub, idx) => (
                  <Card 
                    key={ub.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden" 
                    onClick={() => fetchContenidoUbicacion(ub)}
                  >
                    <div className={`h-1.5 ${getDensityColor(ub.items_count)}`} />
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-mono font-bold text-sm">{ub.codigo}</p>
                          <p className="text-xs text-muted-foreground mt-1">{ub.bodega?.nombre || 'Sin bodega'}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs">#{idx + 1}</Badge>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">{ub.items_count} SKUs</Badge>
                        <Badge variant="outline" className="text-xs">{ub.total_stock.toLocaleString()} u</Badge>
                      </div>
                      <div className="flex justify-end mt-2">
                        <span className="text-xs text-primary flex items-center gap-1">
                          <Eye className="h-3 w-3" /> Ver
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Columna 2: Tabla de todas las ubicaciones */}
        <div className="lg:col-span-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-primary" />
                Todas las Ubicaciones
              </CardTitle>
              <CardDescription>{totalCount.toLocaleString()} ubicaciones</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Bodega</TableHead>
                      <TableHead className="text-center">SKUs</TableHead>
                      <TableHead className="text-center">Stock</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">Cargando...</TableCell>
                      </TableRow>
                    ) : ubicaciones.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No se encontraron</TableCell>
                      </TableRow>
                    ) : (
                      ubicaciones.map(ub => (
                        <TableRow key={ub.id}>
                          <TableCell className="font-mono font-medium">{ub.codigo}</TableCell>
                          <TableCell className="text-sm">{ub.bodega?.nombre || '-'}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={ub.items_count > 0 ? "default" : "secondary"}>{ub.items_count}</Badge>
                          </TableCell>
                          <TableCell className="text-center">{ub.total_stock.toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => fetchContenidoUbicacion(ub)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
              <div className="p-4 border-t">
                <TablePagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(totalCount / pageSize)}
                  totalItems={totalCount}
                  itemsPerPage={pageSize}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={() => {}}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Columna 3: Formulario de creación */}
        <div className="lg:col-span-3">
          <Card className="sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-5 w-5 text-green-500" />
                Nueva Ubicación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Bodega *</Label>
                <Select value={nuevaUbicacion.bodega_id} onValueChange={(v) => setNuevaUbicacion(p => ({ ...p, bodega_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {bodegas.map(b => (
                      <SelectItem key={b.id} value={b.cds_id}>{b.nombre || b.codigo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Pasillo *</Label>
                  <Input placeholder="A01" value={nuevaUbicacion.pasillo} onChange={(e) => setNuevaUbicacion(p => ({ ...p, pasillo: e.target.value }))} maxLength={5} />
                </div>
                <div className="space-y-2">
                  <Label>Rack *</Label>
                  <Input placeholder="001" value={nuevaUbicacion.rack} onChange={(e) => setNuevaUbicacion(p => ({ ...p, rack: e.target.value }))} maxLength={3} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Nivel *</Label>
                  <Input placeholder="01" value={nuevaUbicacion.nivel} onChange={(e) => setNuevaUbicacion(p => ({ ...p, nivel: e.target.value }))} maxLength={2} />
                </div>
                <div className="space-y-2">
                  <Label>Caja</Label>
                  <Input placeholder="A" value={nuevaUbicacion.caja} onChange={(e) => setNuevaUbicacion(p => ({ ...p, caja: e.target.value }))} maxLength={3} />
                </div>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Vista previa</p>
                <p className="font-mono font-bold text-lg">{getPreviewCode()}</p>
              </div>
              <Button className="w-full" onClick={handleCrearUbicacion} disabled={creando}>
                <Plus className="h-4 w-4 mr-2" />
                {creando ? "Creando..." : "Crear Ubicación"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog de contenido */}
      <Dialog open={!!selectedUbicacion} onOpenChange={() => setSelectedUbicacion(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Contenido de {selectedUbicacion?.codigo}
            </DialogTitle>
            <DialogDescription>{selectedUbicacion?.bodega?.nombre || 'Sin bodega'}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-primary">{selectedUbicacion?.items_count || 0}</p>
                <p className="text-xs text-muted-foreground">SKUs</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-blue-500">{selectedUbicacion?.total_stock.toLocaleString() || 0}</p>
                <p className="text-xs text-muted-foreground">Unidades</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-green-500">
                  Q{(selectedUbicacion?.valor_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground">Valor</p>
              </CardContent>
            </Card>
          </div>
          <ScrollArea className="h-[300px] border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingContenido ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8">Cargando...</TableCell>
                  </TableRow>
                ) : contenidoUbicacion.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Ubicación vacía</TableCell>
                  </TableRow>
                ) : (
                  contenidoUbicacion.map(item => (
                    <TableRow key={item.codigo_repuesto}>
                      <TableCell className="font-mono">{item.codigo_repuesto}</TableCell>
                      <TableCell className="text-sm">{item.descripcion || '-'}</TableCell>
                      <TableCell className="text-right font-medium">{item.cantidad}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
