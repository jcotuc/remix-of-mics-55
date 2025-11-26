import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Package, TrendingDown, AlertTriangle, Clock, FileText, Box } from "lucide-react";

interface DashboardStats {
  solicitudesPendientes: number;
  despachosHoy: number;
  ingresosPendientes: number;
  importacionesPendientes: number;
  stockCritico: number;
  sinMovimiento90: number;
  tiempoPromedioDespacho: number;
  tasaCumplimiento: number;
}

export default function DashboardJefeBodega() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Solicitudes pendientes
      const { data: solicitudes } = await supabase
        .from('solicitudes_repuestos')
        .select('*')
        .in('estado', ['pendiente', 'asignado']);

      // Despachos de hoy
      const hoy = new Date().toISOString().split('T')[0];
      const { data: despachosHoy } = await supabase
        .from('movimientos_inventario')
        .select('*')
        .eq('tipo_movimiento', 'salida')
        .gte('created_at', hoy);

      // Ingresos pendientes de ubicar
      const { data: importaciones } = await supabase
        .from('importaciones')
        .select('*')
        .eq('estado', 'pendiente');

      const { data: detalleImportaciones } = await supabase
        .from('importaciones_detalle')
        .select('*')
        .eq('procesado', false);

      // Stock crítico
      const { data: stockDept } = await supabase
        .from('stock_departamental')
        .select('*');

      const stockCritico = stockDept?.filter(s =>
        s.stock_minimo && s.cantidad_actual < s.stock_minimo
      ).length || 0;

      // Sin movimiento mayor a 90 días
      const fecha90Dias = new Date();
      fecha90Dias.setDate(fecha90Dias.getDate() - 90);
      
      const { data: movimientos } = await supabase
        .from('movimientos_inventario')
        .select('codigo_repuesto')
        .gte('created_at', fecha90Dias.toISOString());

      const repuestosConMovimiento = new Set(movimientos?.map(m => m.codigo_repuesto));
      const { data: todosRepuestos } = await supabase
        .from('repuestos')
        .select('codigo');

      const sinMovimiento = todosRepuestos?.filter(r =>
        !repuestosConMovimiento.has(r.codigo)
      ).length || 0;

      // Tasa de cumplimiento
      const { data: solicitudesEntregadas } = await supabase
        .from('solicitudes_repuestos')
        .select('*')
        .eq('estado', 'entregado');

      const { data: todasSolicitudes } = await supabase
        .from('solicitudes_repuestos')
        .select('*');

      const tasaCumplimiento = todasSolicitudes && todasSolicitudes.length > 0
        ? ((solicitudesEntregadas?.length || 0) / todasSolicitudes.length) * 100
        : 0;

      setStats({
        solicitudesPendientes: solicitudes?.length || 0,
        despachosHoy: despachosHoy?.length || 0,
        ingresosPendientes: detalleImportaciones?.length || 0,
        importacionesPendientes: importaciones?.length || 0,
        stockCritico,
        sinMovimiento90: sinMovimiento,
        tiempoPromedioDespacho: 0, // Cálculo simplificado
        tasaCumplimiento: Math.round(tasaCumplimiento)
      });

    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Dashboard Jefe de Bodega</h1>

      {/* KPIs Operaciones Diarias */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Solicitudes Pendientes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.solicitudesPendientes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Despachos Hoy</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.despachosHoy}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Pendientes</CardTitle>
            <Box className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ingresosPendientes}</div>
            <p className="text-xs text-muted-foreground">Items sin ubicar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Importaciones</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.importacionesPendientes}</div>
            <p className="text-xs text-muted-foreground">Por procesar</p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas de Inventario */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Stock Crítico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.stockCritico}</div>
            <p className="text-sm text-muted-foreground mt-2">Items por debajo del mínimo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-orange-500" />
              Sin Movimiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.sinMovimiento90}</div>
            <p className="text-sm text-muted-foreground mt-2">Items sin movimiento &gt; 90 días</p>
          </CardContent>
        </Card>
      </div>

      {/* Métricas de Eficiencia */}
      <Card>
        <CardHeader>
          <CardTitle>Tasa de Cumplimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.tasaCumplimiento}%</div>
          <p className="text-sm text-muted-foreground mt-2">Solicitudes entregadas exitosamente</p>
        </CardContent>
      </Card>
    </div>
  );
}
