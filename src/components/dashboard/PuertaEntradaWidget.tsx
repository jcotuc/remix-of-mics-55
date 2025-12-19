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
      // Query inventario where ubicacion is null or empty (pending relocation)
      const { data: inventarioData, error } = await supabase
        .from("inventario")
        .select(`
          centro_servicio_id,
          centros_servicio (
            nombre
          )
        `)
        .or("ubicacion.is.null,ubicacion.eq.");

      if (error) throw error;

      // Group by service center
      const grouped = inventarioData?.reduce((acc: any, item: any) => {
        const centroNombre = item.centros_servicio?.nombre || "Sin asignar";
        if (!acc[centroNombre]) {
          acc[centroNombre] = {
            centro_servicio: centroNombre,
            cantidad_repuestos: 0,
          };
        }
        acc[centroNombre].cantidad_repuestos += 1;
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
          <CardDescription>No hay repuestos sin ubicación</CardDescription>
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
          Repuestos sin ubicación asignada
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
                  </div>
                </div>
                <Badge variant="secondary">
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
