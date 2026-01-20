import { useState, useEffect } from "react";
import { Package, MapPin, Building, Edit, History, RefreshCw } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MovimientoTimeline } from "./MovimientoTimeline";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface InventarioItem {
  id: number;
  codigo_repuesto: string;
  descripcion: string | null;
  cantidad: number;
  ubicacion_legacy: string;
  bodega: string | null;
  costo_unitario: number | null;
  centro_servicio_id: number;
  centro_nombre?: string;
}

interface InventarioDetailSheetProps {
  item: InventarioItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMovimiento: (item: InventarioItem) => void;
}

interface Movimiento {
  id: number;
  tipo_movimiento: "ENTRADA" | "SALIDA" | "AJUSTE";
  cantidad: number;
  motivo?: string | null;
  created_at: string;
  stock_anterior?: number | null;
  stock_nuevo?: number | null;
  ubicacion?: string | null;
}

interface OtrosCentrosStock {
  centro_nombre: string;
  cantidad: number;
  ubicacion: string;
}

export function InventarioDetailSheet({
  item,
  open,
  onOpenChange,
  onMovimiento
}: InventarioDetailSheetProps) {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [otrosCentros, setOtrosCentros] = useState<OtrosCentrosStock[]>([]);
  const [sustitutos, setSustitutos] = useState<{ codigo: string; descripcion: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item && open) {
      fetchDetails();
    }
  }, [item, open]);

  const fetchDetails = async () => {
    if (!item) return;
    setLoading(true);

    try {
      // Fetch movimientos - using repuesto_id instead of codigo_repuesto
      // First get the repuesto_id from the repuestos table
      const { data: repuestoData } = await supabase
        .from("repuestos")
        .select("id")
        .eq("codigo", item.codigo_repuesto)
        .single();

      if (repuestoData) {
        const { data: movData } = await supabase
          .from("movimientos_inventario")
          .select("*")
          .eq("repuesto_id", repuestoData.id)
          .eq("centro_servicio_id", item.centro_servicio_id)
          .order("created_at", { ascending: false })
          .limit(10);

        setMovimientos((movData || []) as Movimiento[]);
      } else {
        setMovimientos([]);
      }

      // Fetch stock en otros centros
      const { data: otrosData } = await supabase
        .from("inventario")
        .select(`
          cantidad,
          ubicacion_legacy,
          centros_de_servicio:centro_servicio_id(nombre)
        `)
        .eq("codigo_repuesto", item.codigo_repuesto)
        .neq("centro_servicio_id", item.centro_servicio_id);

      const otrosFormatted = (otrosData || []).map((o: any) => ({
        centro_nombre: o.centros_de_servicio?.nombre || "Sin centro",
        cantidad: o.cantidad,
        ubicacion: o.ubicacion_legacy
      }));
      setOtrosCentros(otrosFormatted);

      // Fetch sustitutos (buscar en repuestos con relación padre-hijo)
      const { data: repuestoInfo } = await supabase
        .from("repuestos")
        .select("codigo_padre")
        .eq("codigo", item.codigo_repuesto)
        .single();

      if (repuestoInfo?.codigo_padre) {
        const { data: sustData } = await supabase
          .from("repuestos")
          .select("codigo, descripcion")
          .eq("codigo_padre", repuestoInfo.codigo_padre)
          .neq("codigo", item.codigo_repuesto)
          .limit(5);
        
        setSustitutos(sustData || []);
      } else {
        setSustitutos([]);
      }
    } catch (error) {
      console.error("Error fetching details:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!item) return null;

  const stockStatus = item.cantidad === 0 
    ? { label: "Sin stock", color: "destructive" as const }
    : item.cantidad <= 5 
      ? { label: "Stock bajo", color: "warning" as const }
      : { label: "Normal", color: "success" as const };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-left font-mono">
                {item.codigo_repuesto}
              </SheetTitle>
              <SheetDescription className="text-left">
                {item.descripcion || "Sin descripción"}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Stock Actual</p>
              <p className={cn(
                "text-2xl font-bold",
                item.cantidad === 0 && "text-destructive",
                item.cantidad <= 5 && item.cantidad > 0 && "text-orange-500"
              )}>
                {item.cantidad}
              </p>
              <Badge 
                variant="outline"
                className={cn(
                  "mt-1",
                  stockStatus.color === "destructive" && "bg-destructive text-destructive-foreground border-destructive",
                  stockStatus.color === "warning" && "bg-orange-500 text-white border-orange-500",
                  stockStatus.color === "success" && "bg-green-500 text-white border-green-500"
                )}
              >
                {stockStatus.label}
              </Badge>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Costo Unitario</p>
              <p className="text-2xl font-bold">
                Q{(item.costo_unitario || 0).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Valor total: Q{((item.costo_unitario || 0) * item.cantidad).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Location Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{item.ubicacion_legacy || "Sin ubicación"}</p>
                <p className="text-xs text-muted-foreground">Ubicación</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Building className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{item.centro_nombre}</p>
                <p className="text-xs text-muted-foreground">Centro de servicio</p>
              </div>
            </div>
            {item.bodega && (
              <div className="flex items-center gap-3">
                <Package className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{item.bodega}</p>
                  <p className="text-xs text-muted-foreground">Bodega</p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Tabs */}
          <Tabs defaultValue="movimientos" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="movimientos" className="text-xs">
                <History className="h-3 w-3 mr-1" />
                Historial
              </TabsTrigger>
              <TabsTrigger value="centros" className="text-xs">
                <Building className="h-3 w-3 mr-1" />
                Otros Centros
              </TabsTrigger>
              <TabsTrigger value="sustitutos" className="text-xs">
                <RefreshCw className="h-3 w-3 mr-1" />
                Sustitutos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="movimientos" className="mt-4">
              <MovimientoTimeline 
                movimientos={movimientos} 
                isLoading={loading}
                maxHeight="250px"
              />
            </TabsContent>

            <TabsContent value="centros" className="mt-4">
              {otrosCentros.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No hay stock en otros centros</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {otrosCentros.map((centro, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium text-sm">{centro.centro_nombre}</p>
                        <p className="text-xs text-muted-foreground">{centro.ubicacion}</p>
                      </div>
                      <Badge variant="secondary">{centro.cantidad} uds</Badge>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="sustitutos" className="mt-4">
              {sustitutos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <RefreshCw className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No hay sustitutos registrados</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sustitutos.map((sust) => (
                    <div key={sust.codigo} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-mono text-sm">{sust.codigo}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {sust.descripcion}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <Separator />

          {/* Actions */}
          <div className="flex gap-3">
            <Button 
              className="flex-1" 
              onClick={() => onMovimiento(item)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Registrar Movimiento
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
