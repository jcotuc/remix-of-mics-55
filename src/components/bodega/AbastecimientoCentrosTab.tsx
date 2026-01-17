import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Package, Truck, Plus, Eye, Clock, CheckCircle2, Users, AlertCircle, Loader2 } from "lucide-react";
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
  total_items?: number;
  items_pickeados?: number;
  pickers_activos?: number;
}

interface Profile {
  user_id: string;
  nombre: string | null;
  apellido: string | null;
}

const AbastecimientoCentrosTab = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [centros, setCentros] = useState<CentroServicio[]>([]);
  const [listados, setListados] = useState<ListadoAbastecimiento[]>([]);
  const [pickersMap, setPickersMap] = useState<Record<string, Profile[]>>({});
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCentroId, setSelectedCentroId] = useState<string>("");
  const [nuevoListadoNombre, setNuevoListadoNombre] = useState("");
  const [nuevoListadoNotas, setNuevoListadoNotas] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Obtener centros de servicio (excluyendo el central/Zona 5)
      const { data: centrosData, error: centrosError } = await supabase
        .from("centros_servicio")
        .select("id, nombre, es_central")
        .eq("activo", true)
        .order("nombre");
      
      if (centrosError) throw centrosError;
      
      const centrosFiltrados = (centrosData || []).filter(c => !c.es_central && !c.nombre.toLowerCase().includes("zona 5"));
      setCentros(centrosFiltrados);

      // Obtener listados activos
      const { data: listadosData, error: listadosError } = await supabase
        .from("listados_abastecimiento")
        .select("*")
        .in("estado", ["borrador", "en_picking"])
        .order("fecha_generacion", { ascending: false });
      
      if (listadosError) throw listadosError;

      // Para cada listado, obtener stats
      const listadosConStats: ListadoAbastecimiento[] = [];
      const pickersMapTemp: Record<string, Profile[]> = {};

      for (const listado of listadosData || []) {
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

        listadosConStats.push({
          ...listado,
          total_items: totalItems || 0,
          items_pickeados: itemsPickeados || 0,
          pickers_activos: 0,
        });
      }

      setListados(listadosConStats);
      setPickersMap(pickersMapTemp);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  const handleCrearListado = async () => {
    if (!nuevoListadoNombre.trim()) {
      toast.error("Ingresa un nombre para el listado");
      return;
    }

    setCreating(true);
    try {
      const { data: nuevoListado, error: insertError } = await supabase
        .from("listados_abastecimiento")
        .insert({
          nombre: nuevoListadoNombre.trim(),
          notas: nuevoListadoNotas.trim() || null,
          centro_servicio_destino_id: selectedCentroId,
          generado_por: user?.id,
          estado: "borrador",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Generar items sugeridos
      await generarItemsListado(nuevoListado.id, selectedCentroId);

      toast.success("Listado creado correctamente");
      setDialogOpen(false);
      setNuevoListadoNombre("");
      setNuevoListadoNotas("");
      
      // Navegar al listado
      navigate(`/bodega/picking/${nuevoListado.id}`);
    } catch (error) {
      console.error("Error creating listado:", error);
      toast.error("Error al crear el listado");
    } finally {
      setCreating(false);
    }
  };

  const generarItemsListado = async (listadoId: string, centroDestinoId: string) => {
    try {
      // Obtener inventario de Zona 5 con stock
      const { data: zona5Data } = await supabase
        .from("centros_servicio")
        .select("id")
        .or("es_central.eq.true,nombre.ilike.%zona 5%")
        .single();

      if (!zona5Data) return;

      const { data: inventarioZona5 } = await supabase
        .from("inventario")
        .select("codigo_repuesto, cantidad, descripcion, ubicacion_legacy")
        .eq("centro_servicio_id", zona5Data.id)
        .gt("cantidad", 0);

      if (!inventarioZona5 || inventarioZona5.length === 0) return;

      // Obtener stock del centro destino
      const { data: stockDestino } = await supabase
        .from("inventario")
        .select("codigo_repuesto, cantidad")
        .eq("centro_servicio_id", centroDestinoId);

      const stockDestinoMap = new Map(
        (stockDestino || []).map(s => [s.codigo_repuesto, s.cantidad])
      );

      // Obtener análisis ABC-XYZ para priorizar
      const { data: analisisData } = await supabase
        .from("analisis_inventario")
        .select("codigo_repuesto, clasificacion_abc, clasificacion_xyz")
        .eq("centro_servicio_id", zona5Data.id);

      const analisisMap = new Map(
        (analisisData || []).map(a => [a.codigo_repuesto, { abc: a.clasificacion_abc, xyz: a.clasificacion_xyz }])
      );

      // Filtrar y generar sugeridos
      const itemsSugeridos = inventarioZona5
        .filter(item => {
          const stockEnDestino = stockDestinoMap.get(item.codigo_repuesto) || 0;
          return stockEnDestino < 2; // Solo si tienen menos de 2 unidades
        })
        .map(item => {
          const analisis = analisisMap.get(item.codigo_repuesto);
          return {
            ...item,
            abc: analisis?.abc || "C",
            xyz: analisis?.xyz || "Z",
          };
        })
        // Priorizar A/X primero
        .sort((a, b) => {
          const prioridadABC = { A: 1, B: 2, C: 3 };
          const prioridadXYZ = { X: 1, Y: 2, Z: 3 };
          const scoreA = (prioridadABC[a.abc as keyof typeof prioridadABC] || 3) + (prioridadXYZ[a.xyz as keyof typeof prioridadXYZ] || 3);
          const scoreB = (prioridadABC[b.abc as keyof typeof prioridadABC] || 3) + (prioridadXYZ[b.xyz as keyof typeof prioridadXYZ] || 3);
          return scoreA - scoreB;
        })
        .slice(0, 50); // Máximo 50 items

      if (itemsSugeridos.length === 0) return;

      // Insertar items
      const itemsToInsert = itemsSugeridos.map(item => ({
        listado_id: listadoId,
        codigo_repuesto: item.codigo_repuesto,
        descripcion: item.descripcion || "",
        cantidad_sugerida: Math.min(item.cantidad, 3), // Máximo 3 unidades por item
        ubicacion_origen: item.ubicacion_legacy || "",
        estado: "pendiente",
      }));

      await supabase
        .from("listados_abastecimiento_items")
        .insert(itemsToInsert);

    } catch (error) {
      console.error("Error generating items:", error);
    }
  };

  const getListadosByCentro = (centroId: string) => {
    return listados.filter(l => l.centro_servicio_destino_id === centroId);
  };

  const getEstadoBadge = (estado: string) => {
    if (estado === "borrador") {
      return <Badge variant="outline" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Borrador</Badge>;
    }
    if (estado === "en_picking") {
      return <Badge className="bg-blue-500/20 text-blue-700 flex items-center gap-1"><Package className="h-3 w-3" /> En Picking</Badge>;
    }
    return <Badge variant="outline">{estado}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Package className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-muted-foreground">Cargando centros...</p>
        </div>
      </div>
    );
  }

  if (centros.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No hay centros de servicio departamentales configurados.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {centros.map((centro) => {
          const listadosCentro = getListadosByCentro(centro.id);
          const listadoActivo = listadosCentro.find(l => l.estado === "en_picking");
          const listadoBorrador = listadosCentro.find(l => l.estado === "borrador");
          
          return (
            <Card key={centro.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{centro.nombre}</CardTitle>
                  {listadoActivo && (
                    <Badge className="bg-green-500/20 text-green-700">Activo</Badge>
                  )}
                </div>
                <CardDescription>
                  {listadosCentro.length} listado(s) pendiente(s)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {listadoActivo && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{listadoActivo.nombre}</span>
                      {getEstadoBadge(listadoActivo.estado)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Package className="h-4 w-4" />
                        {listadoActivo.items_pickeados}/{listadoActivo.total_items}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {listadoActivo.pickers_activos} picker(s)
                      </span>
                    </div>
                    {pickersMap[listadoActivo.id] && pickersMap[listadoActivo.id].length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {pickersMap[listadoActivo.id].map(p => `${p.nombre || ""} ${p.apellido || ""}`).join(", ")}
                      </div>
                    )}
                    <Button 
                      size="sm" 
                      className="w-full mt-2"
                      onClick={() => navigate(`/bodega/picking/${listadoActivo.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Listado
                    </Button>
                  </div>
                )}

                {!listadoActivo && listadoBorrador && (
                  <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{listadoBorrador.nombre}</span>
                      {getEstadoBadge(listadoBorrador.estado)}
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate(`/bodega/picking/${listadoBorrador.id}`)}
                    >
                      Continuar Edición
                    </Button>
                  </div>
                )}

                {!listadoActivo && !listadoBorrador && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      setSelectedCentroId(centro.id);
                      setNuevoListadoNombre(`Abastecimiento ${centro.nombre} - ${new Date().toLocaleDateString("es-GT")}`);
                      setDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Generar Listado
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog para crear nuevo listado */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Listado de Abastecimiento</DialogTitle>
            <DialogDescription>
              Se generará automáticamente con códigos sugeridos basados en el análisis ABC-XYZ.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre del listado</Label>
              <Input
                id="nombre"
                value={nuevoListadoNombre}
                onChange={(e) => setNuevoListadoNombre(e.target.value)}
                placeholder="Ej: Abastecimiento Quetzaltenango - Enero 2026"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notas">Notas (opcional)</Label>
              <Textarea
                id="notas"
                value={nuevoListadoNotas}
                onChange={(e) => setNuevoListadoNotas(e.target.value)}
                placeholder="Notas adicionales..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={creating}>
              Cancelar
            </Button>
            <Button onClick={handleCrearListado} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Listado
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AbastecimientoCentrosTab;
