import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PackageSearch, AlertCircle, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

type PendienteReubicacion = {
  centro_servicio: string;
  cantidad_repuestos: number;
  mas_antiguos: number; // Repuestos con más de 24 horas
};

export const PuertaEntradaWidget = () => {
  const [pendientes, setPendientes] = useState<PendienteReubicacion[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPendientes();
  }, []);

  const fetchPendientes = async () => {
    try {
      const { data: stockData, error } = await supabase
        .from("stock_departamental")
        .select(`
          centro_servicio_id,
          fecha_recepcion,
          centros_servicio (
            nombre,
            codigo
          )
        `)
        .eq("requiere_reubicacion", true);

      if (error) throw error;

      // Agrupar por centro de servicio
      const grouped = stockData?.reduce((acc: any, item: any) => {
        const centroNombre = item.centros_servicio?.nombre || "Sin asignar";
        if (!acc[centroNombre]) {
          acc[centroNombre] = {
            centro_servicio: centroNombre,
            cantidad_repuestos: 0,
            mas_antiguos: 0,
          };
        }
        acc[centroNombre].cantidad_repuestos += 1;

        // Verificar si tiene más de 24 horas
        const fechaRecepcion = new Date(item.fecha_recepcion);
        const ahora = new Date();
        const diffHoras = (ahora.getTime() - fechaRecepcion.getTime()) / (1000 * 60 * 60);
        if (diffHoras > 24) {
          acc[centroNombre].mas_antiguos += 1;
        }

        return acc;
      }, {});

      setPendientes(Object.values(grouped || {}));
    } catch (error) {
      console.error("Error fetching pendientes:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalPendientes = pendientes.reduce((sum, p) => sum + p.cantidad_repuestos, 0);
  const totalAntiguos = pendientes.reduce((sum, p) => sum + p.mas_antiguos, 0);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageSearch className="h-5 w-5" />
            Pendientes de Reubicación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Cargando...</p>
        </CardContent>
      </Card>
    );
  }

  if (totalPendientes === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageSearch className="h-5 w-5" />
            Pendientes de Reubicación
          </CardTitle>
          <CardDescription>No hay repuestos en puerta de entrada</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <p className="text-sm">Todos los repuestos están ubicados</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PackageSearch className="h-5 w-5" />
          Pendientes de Reubicación
        </CardTitle>
        <CardDescription>
          Repuestos en puerta de entrada esperando ubicación final
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {totalAntiguos > 0 && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm font-medium text-destructive">
              {totalAntiguos} repuesto{totalAntiguos !== 1 ? "s" : ""} con más de 24 horas sin reubicar
            </p>
          </div>
        )}

        <div className="space-y-2">
          {pendientes
            .sort((a, b) => b.cantidad_repuestos - a.cantidad_repuestos)
            .map((pendiente) => (
              <div
                key={pendiente.centro_servicio}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{pendiente.centro_servicio}</p>
                    {pendiente.mas_antiguos > 0 && (
                      <p className="text-xs text-destructive">
                        {pendiente.mas_antiguos} urgente{pendiente.mas_antiguos !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </div>
                <Badge variant={pendiente.mas_antiguos > 0 ? "destructive" : "secondary"}>
                  {pendiente.cantidad_repuestos} repuesto{pendiente.cantidad_repuestos !== 1 ? "s" : ""}
                </Badge>
              </div>
            ))}
        </div>

        <Button
          onClick={() => navigate("/bodega/reubicacion-repuestos")}
          className="w-full"
        >
          Ir a Reubicación
        </Button>
      </CardContent>
    </Card>
  );
};
