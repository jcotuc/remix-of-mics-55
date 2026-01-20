import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Truck, Search, Clock, Package, User, RefreshCw, CheckCircle2, Square, CheckSquare, ArrowRight, Trash2, XCircle, Bell, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatFechaRelativa, formatLogEntry, formatFechaCorta } from "@/utils/dateFormatters";

interface IncidenteReparado {
  id: string;
  codigo: string;
  codigo_cliente: string;
  codigo_producto: string;
  ingresado_en_mostrador: boolean | null;
  updated_at: string;
  descripcion_problema: string;
}

interface IncidenteDepuracion {
  id: string;
  codigo: string;
  codigo_cliente: string;
  codigo_producto: string;
  status: string;
  updated_at: string;
  descripcion_problema: string;
}

interface SolicitudDespachada {
  id: string;
  incidente_id: string;
  tecnico_solicitante: string;
  repuestos: any;
  estado: string;
  updated_at: string;
  incidente: {
    codigo: string;
    codigo_producto: string;
    codigo_tecnico: string | null;
  } | null;
}

interface ClienteMap {
  [codigo: string]: { nombre: string; celular: string };
}

export default function WaterspiderPendientes() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("recoleccion");
  const [loading, setLoading] = useState(true);
  const [incidentes, setIncidentes] = useState<IncidenteReparado[]>([]);
  const [incidentesDepuracion, setIncidentesDepuracion] = useState<IncidenteDepuracion[]>([]);
  const [incidentesRechazados, setIncidentesRechazados] = useState<IncidenteDepuracion[]>([]);
  const [solicitudesDespachadas, setSolicitudesDespachadas] = useState<SolicitudDespachada[]>([]);
  const [clientes, setClientes] = useState<ClienteMap>({});
  const [filtroTexto, setFiltroTexto] = useState("");
  
  // Selection states
  const [selectedMostrador, setSelectedMostrador] = useState<Set<string>>(new Set());
  const [selectedLogistica, setSelectedLogistica] = useState<Set<string>>(new Set());
  const [selectedDepuracion, setSelectedDepuracion] = useState<Set<string>>(new Set());
  const [selectedRepuestos, setSelectedRepuestos] = useState<Set<string>>(new Set());
  
  // Dialog states
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmingType, setConfirmingType] = useState<"mostrador" | "logistica" | "depuracion" | "repuestos" | null>(null);
  const [observaciones, setObservaciones] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch recolección data
  const fetchIncidentes = async () => {
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
        setClientes(prev => ({ ...prev, ...clientesMap }));
      }
    } catch (error) {
      console.error("Error fetching incidentes:", error);
      toast.error("Error al cargar incidentes reparados");
    }
  };

  // Fetch depuración data (NC, Cambio por garantía resueltos)
  const fetchDepuracion = async () => {
    try {
      const { data, error } = await supabase
        .from("incidentes")
        .select("id, codigo, codigo_cliente, codigo_producto, status, updated_at, descripcion_problema")
        .in("status", ["Nota de credito", "Cambio por garantia"])
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setIncidentesDepuracion(data || []);
      setSelectedDepuracion(new Set());

      // Fetch clients
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
        setClientes(prev => ({ ...prev, ...clientesMap }));
      }
    } catch (error) {
      console.error("Error fetching depuración:", error);
    }
  };

  // Fetch rechazados
  const fetchRechazados = async () => {
    try {
      const { data, error } = await supabase
        .from("incidentes")
        .select("id, codigo, codigo_cliente, codigo_producto, status, updated_at, descripcion_problema")
        .eq("status", "Rechazado")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setIncidentesRechazados(data || []);

      // Fetch clients
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
        setClientes(prev => ({ ...prev, ...clientesMap }));
      }
    } catch (error) {
      console.error("Error fetching rechazados:", error);
    }
  };

  // Fetch solicitudes despachadas (repuestos listos para recoger)
  const fetchSolicitudesDespachadas = async () => {
    try {
      const { data, error } = await supabase
        .from("solicitudes_repuestos")
        .select(`
          id, incidente_id, tecnico_solicitante, repuestos, estado, updated_at,
          incidentes!inner(codigo, codigo_producto, codigo_tecnico)
        `)
        .eq("estado", "entregado")
        .order("updated_at", { ascending: true });

      if (error) throw error;
      
      const formatted = (data || []).map(s => ({
        ...s,
        incidente: s.incidentes as any
      }));
      setSolicitudesDespachadas(formatted);
      setSelectedRepuestos(new Set());
    } catch (error) {
      console.error("Error fetching solicitudes:", error);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchIncidentes(),
      fetchDepuracion(),
      fetchRechazados(),
      fetchSolicitudesDespachadas()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAllData();
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

  // Filter depuracion
  const depuracionFiltrados = useMemo(() => {
    return incidentesDepuracion.filter(inc => {
      return !filtroTexto || 
        inc.codigo.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        inc.codigo_cliente.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        inc.codigo_producto.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        clientes[inc.codigo_cliente]?.nombre?.toLowerCase().includes(filtroTexto.toLowerCase());
    });
  }, [incidentesDepuracion, filtroTexto, clientes]);

  // Filter rechazados
  const rechazadosFiltrados = useMemo(() => {
    return incidentesRechazados.filter(inc => {
      return !filtroTexto || 
        inc.codigo.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        inc.codigo_cliente.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        inc.codigo_producto.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        clientes[inc.codigo_cliente]?.nombre?.toLowerCase().includes(filtroTexto.toLowerCase());
    });
  }, [incidentesRechazados, filtroTexto, clientes]);

  // Filter solicitudes
  const solicitudesFiltradas = useMemo(() => {
    return solicitudesDespachadas.filter(sol => {
      return !filtroTexto || 
        sol.incidente?.codigo?.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        sol.tecnico_solicitante?.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        sol.incidente?.codigo_producto?.toLowerCase().includes(filtroTexto.toLowerCase());
    });
  }, [solicitudesDespachadas, filtroTexto]);

  const getTiempoEspera = (updatedAt: string) => {
    return formatFechaRelativa(updatedAt).replace(/^hace /, "");
  };

  // Toggle selection handlers
  const toggleSelectMostrador = (id: string) => {
    const newSet = new Set(selectedMostrador);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setSelectedMostrador(newSet);
  };

  const toggleSelectLogistica = (id: string) => {
    const newSet = new Set(selectedLogistica);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setSelectedLogistica(newSet);
  };

  const toggleSelectDepuracion = (id: string) => {
    const newSet = new Set(selectedDepuracion);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setSelectedDepuracion(newSet);
  };

  const toggleSelectRepuestos = (id: string) => {
    const newSet = new Set(selectedRepuestos);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setSelectedRepuestos(newSet);
  };

  const selectAllMostrador = () => {
    setSelectedMostrador(selectedMostrador.size === incidentesMostrador.length ? new Set() : new Set(incidentesMostrador.map(i => i.id)));
  };

  const selectAllLogistica = () => {
    setSelectedLogistica(selectedLogistica.size === incidentesLogistica.length ? new Set() : new Set(incidentesLogistica.map(i => i.id)));
  };

  const selectAllDepuracion = () => {
    setSelectedDepuracion(selectedDepuracion.size === depuracionFiltrados.length ? new Set() : new Set(depuracionFiltrados.map(i => i.id)));
  };

  const selectAllRepuestos = () => {
    setSelectedRepuestos(selectedRepuestos.size === solicitudesFiltradas.length ? new Set() : new Set(solicitudesFiltradas.map(i => i.id)));
  };

  // Batch handlers
  const handleBatchDelivery = async () => {
    if (!confirmingType) return;
    
    setSubmitting(true);
    try {
      if (confirmingType === "mostrador" || confirmingType === "logistica") {
        const selectedIds = confirmingType === "mostrador" 
          ? Array.from(selectedMostrador) 
          : Array.from(selectedLogistica);
        
        const nuevoStatus = confirmingType === "mostrador" ? "Pendiente entrega" : "Logistica envio";
        const destinoLabel = confirmingType === "mostrador" ? "Mostrador" : "Logística";
        
        const { error } = await supabase
          .from("incidentes")
          .update({ status: nuevoStatus, updated_at: new Date().toISOString() })
          .in("id", selectedIds);

        if (error) throw error;

        const logEntry = formatLogEntry(`Waterspider: Entregado a ${destinoLabel}${observaciones ? ` - ${observaciones}` : ''}`);
        
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

        toast.success(`${selectedIds.length} incidente(s) entregados a ${destinoLabel}`);
      } else if (confirmingType === "depuracion") {
        const selectedIds = Array.from(selectedDepuracion);
        
        // Mark as "depurado" - could add a new status or just log it
        const logEntry = formatLogEntry(`Waterspider: Máquina depurada/descartada${observaciones ? ` - ${observaciones}` : ''}`);
        
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

        toast.success(`${selectedIds.length} máquina(s) marcadas como depuradas`);
      } else if (confirmingType === "repuestos") {
        const selectedIds = Array.from(selectedRepuestos);
        
        // Mark solicitudes as "recogido" by waterspider
        const { error } = await supabase
          .from("solicitudes_repuestos")
          .update({ 
            estado: "en_proceso",
            updated_at: new Date().toISOString()
          })
          .in("id", selectedIds);

        if (error) throw error;

        toast.success(`${selectedIds.length} solicitud(es) de repuestos recogidas`);
      }
      
      setShowConfirmDialog(false);
      setObservaciones("");
      setConfirmingType(null);
      fetchAllData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al procesar la operación");
    } finally {
      setSubmitting(false);
    }
  };

  const openConfirmDialog = (type: "mostrador" | "logistica" | "depuracion" | "repuestos") => {
    let count = 0;
    if (type === "mostrador") count = selectedMostrador.size;
    else if (type === "logistica") count = selectedLogistica.size;
    else if (type === "depuracion") count = selectedDepuracion.size;
    else if (type === "repuestos") count = selectedRepuestos.size;
    
    if (count === 0) {
      toast.error("Selecciona al menos un elemento");
      return;
    }
    setConfirmingType(type);
    setShowConfirmDialog(true);
  };

  const getDialogConfig = () => {
    switch (confirmingType) {
      case "mostrador":
        return { 
          title: "Entregar a Mostrador", 
          description: `${selectedMostrador.size} máquina(s) al área de Mostrador`,
          icon: <User className="h-5 w-5 text-blue-600" />,
          color: "bg-blue-600 hover:bg-blue-700"
        };
      case "logistica":
        return { 
          title: "Entregar a Logística", 
          description: `${selectedLogistica.size} máquina(s) al área de Logística`,
          icon: <Truck className="h-5 w-5 text-orange-600" />,
          color: "bg-orange-600 hover:bg-orange-700"
        };
      case "depuracion":
        return { 
          title: "Confirmar Depuración", 
          description: `${selectedDepuracion.size} máquina(s) serán marcadas como depuradas/descartadas`,
          icon: <Trash2 className="h-5 w-5 text-red-600" />,
          color: "bg-red-600 hover:bg-red-700"
        };
      case "repuestos":
        return { 
          title: "Recoger Repuestos", 
          description: `${selectedRepuestos.size} solicitud(es) de repuestos para llevar a técnicos`,
          icon: <Wrench className="h-5 w-5 text-green-600" />,
          color: "bg-green-600 hover:bg-green-700"
        };
      default:
        return { title: "", description: "", icon: null, color: "" };
    }
  };

  // Card component
  const IncidentCard = ({ 
    inc, 
    isSelected, 
    onToggle,
    colorScheme,
    showStatus = false
  }: { 
    inc: IncidenteReparado | IncidenteDepuracion; 
    isSelected: boolean; 
    onToggle: () => void;
    colorScheme: "blue" | "orange" | "red" | "gray";
    showStatus?: boolean;
  }) => {
    const colors = {
      blue: { selected: "bg-blue-100 dark:bg-blue-900/40 border-blue-400", normal: "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 hover:border-blue-300" },
      orange: { selected: "bg-orange-100 dark:bg-orange-900/40 border-orange-400", normal: "bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 hover:border-orange-300" },
      red: { selected: "bg-red-100 dark:bg-red-900/40 border-red-400", normal: "bg-red-50/50 dark:bg-red-950/20 border-red-200 hover:border-red-300" },
      gray: { selected: "bg-gray-100 dark:bg-gray-800 border-gray-400", normal: "bg-gray-50/50 dark:bg-gray-900/20 border-gray-200 hover:border-gray-300" },
    };

    return (
      <Card 
        className={`cursor-pointer transition-all border-2 ${isSelected ? colors[colorScheme].selected : colors[colorScheme].normal}`}
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
                <div className="flex items-center gap-1">
                  {showStatus && 'status' in inc && (
                    <Badge variant="outline" className="text-xs">
                      {inc.status}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs shrink-0">
                    <Clock className="w-3 h-3 mr-1" />
                    {getTiempoEspera(inc.updated_at)}
                  </Badge>
                </div>
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

  const dialogConfig = getDialogConfig();

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" />
            Waterspider
          </h1>
          <p className="text-muted-foreground text-sm">
            Gestión de entregas, depuración y repuestos
          </p>
        </div>
        <Button onClick={fetchAllData} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="recoleccion" className="gap-1">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Recolección</span>
            <Badge variant="secondary" className="ml-1">{incidentes.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="depuracion" className="gap-1">
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Depuración</span>
            <Badge variant="secondary" className="ml-1">{incidentesDepuracion.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="rechazados" className="gap-1">
            <XCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Rechazados</span>
            <Badge variant="secondary" className="ml-1">{incidentesRechazados.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="repuestos" className="gap-1">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Repuestos</span>
            <Badge variant="secondary" className="ml-1">{solicitudesDespachadas.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Search */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
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
          <>
            {/* TAB: Recolección */}
            <TabsContent value="recoleccion" className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* MOSTRADOR Section */}
                <Card className="border-2 border-blue-200 dark:border-blue-800">
                  <CardHeader className="bg-blue-50 dark:bg-blue-950/30 pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-5 w-5 text-blue-600" />
                        <CardTitle className="text-blue-700 dark:text-blue-300">Mostrador</CardTitle>
                        <Badge className="bg-blue-500">{incidentesMostrador.length}</Badge>
                      </div>
                      <Button variant="ghost" size="sm" onClick={selectAllMostrador} className="text-blue-600 hover:bg-blue-100">
                        {selectedMostrador.size === incidentesMostrador.length && incidentesMostrador.length > 0 ? <CheckSquare className="h-4 w-4 mr-1" /> : <Square className="h-4 w-4 mr-1" />}
                        {selectedMostrador.size === incidentesMostrador.length && incidentesMostrador.length > 0 ? "Deseleccionar" : "Seleccionar todo"}
                      </Button>
                    </div>
                    <CardDescription>Máquinas para entregar al cliente en mostrador</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    {incidentesMostrador.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No hay máquinas para mostrador</p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                          {incidentesMostrador.map((inc) => (
                            <IncidentCard key={inc.id} inc={inc} isSelected={selectedMostrador.has(inc.id)} onToggle={() => toggleSelectMostrador(inc.id)} colorScheme="blue" />
                          ))}
                        </div>
                        <Separator />
                        <Button onClick={() => openConfirmDialog("mostrador")} disabled={selectedMostrador.size === 0} className="w-full bg-blue-600 hover:bg-blue-700 gap-2">
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
                        <CardTitle className="text-orange-700 dark:text-orange-300">Logística</CardTitle>
                        <Badge className="bg-orange-500">{incidentesLogistica.length}</Badge>
                      </div>
                      <Button variant="ghost" size="sm" onClick={selectAllLogistica} className="text-orange-600 hover:bg-orange-100">
                        {selectedLogistica.size === incidentesLogistica.length && incidentesLogistica.length > 0 ? <CheckSquare className="h-4 w-4 mr-1" /> : <Square className="h-4 w-4 mr-1" />}
                        {selectedLogistica.size === incidentesLogistica.length && incidentesLogistica.length > 0 ? "Deseleccionar" : "Seleccionar todo"}
                      </Button>
                    </div>
                    <CardDescription>Máquinas para envío a domicilio</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    {incidentesLogistica.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No hay máquinas para logística</p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                          {incidentesLogistica.map((inc) => (
                            <IncidentCard key={inc.id} inc={inc} isSelected={selectedLogistica.has(inc.id)} onToggle={() => toggleSelectLogistica(inc.id)} colorScheme="orange" />
                          ))}
                        </div>
                        <Separator />
                        <Button onClick={() => openConfirmDialog("logistica")} disabled={selectedLogistica.size === 0} className="w-full bg-orange-600 hover:bg-orange-700 gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Entregar a Logística ({selectedLogistica.size})
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* TAB: Depuración */}
            <TabsContent value="depuracion" className="mt-4">
              <Card className="border-2 border-red-200 dark:border-red-800">
                <CardHeader className="bg-red-50 dark:bg-red-950/30 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trash2 className="h-5 w-5 text-red-600" />
                      <CardTitle className="text-red-700 dark:text-red-300">Depuración de Máquinas</CardTitle>
                      <Badge className="bg-red-500">{depuracionFiltrados.length}</Badge>
                    </div>
                    <Button variant="ghost" size="sm" onClick={selectAllDepuracion} className="text-red-600 hover:bg-red-100">
                      {selectedDepuracion.size === depuracionFiltrados.length && depuracionFiltrados.length > 0 ? <CheckSquare className="h-4 w-4 mr-1" /> : <Square className="h-4 w-4 mr-1" />}
                      {selectedDepuracion.size === depuracionFiltrados.length && depuracionFiltrados.length > 0 ? "Deseleccionar" : "Seleccionar todo"}
                    </Button>
                  </div>
                  <CardDescription>Máquinas con Nota de Crédito o Cambio por Garantía - listas para depurar/descartar</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  {depuracionFiltrados.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No hay máquinas para depurar</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto pr-1">
                        {depuracionFiltrados.map((inc) => (
                          <IncidentCard key={inc.id} inc={inc} isSelected={selectedDepuracion.has(inc.id)} onToggle={() => toggleSelectDepuracion(inc.id)} colorScheme="red" showStatus />
                        ))}
                      </div>
                      <Separator />
                      <Button onClick={() => openConfirmDialog("depuracion")} disabled={selectedDepuracion.size === 0} variant="destructive" className="w-full gap-2">
                        <Trash2 className="h-4 w-4" />
                        Marcar como Depuradas ({selectedDepuracion.size})
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: Rechazados */}
            <TabsContent value="rechazados" className="mt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-gray-600" />
                    <CardTitle>Presupuestos/Canjes Rechazados</CardTitle>
                    <Badge variant="secondary">{rechazadosFiltrados.length}</Badge>
                  </div>
                  <CardDescription>Incidentes donde el cliente rechazó el presupuesto o canje</CardDescription>
                </CardHeader>
                <CardContent>
                  {rechazadosFiltrados.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No hay incidentes rechazados</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Producto</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Acción</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rechazadosFiltrados.map((inc) => (
                            <TableRow key={inc.id}>
                              <TableCell className="font-medium">{inc.codigo}</TableCell>
                              <TableCell>{clientes[inc.codigo_cliente]?.nombre || inc.codigo_cliente}</TableCell>
                              <TableCell>{inc.codigo_producto}</TableCell>
                              <TableCell>{formatFechaCorta(inc.updated_at)}</TableCell>
                              <TableCell>
                                <Button size="sm" variant="outline" onClick={() => navigate(`/incidentes/${inc.id}`)}>
                                  Ver detalle
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: Repuestos */}
            <TabsContent value="repuestos" className="mt-4">
              <Card className="border-2 border-green-200 dark:border-green-800">
                <CardHeader className="bg-green-50 dark:bg-green-950/30 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="h-5 w-5 text-green-600" />
                      <CardTitle className="text-green-700 dark:text-green-300">Repuestos Despachados</CardTitle>
                      <Badge className="bg-green-500">{solicitudesFiltradas.length}</Badge>
                    </div>
                    <Button variant="ghost" size="sm" onClick={selectAllRepuestos} className="text-green-600 hover:bg-green-100">
                      {selectedRepuestos.size === solicitudesFiltradas.length && solicitudesFiltradas.length > 0 ? <CheckSquare className="h-4 w-4 mr-1" /> : <Square className="h-4 w-4 mr-1" />}
                      {selectedRepuestos.size === solicitudesFiltradas.length && solicitudesFiltradas.length > 0 ? "Deseleccionar" : "Seleccionar todo"}
                    </Button>
                  </div>
                  <CardDescription>Repuestos listos en bodega para llevar a los técnicos</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  {solicitudesFiltradas.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No hay repuestos despachados pendientes</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                        {solicitudesFiltradas.map((sol) => (
                          <Card 
                            key={sol.id}
                            className={`cursor-pointer transition-all border-2 ${selectedRepuestos.has(sol.id) ? 'bg-green-100 dark:bg-green-900/40 border-green-400' : 'bg-green-50/50 dark:bg-green-950/20 border-green-200 hover:border-green-300'}`}
                            onClick={() => toggleSelectRepuestos(sol.id)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start gap-3">
                                <Checkbox 
                                  checked={selectedRepuestos.has(sol.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  onCheckedChange={() => toggleSelectRepuestos(sol.id)}
                                  className="mt-1"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-bold text-sm">{sol.incidente?.codigo || "Sin incidente"}</span>
                                    <Badge variant="outline" className="text-xs shrink-0 bg-green-100 text-green-700">
                                      <Wrench className="w-3 h-3 mr-1" />
                                      {Array.isArray(sol.repuestos) ? sol.repuestos.length : 0} repuesto(s)
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-foreground mt-1">
                                    Técnico: <span className="font-medium">{sol.tecnico_solicitante || "No especificado"}</span>
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {sol.incidente?.codigo_producto}
                                  </p>
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {Array.isArray(sol.repuestos) && sol.repuestos.slice(0, 3).map((rep: any, idx: number) => (
                                      <Badge key={idx} variant="secondary" className="text-xs">
                                        {rep.codigo || rep.codigo_repuesto}
                                      </Badge>
                                    ))}
                                    {Array.isArray(sol.repuestos) && sol.repuestos.length > 3 && (
                                      <Badge variant="secondary" className="text-xs">+{sol.repuestos.length - 3}</Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      <Separator />
                      <Button onClick={() => openConfirmDialog("repuestos")} disabled={selectedRepuestos.size === 0} className="w-full bg-green-600 hover:bg-green-700 gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Recoger Repuestos ({selectedRepuestos.size})
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dialogConfig.icon}
              {dialogConfig.title}
            </DialogTitle>
            <DialogDescription>{dialogConfig.description}</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Observaciones (opcional)</label>
            <Textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Agregar observaciones..."
              rows={2}
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowConfirmDialog(false); setObservaciones(""); }} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handleBatchDelivery} disabled={submitting} className={dialogConfig.color}>
              {submitting ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirmar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
