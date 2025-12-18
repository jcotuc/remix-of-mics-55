import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";

interface EstadisticasEquivalencias {
  sinStockConAlternativas: number;
  conHermanosDisponibles: number;
  sustitucionesHoy: number;
}

export function EquivalenciasWidget() {
  const [stats, setStats] = useState<EstadisticasEquivalencias>({
    sinStockConAlternativas: 0,
    conHermanosDisponibles: 0,
    sustitucionesHoy: 0
  });

  useEffect(() => {
    cargarEstadisticas();
  }, []);

  const cargarEstadisticas = async () => {
    // Obtener ID del centro de servicio Zona 5
    const { data: centroData } = await supabase
      .from('centros_servicio')
      .select('id')
      .ilike('nombre', '%zona 5%')
      .maybeSingle();

    if (!centroData) return;

    // 1. Repuestos sin stock pero con padre que sí tiene stock
    const { data: repuestosConPadre } = await supabase
      .from('repuestos')
      .select('codigo, codigo_padre')
      .not('codigo_padre', 'is', null);

    let conPadreDisponible = 0;
    if (repuestosConPadre) {
      for (const repuesto of repuestosConPadre.slice(0, 50)) {
        // Verificar stock del código actual
        const { data: stockActual } = await supabase
          .from('stock_departamental')
          .select('cantidad_actual')
          .eq('codigo_repuesto', repuesto.codigo)
          .eq('centro_servicio_id', centroData.id)
          .maybeSingle();

        if (!stockActual || stockActual.cantidad_actual <= 0) {
          // Verificar stock del padre
          const { data: padreStock } = await supabase
            .from('stock_departamental')
            .select('cantidad_actual')
            .eq('codigo_repuesto', repuesto.codigo_padre!)
            .eq('centro_servicio_id', centroData.id)
            .maybeSingle();

          if (padreStock && padreStock.cantidad_actual > 0) {
            conPadreDisponible++;
          }
        }
      }
    }

    // 2. Contar familias con hermanos disponibles
    const padresUnicos = repuestosConPadre 
      ? [...new Set(repuestosConPadre.map(r => r.codigo_padre).filter(Boolean))]
      : [];

    let conHermanosDisp = 0;
    for (const padre of padresUnicos.slice(0, 30)) {
      const { data: stockPadre } = await supabase
        .from('stock_departamental')
        .select('cantidad_actual')
        .eq('codigo_repuesto', padre!)
        .eq('centro_servicio_id', centroData.id)
        .maybeSingle();

      if (stockPadre && stockPadre.cantidad_actual > 0) {
        conHermanosDisp++;
      }
    }

    // 3. Sustituciones de hoy (buscar en movimientos_inventario)
    const hoy = new Date().toISOString().split('T')[0];
    const { data: movimientos } = await supabase
      .from('movimientos_inventario')
      .select('motivo')
      .gte('created_at', `${hoy}T00:00:00`)
      .ilike('motivo', '%solicitado%');

    setStats({
      sinStockConAlternativas: conPadreDisponible,
      conHermanosDisponibles: conHermanosDisp,
      sustitucionesHoy: movimientos?.length || 0
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Repuestos con Alternativas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <span className="text-sm">Sin stock con padre disponible</span>
          </div>
          <Badge variant="outline" className="text-lg">
            {stats.sinStockConAlternativas}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm">Con hermanos disponibles</span>
          </div>
          <Badge variant="outline" className="text-lg">
            {stats.conHermanosDisponibles}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <span className="text-sm">Sustituciones hoy</span>
          </div>
          <Badge variant="outline" className="text-lg">
            {stats.sustitucionesHoy}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
