import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Package, Plus, Truck, Users, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CentroServicio {
  id: string;
  nombre: string;
  es_central: boolean;
}

interface ListadoAbastecimiento {
  id: string;
  nombre: string;
  estado: string;
  fecha_generacion: string;
  centro_servicio_destino_id: string;
  notas: string | null;
  items_total?: number;
  items_pickeados?: number;
  pickers_count?: number;
}

interface Profile {
  user_id: string;
  nombre: string;
  apellido: string;
}

export default function AbastecimientoCentros() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [centros, setCentros] = useState<CentroServicio[]>([]);
  const [listados, setListados] = useState<ListadoAbastecimiento[]>([]);
  const [pickers, setPickers] = useState<Record<string, Profile[]>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCentro, setSelectedCentro] = useState<CentroServicio | null>(null);
  const [nuevoListado, setNuevoListado] = useState({ nombre: "", notas: "" });
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch centros de servicio (excluyendo el central zona 5)
      const { data: centrosData, error: centrosError } = await supabase
        .from("centros_servicio")
        .select("id, nombre, es_central")
        .eq("activo", true)
        .order("nombre");

      if (centrosError) throw centrosError;
      
      // Filtrar solo centros que no son el central
      const centrosDestino = (centrosData || []).filter(c => !c.es_central);
      setCentros(centrosDestino);

      // Fetch listados activos (no completados ni cancelados)
      const { data: listadosData, error: listadosError } = await supabase
        .from("listados_abastecimiento")
        .select("*")
        .in("estado", ["borrador", "en_picking"])
        .order("fecha_generacion", { ascending: false });

      if (listadosError) throw listadosError;

      // Para cada listado, obtener conteo de items y pickers
      const listadosConStats = await Promise.all((listadosData || []).map(async (listado) => {
        // Contar items
        const { count: totalItems } = await supabase
          .from("listados_abastecimiento_items")
          .select("*", { count: "exact", head: true })
          .eq("listado_id", listado.id);

        const { count: itemsPickeados } = await supabase
          .from("listados_abastecimiento_items")
          .select("*", { count: "exact", head: true })
          .eq("listado_id", listado.id)
          .eq("estado", "pickeado");

        // Contar pickers
        const { count: pickersCount } = await supabase
          .from("listados_abastecimiento_pickers")
          .select("*", { count: "exact", head: true })
          .eq("listado_id", listado.id)
          .eq("estado", "activo");

        return {
          ...listado,
          items_total: totalItems || 0,
          items_pickeados: itemsPickeados || 0,
          pickers_count: pickersCount || 0
        };
      }));

      setListados(listadosConStats);

      // Fetch pickers activos por listado
      const pickersMap: Record<string, Profile[]> = {};
      for (const listado of listadosConStats) {
        const { data: pickersData } = await supabase
          .from("listados_abastecimiento_pickers")
          .select("picker_id")
          .eq("listado_id", listado.id)
          .eq("estado", "activo");

        if (pickersData && pickersData.length > 0) {
          const pickerIds = pickersData.map(p => p.picker_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, nombre, apellido")
            .in("user_id", pickerIds);
          
          pickersMap[listado.id] = profiles || [];
        }
      }
      setPickers(pickersMap);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const handleCrearListado = async () => {
    if (!selectedCentro || !nuevoListado.nombre.trim()) {
      toast.error("Por favor complete el nombre del listado");
      return;
    }

    setCreando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Crear el listado
      const { data: listado, error: listadoError } = await supabase
        .from("listados_abastecimiento")
        .insert({
          centro_servicio_destino_id: selectedCentro.id,
          nombre: nuevoListado.nombre.trim(),
          notas: nuevoListado.notas.trim() || null,
          generado_por: user?.id,
          estado: "borrador"
        })
        .select()
        .single();

      if (listadoError) throw listadoError;

      // Generar items basados en análisis de movimientos
      await generarItemsListado(listado.id, selectedCentro.id);

      toast.success("Listado creado correctamente");
      setDialogOpen(false);
      setNuevoListado({ nombre: "", notas: "" });
      setSelectedCentro(null);
      
      // Navegar al listado creado
      navigate(`/bodega/picking/${listado.id}`);

    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al crear listado");
    } finally {
      setCreando(false);
    }
  };

  const generarItemsListado = async (listadoId: string, centroDestinoId: string) => {
    try {
      // Obtener el centro de servicio Zona 5 (central)
      const { data: centroCentral } = await supabase
        .from("centros_servicio")
        .select("id")
        .eq("es_central", true)
        .single();

      if (!centroCentral) {
        console.warn("No se encontró centro central");
        return;
      }

      // Obtener inventario de Zona 5 con stock > 0
      const { data: inventarioZona5 } = await supabase
        .from("inventario")
        .select("codigo_repuesto, descripcion, cantidad, ubicacion_legacy")
        .eq("centro_servicio_id", centroCentral.id)
        .gt("cantidad", 0)
        .limit(100); // Limitar para demo

      if (!inventarioZona5 || inventarioZona5.length === 0) {
        toast.info("No hay items en inventario de Zona 5 para generar listado");
        return;
      }

      // Obtener stock actual del centro destino
      const { data: stockDestino } = await supabase
        .from("inventario")
        .select("codigo_repuesto, cantidad")
        .eq("centro_servicio_id", centroDestinoId);

      const stockDestinoMap = new Map(
        (stockDestino || []).map(s => [s.codigo_repuesto, s.cantidad])
      );

      // Generar items sugeridos
      const itemsToInsert = inventarioZona5
        .filter(item => {
          const stockEnDestino = stockDestinoMap.get(item.codigo_repuesto) || 0;
          // Sugerir si el destino tiene menos de 2 unidades
          return stockEnDestino < 2 && item.cantidad > 0;
        })
        .slice(0, 50) // Máximo 50 items por listado
        .map(item => ({
          listado_id: listadoId,
          codigo_repuesto: item.codigo_repuesto,
          descripcion: item.descripcion,
          cantidad_sugerida: Math.min(item.cantidad, 3), // Máximo 3 unidades por item
          ubicacion_origen: item.ubicacion_legacy,
          estado: "pendiente"
        }));

      if (itemsToInsert.length > 0) {
        const { error } = await supabase
          .from("listados_abastecimiento_items")
          .insert(itemsToInsert);

        if (error) throw error;
      }

    } catch (error) {
      console.error("Error generando items:", error);
    }
  };

  const getListadosByCentro = (centroId: string) => {
    return listados.filter(l => l.centro_servicio_destino_id === centroId);
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "borrador":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Borrador</Badge>;
      case "en_picking":
        return <Badge className="bg-blue-500"><Package className="h-3 w-3 mr-1" />En Picking</Badge>;
      case "completado":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Completado</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Package className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Truck className="h-8 w-8 text-primary" />
            Abastecimiento a Centros
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestiona los envíos de repuestos desde Zona 5 a los demás centros de servicio
          </p>
        </div>
      </div>

      {centros.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay centros de servicio configurados</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {centros.map(centro => {
            const listadosCentro = getListadosByCentro(centro.id);
            const listadoActivo = listadosCentro.find(l => l.estado === "en_picking");
            const listadoBorrador = listadosCentro.find(l => l.estado === "borrador");
            
            return (
              <Card key={centro.id} className="relative">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{centro.nombre}</span>
                    {listadoActivo && (
                      <Badge className="bg-blue-500 animate-pulse">Activo</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {listadosCentro.length} listado(s) pendiente(s)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {listadoActivo ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{listadoActivo.nombre}</span>
                        {getEstadoBadge(listadoActivo.estado)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Progreso</span>
                          <span>{listadoActivo.items_pickeados}/{listadoActivo.items_total} items</span>
                        </div>
                        <Progress 
                          value={listadoActivo.items_total ? (listadoActivo.items_pickeados! / listadoActivo.items_total) * 100 : 0} 
                          className="h-2"
                        />
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{listadoActivo.pickers_count} picker(s) asignado(s)</span>
                      </div>
                      {pickers[listadoActivo.id]?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {pickers[listadoActivo.id].map(p => (
                            <Badge key={p.user_id} variant="outline" className="text-xs">
                              {p.nombre} {p.apellido?.[0]}.
                            </Badge>
                          ))}
                        </div>
                      )}
                      <Button 
                        className="w-full" 
                        onClick={() => navigate(`/bodega/picking/${listadoActivo.id}`)}
                      >
                        Ver Listado
                      </Button>
                    </div>
                  ) : listadoBorrador ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{listadoBorrador.nombre}</span>
                        {getEstadoBadge(listadoBorrador.estado)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {listadoBorrador.items_total} items preparados
                      </p>
                      <Button 
                        className="w-full" 
                        onClick={() => navigate(`/bodega/picking/${listadoBorrador.id}`)}
                      >
                        Continuar Edición
                      </Button>
                    </div>
                  ) : (
                    <Dialog open={dialogOpen && selectedCentro?.id === centro.id} onOpenChange={(open) => {
                      setDialogOpen(open);
                      if (!open) setSelectedCentro(null);
                    }}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => setSelectedCentro(centro)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Generar Listado
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Nuevo Listado de Abastecimiento</DialogTitle>
                          <DialogDescription>
                            Crear listado para {centro.nombre}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="nombre">Nombre del Listado</Label>
                            <Input
                              id="nombre"
                              placeholder="Ej: Abastecimiento Enero 2026"
                              value={nuevoListado.nombre}
                              onChange={(e) => setNuevoListado(prev => ({ ...prev, nombre: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="notas">Notas (opcional)</Label>
                            <Textarea
                              id="notas"
                              placeholder="Observaciones adicionales..."
                              value={nuevoListado.notas}
                              onChange={(e) => setNuevoListado(prev => ({ ...prev, notas: e.target.value }))}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancelar
                          </Button>
                          <Button onClick={handleCrearListado} disabled={creando}>
                            {creando ? "Creando..." : "Crear y Generar Items"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
