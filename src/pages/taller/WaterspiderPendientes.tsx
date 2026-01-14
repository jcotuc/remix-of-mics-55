import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Truck, Search, Clock, MapPin, Package, User, Calendar, RefreshCw, CheckCircle2, Square, CheckSquare, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface IncidenteReparado {
  id: string;
  codigo: string;
  codigo_cliente: string;
  codigo_producto: string;
  ingresado_en_mostrador: boolean | null;
  updated_at: string;
  descripcion_problema: string;
}

interface ClienteMap {
  [codigo: string]: { nombre: string; celular: string };
}

export default function WaterspiderPendientes() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [incidentes, setIncidentes] = useState<IncidenteReparado[]>([]);
  const [clientes, setClientes] = useState<ClienteMap>({});
  const [filtroTexto, setFiltroTexto] = useState("");
  
  // Selection states
  const [selectedMostrador, setSelectedMostrador] = useState<Set<string>>(new Set());
  const [selectedLogistica, setSelectedLogistica] = useState<Set<string>>(new Set());
  
  // Dialog states
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmingType, setConfirmingType] = useState<"mostrador" | "logistica" | null>(null);
  const [observaciones, setObservaciones] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchIncidentes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("incidentes")
        .select("id, codigo, codigo_cliente, codigo_producto, ingresado_en_mostrador, updated_at, descripcion_problema")
        .eq("status", "Reparado")
        .order("updated_at", { ascending: true });

      if (error) throw error;

      setIncidentes(data || []);
      setSelectedMostrador(new Set());
      setSelectedLogistica(new Set());

      // Fetch client data
      const codigosClientes = [...new Set((data || []).map(i => i.codigo_cliente))];
      if (codigosClientes.length > 0) {
        const { data: clientesData } = await supabase
          .from("clientes")
          .select("codigo, nombre, celular")
          .in("codigo", codigosClientes);

        const clientesMap: ClienteMap = {};
        (clientesData || []).forEach(c => {
          clientesMap[c.codigo] = { nombre: c.nombre, celular: c.celular };
        });
        setClientes(clientesMap);
      }
    } catch (error) {
      console.error("Error fetching incidentes:", error);
      toast.error("Error al cargar incidentes reparados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidentes();
  }, []);

  // Separate incidents by destination
  const { incidentesMostrador, incidentesLogistica } = useMemo(() => {
    const mostrador: IncidenteReparado[] = [];
    const logistica: IncidenteReparado[] = [];
    
    incidentes.forEach(inc => {
      const matchesFilter = !filtroTexto || 
        inc.codigo.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        inc.codigo_cliente.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        inc.codigo_producto.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        clientes[inc.codigo_cliente]?.nombre?.toLowerCase().includes(filtroTexto.toLowerCase());
      
      if (matchesFilter) {
        if (inc.ingresado_en_mostrador === true) {
          mostrador.push(inc);
        } else {
          logistica.push(inc);
        }
      }
    });
    
    return { incidentesMostrador: mostrador, incidentesLogistica: logistica };
  }, [incidentes, filtroTexto, clientes]);

  const getTiempoEspera = (updatedAt: string) => {
    return formatDistanceToNow(new Date(updatedAt), { locale: es, addSuffix: false });
  };

  // Toggle selection handlers
  const toggleSelectMostrador = (id: string) => {
    const newSet = new Set(selectedMostrador);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedMostrador(newSet);
  };

  const toggleSelectLogistica = (id: string) => {
    const newSet = new Set(selectedLogistica);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedLogistica(newSet);
  };

  const selectAllMostrador = () => {
    if (selectedMostrador.size === incidentesMostrador.length) {
      setSelectedMostrador(new Set());
    } else {
      setSelectedMostrador(new Set(incidentesMostrador.map(i => i.id)));
    }
  };

  const selectAllLogistica = () => {
    if (selectedLogistica.size === incidentesLogistica.length) {
      setSelectedLogistica(new Set());
    } else {
      setSelectedLogistica(new Set(incidentesLogistica.map(i => i.id)));
    }
  };

  // Batch delivery handler
  const handleBatchDelivery = async () => {
    if (!confirmingType) return;
    
    const selectedIds = confirmingType === "mostrador" 
      ? Array.from(selectedMostrador) 
      : Array.from(selectedLogistica);
    
    if (selectedIds.length === 0) {
      toast.error("Selecciona al menos un incidente");
      return;
    }

    setSubmitting(true);
    try {
      const nuevoStatus = confirmingType === "mostrador" ? "Pendiente entrega" : "Logistica envio";
      const destinoLabel = confirmingType === "mostrador" ? "Mostrador" : "Logística";
      
      // Update all selected incidents
      const { error } = await supabase
        .from("incidentes")
        .update({ 
          status: nuevoStatus,
          updated_at: new Date().toISOString()
        })
        .in("id", selectedIds);

      if (error) throw error;

      // Update logs for each incident
      const logEntry = `[${format(new Date(), "dd/MM/yyyy HH:mm")}] Waterspider: Entregado a ${destinoLabel}${observaciones ? ` - ${observaciones}` : ''}`;
      
      for (const incId of selectedIds) {
        const { data: currentInc } = await supabase
          .from("incidentes")
          .select("log_observaciones")
          .eq("id", incId)
          .single();

        const newLog = currentInc?.log_observaciones 
          ? `${currentInc.log_observaciones}\n${logEntry}` 
          : logEntry;
        
        await supabase
          .from("incidentes")
          .update({ log_observaciones: newLog })
          .eq("id", incId);
      }

      toast.success(
        `${selectedIds.length} incidente(s) entregados a ${destinoLabel}`,
        { duration: 4000 }
      );
      
      setShowConfirmDialog(false);
      setObservaciones("");
      setConfirmingType(null);
      fetchIncidentes();
    } catch (error) {
      console.error("Error updating incidents:", error);
      toast.error("Error al confirmar las entregas");
    } finally {
      setSubmitting(false);
    }
  };

  const openConfirmDialog = (type: "mostrador" | "logistica") => {
    const count = type === "mostrador" ? selectedMostrador.size : selectedLogistica.size;
    if (count === 0) {
      toast.error("Selecciona al menos un incidente");
      return;
    }
    setConfirmingType(type);
    setShowConfirmDialog(true);
  };

  // Card component for each incident
  const IncidentCard = ({ 
    inc, 
    isSelected, 
    onToggle,
    colorScheme 
  }: { 
    inc: IncidenteReparado; 
    isSelected: boolean; 
    onToggle: () => void;
    colorScheme: "blue" | "orange";
  }) => {
    const bgSelected = colorScheme === "blue" 
      ? "bg-blue-100 dark:bg-blue-900/40 border-blue-400" 
      : "bg-orange-100 dark:bg-orange-900/40 border-orange-400";
    const bgNormal = colorScheme === "blue"
      ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 hover:border-blue-300"
      : "bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 hover:border-orange-300";

    return (
      <Card 
        className={`cursor-pointer transition-all border-2 ${isSelected ? bgSelected : bgNormal}`}
        onClick={onToggle}
      >
        <CardContent className="p-3">
          <div className="flex items-start gap-3">
            <Checkbox 
              checked={isSelected}
              onClick={(e) => e.stopPropagation()}
              onCheckedChange={onToggle}
              className="mt-1"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-sm">{inc.codigo}</span>
                <Badge variant="outline" className="text-xs shrink-0">
                  <Clock className="w-3 h-3 mr-1" />
                  {getTiempoEspera(inc.updated_at)}
                </Badge>
              </div>
              <p className="text-sm font-medium text-foreground truncate mt-1">
                {clientes[inc.codigo_cliente]?.nombre || inc.codigo_cliente}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {inc.codigo_producto}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" />
            Waterspider - Recolección
          </h1>
          <p className="text-muted-foreground text-sm">
            Selecciona las máquinas y entrega por lotes
          </p>
        </div>
        <Button onClick={fetchIncidentes} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por código, cliente o producto..."
          value={filtroTexto}
          onChange={(e) => setFiltroTexto(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Cargando...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* MOSTRADOR Section */}
          <Card className="border-2 border-blue-200 dark:border-blue-800">
            <CardHeader className="bg-blue-50 dark:bg-blue-950/30 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-blue-700 dark:text-blue-300">
                    Mostrador
                  </CardTitle>
                  <Badge className="bg-blue-500">{incidentesMostrador.length}</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAllMostrador}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                >
                  {selectedMostrador.size === incidentesMostrador.length && incidentesMostrador.length > 0 ? (
                    <>
                      <CheckSquare className="h-4 w-4 mr-1" />
                      Deseleccionar
                    </>
                  ) : (
                    <>
                      <Square className="h-4 w-4 mr-1" />
                      Seleccionar todo
                    </>
                  )}
                </Button>
              </div>
              <CardDescription>
                Máquinas para entregar al cliente en mostrador
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {incidentesMostrador.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hay máquinas para mostrador</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {incidentesMostrador.map((inc) => (
                      <IncidentCard
                        key={inc.id}
                        inc={inc}
                        isSelected={selectedMostrador.has(inc.id)}
                        onToggle={() => toggleSelectMostrador(inc.id)}
                        colorScheme="blue"
                      />
                    ))}
                  </div>
                  <Separator />
                  <Button
                    onClick={() => openConfirmDialog("mostrador")}
                    disabled={selectedMostrador.size === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Entregar a Mostrador ({selectedMostrador.size})
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* LOGISTICA Section */}
          <Card className="border-2 border-orange-200 dark:border-orange-800">
            <CardHeader className="bg-orange-50 dark:bg-orange-950/30 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-orange-600" />
                  <CardTitle className="text-orange-700 dark:text-orange-300">
                    Logística
                  </CardTitle>
                  <Badge className="bg-orange-500">{incidentesLogistica.length}</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAllLogistica}
                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                >
                  {selectedLogistica.size === incidentesLogistica.length && incidentesLogistica.length > 0 ? (
                    <>
                      <CheckSquare className="h-4 w-4 mr-1" />
                      Deseleccionar
                    </>
                  ) : (
                    <>
                      <Square className="h-4 w-4 mr-1" />
                      Seleccionar todo
                    </>
                  )}
                </Button>
              </div>
              <CardDescription>
                Máquinas para envío a domicilio
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {incidentesLogistica.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hay máquinas para logística</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {incidentesLogistica.map((inc) => (
                      <IncidentCard
                        key={inc.id}
                        inc={inc}
                        isSelected={selectedLogistica.has(inc.id)}
                        onToggle={() => toggleSelectLogistica(inc.id)}
                        colorScheme="orange"
                      />
                    ))}
                  </div>
                  <Separator />
                  <Button
                    onClick={() => openConfirmDialog("logistica")}
                    disabled={selectedLogistica.size === 0}
                    className="w-full bg-orange-600 hover:bg-orange-700 gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Entregar a Logística ({selectedLogistica.size})
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirmingType === "mostrador" ? (
                <User className="h-5 w-5 text-blue-600" />
              ) : (
                <Truck className="h-5 w-5 text-orange-600" />
              )}
              Confirmar Entrega a {confirmingType === "mostrador" ? "Mostrador" : "Logística"}
            </DialogTitle>
            <DialogDescription>
              Vas a entregar {confirmingType === "mostrador" ? selectedMostrador.size : selectedLogistica.size} máquina(s) 
              al área de {confirmingType === "mostrador" ? "Mostrador" : "Logística"}.
            </DialogDescription>
          </DialogHeader>
          
          {/* Selected items summary */}
          <div className="max-h-32 overflow-y-auto border rounded-md p-2 bg-muted/50">
            <p className="text-xs font-medium text-muted-foreground mb-1">Incidentes seleccionados:</p>
            <div className="flex flex-wrap gap-1">
              {(confirmingType === "mostrador" 
                ? incidentesMostrador.filter(i => selectedMostrador.has(i.id))
                : incidentesLogistica.filter(i => selectedLogistica.has(i.id))
              ).map(inc => (
                <Badge key={inc.id} variant="secondary" className="text-xs">
                  {inc.codigo}
                </Badge>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Observaciones (opcional)</label>
            <Textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ej: Entregado en buenas condiciones..."
              rows={2}
            />
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false);
                setObservaciones("");
              }}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleBatchDelivery}
              disabled={submitting}
              className={confirmingType === "mostrador" 
                ? "bg-blue-600 hover:bg-blue-700" 
                : "bg-orange-600 hover:bg-orange-700"
              }
            >
              {submitting ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirmar Entrega
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
