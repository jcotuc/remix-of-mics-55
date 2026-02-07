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
import { toast } from "sonner";
import { formatFechaRelativa, formatLogEntry, formatFechaCorta } from "@/utils/dateFormatters";
import type { IncidenteSchema, ClienteSchema } from "@/generated/entities";
import { mycsapi } from "@/mics-api";

interface IncidenteReparado {
  id: number;
  codigo: string;
  cliente_id: number;
  producto_id: number | null;
  quiere_envio: boolean | null;
  updated_at: string | null;
  descripcion_problema: string | null;
}

interface IncidenteDepuracion {
  id: number;
  codigo: string;
  cliente_id: number;
  producto_id: number | null;
  estado: string;
  updated_at: string | null;
  descripcion_problema: string | null;
}

interface SolicitudDespachada {
  id: number;
  incidente_id: number;
  tecnico_solicitante: string | null;
  repuestos: any;
  estado: string;
  updated_at: string;
  incidente_codigo: string | null;
  incidente_producto_id: number | null;
}

interface ClienteMap {
  [id: number]: { nombre: string; celular: string | null };
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
  const [selectedMostrador, setSelectedMostrador] = useState<Set<number>>(new Set());
  const [selectedLogistica, setSelectedLogistica] = useState<Set<number>>(new Set());
  const [selectedDepuracion, setSelectedDepuracion] = useState<Set<number>>(new Set());
  const [selectedRepuestos, setSelectedRepuestos] = useState<Set<number>>(new Set());
  
