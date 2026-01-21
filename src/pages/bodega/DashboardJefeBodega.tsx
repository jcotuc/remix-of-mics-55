import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Package, TrendingDown, AlertTriangle, Clock, FileText, Box } from "lucide-react";
import { apiBackendAction } from "@/lib/api";

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

      // Solicitudes pendientes via registry
      const solicitudesRes = await apiBackendAction("solicitudes_repuestos.list", {});
      const solicitudes = ((solicitudesRes as any).results || []).filter(
        (s: any) => s.estado === "pendiente" || s.estado === "asignado"
      );

      // Inventario via registry
      const inventarioRes = await apiBackendAction("inventarios.list", {});
      const inventarioData = (inventarioRes as any).results || [];
      
      // Stock crítico - items con menos de 5 unidades
      const stockCritico = inventarioData.filter((s: any) => s.cantidad < 5).length;

      // Repuestos via registry
      const repuestosRes = await apiBackendAction("repuestos.list", {});
      const todosRepuestos = (repuestosRes as any).results || [];

      // Movimientos via registry
      const movimientosRes = await apiBackendAction("movimientos_inventario.list", {});
      const allMovimientos = (movimientosRes as any).results || [];
      
      // Despachos de hoy
      const hoy = new Date().toISOString().split('T')[0];
      const despachosHoy = allMovimientos.filter(
        (m: any) => m.tipo_movimiento === "SALIDA" && m.created_at?.startsWith(hoy)
      );

      // Sin movimiento mayor a 90 días
      const fecha90Dias = new Date();
      fecha90Dias.setDate(fecha90Dias.getDate() - 90);
      const movimientosRecientes = allMovimientos.filter(
        (m: any) => new Date(m.created_at) >= fecha90Dias
      );
      const repuestosConMovimiento = new Set(movimientosRecientes.map((m: any) => m.repuesto_id));
      const sinMovimiento = todosRepuestos.filter(
        (r: any) => !repuestosConMovimiento.has(r.id)
      ).length;

      // Tasa de cumplimiento
      const solicitudesEntregadas = ((solicitudesRes as any).results || []).filter(
        (s: any) => s.estado === "entregado"
      );
      const todasSolicitudes = (solicitudesRes as any).results || [];
      const tasaCumplimiento = todasSolicitudes.length > 0
        ? (solicitudesEntregadas.length / todasSolicitudes.length) * 100
        : 0;

      setStats({
        solicitudesPendientes: solicitudes.length,
        despachosHoy: despachosHoy.length,
        ingresosPendientes: 0, // Requires importaciones tables
        importacionesPendientes: 0, // Requires importaciones tables
        stockCritico,
        sinMovimiento90: sinMovimiento,
        tiempoPromedioDespacho: 0,
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
