import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Package, ArrowLeft, Users, Play, Pause, Check, X, 
  Clock, AlertCircle, User, Loader2, RefreshCw 
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ListadoAbastecimiento {
  id: string;
  nombre: string;
  estado: string;
  fecha_generacion: string;
  centro_servicio_destino_id: string;
  notas: string | null;
}

interface ListadoItem {
  id: string;
  listado_id: string;
  codigo_repuesto: string;
  descripcion: string | null;
  cantidad_sugerida: number;
  cantidad_confirmada: number | null;
  cantidad_pickeada: number;
  ubicacion_origen: string | null;
  estado: string;
  picker_asignado_id: string | null;
  picker_asignado_at: string | null;
  pickeado_por: string | null;
  pickeado_at: string | null;
  notas: string | null;
}

interface Picker {
  id: string;
  picker_id: string;
  estado: string;
  items_pickeados: number;
  profile?: {
    nombre: string;
    apellido: string;
  };
}

interface CentroServicio {
  id: string;
  nombre: string;
}

export default function ListadoPicking() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [listado, setListado] = useState<ListadoAbastecimiento | null>(null);
  const [centro, setCentro] = useState<CentroServicio | null>(null);
  const [items, setItems] = useState<ListadoItem[]>([]);
  const [pickers, setPickers] = useState<Picker[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string; nombre: string; apellido: string } | null>(null);
  const [isPickerActivo, setIsPickerActivo] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmPublicar, setConfirmPublicar] = useState(false);
  const [processingItem, setProcessingItem] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id, nombre, apellido")
          .eq("user_id", user.id)
          .single();
        
        if (profile) {
          setCurrentUser({
            id: user.id,
            nombre: profile.nombre || "",
            apellido: profile.apellido || ""
          });
        }
      }

      // Fetch listado
      const { data: listadoData, error: listadoError } = await supabase
        .from("listados_abastecimiento")
        .select("*")
        .eq("id", id)
        .single();

      if (listadoError) throw listadoError;
      setListado(listadoData);

      // Fetch centro destino
      const { data: centroData } = await supabase
        .from("centros_servicio")
        .select("id, nombre")
        .eq("id", listadoData.centro_servicio_destino_id)
        .single();
      
      setCentro(centroData);

      // Fetch items
      const { data: itemsData, error: itemsError } = await supabase
        .from("listados_abastecimiento_items")
        .select("*")
        .eq("listado_id", id)
        .order("ubicacion_origen");

      if (itemsError) throw itemsError;
      setItems(itemsData || []);

      // Fetch pickers con profiles
      const { data: pickersData } = await supabase
        .from("listados_abastecimiento_pickers")
        .select("*")
        .eq("listado_id", id);

      if (pickersData && pickersData.length > 0) {
        const pickerIds = pickersData.map(p => p.picker_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, nombre, apellido")
          .in("user_id", pickerIds);

        const pickersConProfiles = pickersData.map(p => ({
          ...p,
          profile: profiles?.find(pr => pr.user_id === p.picker_id)
        }));
        
        setPickers(pickersConProfiles);

        // Check if current user is an active picker
        if (user) {
          const myPicker = pickersData.find(p => p.picker_id === user.id && p.estado === "activo");
          setIsPickerActivo(!!myPicker);
        }
      }

    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar listado");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscription para items
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`listado-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "listados_abastecimiento_items",
          filter: `listado_id=eq.${id}`
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, fetchData]);

  const handleUnirseAlPicking = async () => {
    if (!currentUser || !id) return;

    try {
      const { error } = await supabase
        .from("listados_abastecimiento_pickers")
        .insert({
          listado_id: id,
          picker_id: currentUser.id,
          estado: "activo"
        });

      if (error) {
        if (error.code === "23505") {
          // Already exists, update to active
          await supabase
            .from("listados_abastecimiento_pickers")
            .update({ estado: "activo" })
            .eq("listado_id", id)
            .eq("picker_id", currentUser.id);
        } else {
          throw error;
        }
      }

      setIsPickerActivo(true);
      toast.success("Te has unido al picking");
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al unirse al picking");
    }
  };

  const handlePausarPicking = async () => {
    if (!currentUser || !id) return;

    try {
      await supabase
        .from("listados_abastecimiento_pickers")
        .update({ estado: "pausado" })
        .eq("listado_id", id)
        .eq("picker_id", currentUser.id);

      // Liberar items que tenía asignados
      await supabase
        .from("listados_abastecimiento_items")
        .update({ 
          picker_asignado_id: null, 
          picker_asignado_at: null,
          estado: "pendiente"
        })
        .eq("listado_id", id)
        .eq("picker_asignado_id", currentUser.id)
        .eq("estado", "en_picking");

      setIsPickerActivo(false);
      toast.info("Has pausado tu participación");
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al pausar");
    }
  };

  const handleTomarItem = async (itemId: string) => {
    if (!currentUser) return;
    
    setProcessingItem(itemId);
    try {
      // Liberar timeout de items viejos primero
      await supabase.rpc("liberar_items_timeout");

      const { error } = await supabase
        .from("listados_abastecimiento_items")
        .update({
          picker_asignado_id: currentUser.id,
          picker_asignado_at: new Date().toISOString(),
          estado: "en_picking"
        })
        .eq("id", itemId)
        .eq("estado", "pendiente");

      if (error) throw error;
      
      toast.success("Item asignado");
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al tomar item");
    } finally {
      setProcessingItem(null);
    }
  };

  const handleConfirmarItem = async (itemId: string, cantidad: number) => {
    if (!currentUser) return;
    
    setProcessingItem(itemId);
    try {
      const { error } = await supabase
        .from("listados_abastecimiento_items")
        .update({
          estado: "pickeado",
          cantidad_pickeada: cantidad,
          pickeado_por: currentUser.id,
          pickeado_at: new Date().toISOString()
        })
        .eq("id", itemId)
        .eq("picker_asignado_id", currentUser.id);

      if (error) throw error;

      // Actualizar contador de picker
      await supabase
        .from("listados_abastecimiento_pickers")
        .update({ items_pickeados: pickers.find(p => p.picker_id === currentUser.id)?.items_pickeados ?? 0 + 1 })
        .eq("listado_id", id)
        .eq("picker_id", currentUser.id);
      
      toast.success("Item confirmado");
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al confirmar");
    } finally {
      setProcessingItem(null);
    }
  };

  const handleLiberarItem = async (itemId: string) => {
    setProcessingItem(itemId);
    try {
      const { error } = await supabase
        .from("listados_abastecimiento_items")
        .update({
          picker_asignado_id: null,
          picker_asignado_at: null,
          estado: "pendiente"
        })
        .eq("id", itemId);

      if (error) throw error;
      
      toast.info("Item liberado");
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al liberar item");
    } finally {
      setProcessingItem(null);
    }
  };

  const handleMarcarNoDisponible = async (itemId: string) => {
    if (!currentUser) return;
    
    setProcessingItem(itemId);
    try {
      const { error } = await supabase
        .from("listados_abastecimiento_items")
        .update({
          estado: "no_disponible",
          cantidad_pickeada: 0,
          pickeado_por: currentUser.id,
          pickeado_at: new Date().toISOString()
        })
        .eq("id", itemId);

      if (error) throw error;
      
      toast.warning("Item marcado como no disponible");
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error");
    } finally {
      setProcessingItem(null);
    }
  };

  const handlePublicarListado = async () => {
    if (!id) return;

    try {
      const { error } = await supabase
        .from("listados_abastecimiento")
        .update({ estado: "en_picking" })
        .eq("id", id);

      if (error) throw error;
      
      toast.success("Listado publicado - Los pickers pueden comenzar");
      setConfirmPublicar(false);
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al publicar");
    }
  };

  const handleFinalizarListado = async () => {
    if (!id) return;

    try {
      const { error } = await supabase
        .from("listados_abastecimiento")
        .update({ estado: "completado" })
        .eq("id", id);

      if (error) throw error;
      
      toast.success("Listado completado");
      navigate("/bodega/abastecimiento");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al finalizar");
    }
  };

  const getPickerName = (pickerId: string | null) => {
    if (!pickerId) return null;
    const picker = pickers.find(p => p.picker_id === pickerId);
    if (picker?.profile) {
      return `${picker.profile.nombre} ${picker.profile.apellido?.[0] || ""}.`;
    }
    return "Usuario";
  };

  const filteredItems = items.filter(item => 
    !searchTerm || 
    item.codigo_repuesto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.ubicacion_origen?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: items.length,
    pendientes: items.filter(i => i.estado === "pendiente").length,
    enPicking: items.filter(i => i.estado === "en_picking").length,
    pickeados: items.filter(i => i.estado === "pickeado").length,
    noDisponibles: items.filter(i => i.estado === "no_disponible").length
  };

  const progreso = stats.total > 0 ? ((stats.pickeados + stats.noDisponibles) / stats.total) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Package className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }

  if (!listado) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p>Listado no encontrado</p>
            <Button variant="link" onClick={() => navigate("/bodega/abastecimiento")}>
              Volver
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/bodega/abastecimiento")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{listado.nombre}</h1>
            <p className="text-muted-foreground">
              Destino: {centro?.nombre || "Cargando..."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          {listado.estado === "borrador" && (
            <Button onClick={() => setConfirmPublicar(true)}>
              <Play className="h-4 w-4 mr-2" />
              Publicar Listado
            </Button>
          )}
          {listado.estado === "en_picking" && progreso === 100 && (
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleFinalizarListado}>
              <Check className="h-4 w-4 mr-2" />
              Finalizar
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Items</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pendientes</CardDescription>
            <CardTitle className="text-2xl text-muted-foreground">{stats.pendientes}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>En Picking</CardDescription>
            <CardTitle className="text-2xl text-blue-500">{stats.enPicking}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pickeados</CardDescription>
            <CardTitle className="text-2xl text-green-500">{stats.pickeados}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>No Disponible</CardDescription>
            <CardTitle className="text-2xl text-orange-500">{stats.noDisponibles}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progreso General</span>
            <span className="text-sm text-muted-foreground">{Math.round(progreso)}%</span>
          </div>
          <Progress value={progreso} className="h-3" />
        </CardContent>
      </Card>

      {/* Pickers Section */}
      {listado.estado === "en_picking" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Pickers Asignados
              </CardTitle>
              {!isPickerActivo ? (
                <Button onClick={handleUnirseAlPicking}>
                  <Play className="h-4 w-4 mr-2" />
                  Unirse al Picking
                </Button>
              ) : (
                <Button variant="outline" onClick={handlePausarPicking}>
                  <Pause className="h-4 w-4 mr-2" />
                  Pausar mi Picking
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {pickers.length === 0 ? (
              <p className="text-muted-foreground text-sm">No hay pickers asignados todavía</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {pickers.map(picker => (
                  <Badge 
                    key={picker.id} 
                    variant={picker.estado === "activo" ? "default" : "secondary"}
                    className="py-1 px-3"
                  >
                    <User className="h-3 w-3 mr-1" />
                    {picker.profile?.nombre} {picker.profile?.apellido?.[0]}.
                    <span className="ml-2 opacity-70">({picker.items_pickeados} items)</span>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Search */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Buscar por código, descripción o ubicación..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Items Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ubicación</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-center">Cantidad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Picker</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No hay items en este listado
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map(item => (
                  <TableRow 
                    key={item.id}
                    className={
                      item.estado === "pickeado" ? "bg-green-50 dark:bg-green-950/20" :
                      item.estado === "en_picking" ? "bg-blue-50 dark:bg-blue-950/20" :
                      item.estado === "no_disponible" ? "bg-orange-50 dark:bg-orange-950/20" :
                      ""
                    }
                  >
                    <TableCell className="font-mono text-sm">
                      {item.ubicacion_origen || "-"}
                    </TableCell>
                    <TableCell className="font-medium">{item.codigo_repuesto}</TableCell>
                    <TableCell className="max-w-xs truncate">{item.descripcion || "-"}</TableCell>
                    <TableCell className="text-center">
                      {item.estado === "pickeado" ? (
                        <span className="font-semibold text-green-600">{item.cantidad_pickeada}</span>
                      ) : (
                        item.cantidad_sugerida
                      )}
                    </TableCell>
                    <TableCell>
                      {item.estado === "pendiente" && (
                        <Badge variant="secondary">
                          <Clock className="h-3 w-3 mr-1" />
                          Pendiente
                        </Badge>
                      )}
                      {item.estado === "en_picking" && (
                        <Badge className="bg-blue-500">
                          <Package className="h-3 w-3 mr-1" />
                          En Picking
                        </Badge>
                      )}
                      {item.estado === "pickeado" && (
                        <Badge className="bg-green-500">
                          <Check className="h-3 w-3 mr-1" />
                          Pickeado
                        </Badge>
                      )}
                      {item.estado === "no_disponible" && (
                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                          <X className="h-3 w-3 mr-1" />
                          No Disponible
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.picker_asignado_id && (
                        <span className="text-sm text-muted-foreground">
                          {getPickerName(item.picker_asignado_id)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {processingItem === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                      ) : listado.estado === "en_picking" && (
                        <>
                          {item.estado === "pendiente" && isPickerActivo && (
                            <Button size="sm" onClick={() => handleTomarItem(item.id)}>
                              Tomar
                            </Button>
                          )}
                          {item.estado === "en_picking" && item.picker_asignado_id === currentUser?.id && (
                            <div className="flex items-center gap-1 justify-end">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleMarcarNoDisponible(item.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                              <Button 
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleConfirmarItem(item.id, item.cantidad_sugerida)}
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Confirmar
                              </Button>
                            </div>
                          )}
                          {item.estado === "en_picking" && item.picker_asignado_id !== currentUser?.id && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleLiberarItem(item.id)}
                            >
                              Liberar
                            </Button>
                          )}
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <AlertDialog open={confirmPublicar} onOpenChange={setConfirmPublicar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Publicar listado?</AlertDialogTitle>
            <AlertDialogDescription>
              Al publicar, los pickers podrán comenzar a recolectar los items. 
              Ya no podrás editar el listado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublicarListado}>
              Publicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