  // Dialog states
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmingType, setConfirmingType] = useState<"mostrador" | "logistica" | "depuracion" | "repuestos" | null>(null);
  const [observaciones, setObservaciones] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch recolección data using apiBackendAction
  const fetchIncidentes = async () => {
    try {
      const [incidentesRes, clientesRes] = await Promise.all([
        mycsapi.get("/api/v1/incidentes", { query: { limit: 2000 } }),
        mycsapi.get("/api/v1/clientes", { query: { limit: 5000 } }),
      ]);

      const allIncidentes = (incidentesRes.results || []) as any[];
      const allClientes = (clientesRes.results || []) as any[];

      // Filter REPARADO and sort by updated_at
      const reparados = allIncidentes
        .filter(i => i.estado === "REPARADO")
        .sort((a, b) => {
          const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
          const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
          return dateA - dateB;
        });

      const mapped: IncidenteReparado[] = reparados.map(i => {
        const iAny = i as any;
        return {
          id: i.id,
          codigo: i.codigo,
          cliente_id: iAny.cliente_id || iAny.cliente?.id || 0,
          producto_id: iAny.producto_id || iAny.producto?.id || null,
          quiere_envio: i.quiere_envio ?? null,
          updated_at: i.updated_at || null,
          descripcion_problema: i.descripcion_problema || null,
        };
      });

      setIncidentes(mapped);
      setSelectedMostrador(new Set());
      setSelectedLogistica(new Set());

      // Build clientes map
      const clientesMap: ClienteMap = {};
      allClientes.forEach(c => {
        clientesMap[c.id] = { nombre: c.nombre, celular: c.celular || null };
      });
      setClientes(prev => ({ ...prev, ...clientesMap }));
    } catch (error) {
      console.error("Error fetching incidentes:", error);
      toast.error("Error al cargar incidentes reparados");
    }
  };

  // Fetch depuración data (NC, Cambio por garantía resueltos) using apiBackendAction
  const fetchDepuracion = async () => {
    try {
      const incidentesRes = await mycsapi.get("/api/v1/incidentes", { query: { limit: 2000 } }) as any;
      const allIncidentes = (incidentesRes.results || []) as IncidenteSchema[];

      // Filter NC and Cambio por garantía
      const filtered = allIncidentes
        .filter(i => i.estado === "NOTA_DE_CREDITO" || i.estado === "CAMBIO_POR_GARANTIA")
        .sort((a, b) => {
          const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
          const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
          return dateB - dateA; // descending
        });

      const mapped: IncidenteDepuracion[] = filtered.map(i => {
        const iAny = i as any;
        return {
          id: i.id,
          codigo: i.codigo,
          cliente_id: iAny.cliente_id || iAny.cliente?.id || 0,
          producto_id: iAny.producto_id || iAny.producto?.id || null,
          estado: i.estado,
          updated_at: i.updated_at || null,
          descripcion_problema: i.descripcion_problema || null,
        };
      });

      setIncidentesDepuracion(mapped);
      setSelectedDepuracion(new Set());
    } catch (error) {
      console.error("Error fetching depuración:", error);
    }
  };

  // Fetch rechazados using apiBackendAction
  const fetchRechazados = async () => {
    try {
      const incidentesRes = await mycsapi.get("/api/v1/incidentes", { query: { limit: 2000 } }) as any;
      const allIncidentes = (incidentesRes.results || []) as IncidenteSchema[];

      // Filter RECHAZADO
      const filtered = allIncidentes
        .filter(i => i.estado === "RECHAZADO")
        .sort((a, b) => {
          const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
          const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
          return dateB - dateA; // descending
        });

      const mapped: IncidenteDepuracion[] = filtered.map(i => {
        const iAny = i as any;
        return {
          id: i.id,
          codigo: i.codigo,
          cliente_id: iAny.cliente_id || iAny.cliente?.id || 0,
          producto_id: iAny.producto_id || iAny.producto?.id || null,
          estado: i.estado,
          updated_at: i.updated_at || null,
          descripcion_problema: i.descripcion_problema || null,
        };
      });

      setIncidentesRechazados(mapped);
    } catch (error) {
      console.error("Error fetching rechazados:", error);
    }
  };

  // Fetch solicitudes despachadas (repuestos listos para recoger) using apiBackendAction
  const fetchSolicitudesDespachadas = async () => {
    try {
      // Fetch solicitudes using apiBackendAction
      const solicitudesResult = await mycsapi.fetch("/api/v1/solicitudes-repuestos/search", { method: "GET", query: { estado: "DESPACHADO" } }) as any;
      const rawData = (solicitudesResult.results || []) as any[];
      
      // Get unique incidente_ids
      const incidenteIds = [...new Set(rawData.map(s => s.incidente_id as number))];
      
      // Fetch incidentes data using apiBackendAction
      let incidentesMap: Record<number, { codigo: string; producto_id: number | null }> = {};
      if (incidenteIds.length > 0) {
        const incidentesResult = await mycsapi.get("/api/v1/incidentes", { query: { limit: 2000 } }) as any;
        (incidentesResult.results || []).forEach((inc: any) => {
          if (incidenteIds.includes(inc.id)) {
            incidentesMap[inc.id] = { codigo: inc.codigo, producto_id: inc.producto?.id || null };
          }
        });
      }

      const formatted: SolicitudDespachada[] = rawData.map(s => ({
        id: s.id,
        incidente_id: s.incidente_id,
        tecnico_solicitante: null,
        repuestos: s.repuestos,
        estado: s.estado,
        updated_at: s.updated_at,
        incidente_codigo: incidentesMap[s.incidente_id]?.codigo || null,
        incidente_producto_id: incidentesMap[s.incidente_id]?.producto_id || null,
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
        inc.producto_id?.toString().includes(filtroTexto.toLowerCase()) ||
        clientes[inc.cliente_id]?.nombre?.toLowerCase().includes(filtroTexto.toLowerCase());
      
      if (matchesFilter) {
        if (!inc.quiere_envio) {
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
        inc.producto_id?.toString().includes(filtroTexto.toLowerCase()) ||
        clientes[inc.cliente_id]?.nombre?.toLowerCase().includes(filtroTexto.toLowerCase());
    });
  }, [incidentesDepuracion, filtroTexto, clientes]);

  // Filter rechazados
  const rechazadosFiltrados = useMemo(() => {
    return incidentesRechazados.filter(inc => {
      return !filtroTexto || 
        inc.codigo.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        inc.producto_id?.toString().includes(filtroTexto.toLowerCase()) ||
        clientes[inc.cliente_id]?.nombre?.toLowerCase().includes(filtroTexto.toLowerCase());
    });
  }, [incidentesRechazados, filtroTexto, clientes]);

  // Filter solicitudes
  const solicitudesFiltradas = useMemo(() => {
    return solicitudesDespachadas.filter(sol => {
      return !filtroTexto || 
        sol.incidente_codigo?.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        sol.tecnico_solicitante?.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        sol.incidente_producto_id?.toString().includes(filtroTexto.toLowerCase());
    });
  }, [solicitudesDespachadas, filtroTexto]);

  const getTiempoEspera = (updatedAt: string | null) => {
    if (!updatedAt) return "N/A";
    return formatFechaRelativa(updatedAt).replace(/^hace /, "");
  };

  // Toggle selection handlers
  const toggleSelectMostrador = (id: number) => {
    const newSet = new Set(selectedMostrador);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setSelectedMostrador(newSet);
  };

  const toggleSelectLogistica = (id: number) => {
    const newSet = new Set(selectedLogistica);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setSelectedLogistica(newSet);
  };

  const toggleSelectDepuracion = (id: number) => {
    const newSet = new Set(selectedDepuracion);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setSelectedDepuracion(newSet);
  };

  const toggleSelectRepuestos = (id: number) => {
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

  // Batch handlers using apiBackendAction
  const handleBatchDelivery = async () => {
    if (!confirmingType) return;
    
    setSubmitting(true);
    try {
      if (confirmingType === "mostrador" || confirmingType === "logistica") {
        const selectedIds = confirmingType === "mostrador" 
          ? Array.from(selectedMostrador) 
          : Array.from(selectedLogistica);
        
        const nuevoEstado = confirmingType === "mostrador" ? "COMPLETADO" : "EN_ENTREGA";
        const destinoLabel = confirmingType === "mostrador" ? "Mostrador" : "Logística";
        
        const logEntry = formatLogEntry(`Waterspider: Entregado a ${destinoLabel}${observaciones ? ` - ${observaciones}` : ''}`);
        
        for (const incId of selectedIds) {
          // Get current observaciones
          const incResult = await mycsapi.get("/api/v1/incidentes/{incidente_id}", { path: { incidente_id: incId } }) as any;
          const currentObs = incResult.result?.observaciones || "";
          const newObs = currentObs ? `${currentObs}\n${logEntry}` : logEntry;
          
          // Cast to any to allow full update - handler supports all fields
          await mycsapi.patch("/api/v1/incidentes/{incidente_id}", {
            path: { incidente_id: incId },
            body: {
              estado: nuevoEstado,
              observaciones: newObs,
              updated_at: new Date().toISOString()
            } as any
          }) as any;
        }

        toast.success(`${selectedIds.length} incidente(s) entregados a ${destinoLabel}`);
      } else if (confirmingType === "depuracion") {
        const selectedIds = Array.from(selectedDepuracion);
        
        const logEntry = formatLogEntry(`Waterspider: Máquina depurada/descartada${observaciones ? ` - ${observaciones}` : ''}`);
        
        for (const incId of selectedIds) {
          const incResult = await mycsapi.get("/api/v1/incidentes/{incidente_id}", { path: { incidente_id: incId } }) as any;
          const currentObs = incResult.result?.observaciones || "";
          const newObs = currentObs ? `${currentObs}\n${logEntry}` : logEntry;
          
          await mycsapi.patch("/api/v1/incidentes/{incidente_id}", { path: { incidente_id: incId }, body: { observaciones: newObs } as any }) as any;
        }

        toast.success(`${selectedIds.length} máquina(s) marcadas como depuradas`);
      } else if (confirmingType === "repuestos") {
        const selectedIds = Array.from(selectedRepuestos);
        
        for (const solId of selectedIds) {
          await mycsapi.fetch("/api/v1/solicitudes-repuestos/{id}".replace("{id}", String(solId)), {
            method: "PATCH",
            body: {
              estado: "EN_PROCESO",
              updated_at: new Date().toISOString()
            }
          }) as any;
        }

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

  // Card component for incidents
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

    const clienteNombre = clientes[inc.cliente_id]?.nombre || `Cliente #${inc.cliente_id}`;

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
                  {showStatus && 'estado' in inc && (
                    <Badge variant="outline" className="text-xs">
                      {inc.estado}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs shrink-0">
                    <Clock className="w-3 h-3 mr-1" />
                    {getTiempoEspera(inc.updated_at)}
                  </Badge>
                </div>
              </div>
              <p className="text-sm font-medium text-foreground truncate mt-1">
                {clienteNombre}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                Producto #{inc.producto_id || 'N/A'}
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
                              <TableCell>{clientes[inc.cliente_id]?.nombre || `Cliente #${inc.cliente_id}`}</TableCell>
                              <TableCell>#{inc.producto_id || 'N/A'}</TableCell>
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
                                    <span className="font-bold text-sm">{sol.incidente_codigo || `Inc #${sol.incidente_id}`}</span>
                                    <Badge variant="outline" className="text-xs shrink-0">
                                      <Clock className="w-3 h-3 mr-1" />
                                      {getTiempoEspera(sol.updated_at)}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Técnico: {sol.tecnico_solicitante || 'N/A'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Producto #{sol.incidente_producto_id || 'N/A'}
                                  </p>
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

      {/* Confirm Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dialogConfig.icon}
              {dialogConfig.title}
            </DialogTitle>
            <DialogDescription>
              {dialogConfig.description}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Observaciones (opcional)</label>
            <Textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Agregar notas o comentarios..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handleBatchDelivery} disabled={submitting} className={dialogConfig.color}>
              {submitting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
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
