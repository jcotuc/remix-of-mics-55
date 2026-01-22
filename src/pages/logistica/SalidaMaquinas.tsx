import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Truck, 
  Search, 
  RefreshCw, 
  Clock, 
  Package,
  MapPin,
  User,
  Send,
  Eye,
  CheckCircle
} from "lucide-react";
import { apiBackendAction } from "@/lib/api-backend";
import { DetalleDespachoSheet } from "@/components/features/logistica";
import type { IncidenteSchema, ClienteSchema, GuiaInDBSchema } from "@/generated/entities";

export type IncidenteEnriquecido = IncidenteSchema & {
  clienteNombre: string;
  clienteCelular: string;
  clienteDireccion: string;
  guiaInfo?: GuiaInDBSchema | null;
  diasEspera: number;
};

type TabType = "por_despachar" | "en_ruta" | "para_recoger" | "exceso_dias";

export default function SalidaMaquinas() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [incidentes, setIncidentes] = useState<IncidenteEnriquecido[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>(
    (searchParams.get("tab") as TabType) || "por_despachar"
  );
  const [selectedIncidente, setSelectedIncidente] = useState<IncidenteEnriquecido | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Calcular días de espera
  const calcularDiasEspera = (updatedAt: string | null | undefined): number => {
    if (!updatedAt) return 0;
    const now = new Date();
    const updated = new Date(updatedAt);
    const diffTime = Math.abs(now.getTime() - updated.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch en paralelo: incidentes, clientes y guías
      const [incidentesRes, clientesRes, guiasRes] = await Promise.all([
        apiBackendAction("incidentes.list", { limit: 2000 }),
        apiBackendAction("clientes.list", { limit: 5000 }),
        apiBackendAction("guias.list", {})
      ]);

      const todosIncidentes = incidentesRes.results || [];
      const clientes = clientesRes.results || [];
      const guias = guiasRes.results || [];

      // Crear mapas para lookup rápido
      const clienteMap = new Map<number, ClienteSchema>();
      clientes.forEach((c: ClienteSchema) => clienteMap.set(c.id, c));

      const guiaMap = new Map<number, GuiaInDBSchema>();
      guias.forEach((g: GuiaInDBSchema) => {
        if (g.incidente_id) guiaMap.set(g.incidente_id, g);
      });

      // Filtrar estados relevantes
      const estadosRelevantes = ["REPARADO", "RECHAZADO", "CAMBIO_POR_GARANTIA", "EN_ENTREGA"];
      
      const incidentesFiltrados = todosIncidentes
        .filter((inc: IncidenteSchema) => estadosRelevantes.includes(inc.estado))
        .map((inc: IncidenteSchema) => {
          const cliente = inc.cliente;
          return {
            ...inc,
            clienteNombre: cliente?.nombre || "Sin cliente",
            clienteCelular: cliente?.celular || cliente?.telefono_principal || "",
            clienteDireccion: inc.direccion_entrega?.direccion || cliente?.direccion || "",
            guiaInfo: guiaMap.get(inc.id) || null,
            diasEspera: calcularDiasEspera(inc.updated_at)
          };
        })
        .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());

      setIncidentes(incidentesFiltrados);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Actualizar URL cuando cambia el tab
  const handleTabChange = (value: string) => {
    setActiveTab(value as TabType);
    setSearchParams({ tab: value });
  };

  // Categorías de incidentes
  const categorias = useMemo(() => {
    const porDespachar = incidentes.filter(
      (i) => ["REPARADO", "RECHAZADO", "CAMBIO_POR_GARANTIA"].includes(i.estado) && i.quiere_envio
    );
    const enRuta = incidentes.filter(
      (i) => i.estado === "EN_ENTREGA" && i.quiere_envio
    );
    const paraRecoger = incidentes.filter(
      (i) => i.estado === "EN_ENTREGA" && !i.quiere_envio
    );
    const excesoDias = incidentes.filter(
      (i) => i.estado === "EN_ENTREGA" && i.diasEspera > 7
    );

    return { porDespachar, enRuta, paraRecoger, excesoDias };
  }, [incidentes]);

  // Filtrar por búsqueda
  const filtrarPorBusqueda = (lista: IncidenteEnriquecido[]) => {
    if (!searchTerm.trim()) return lista;
    const term = searchTerm.toLowerCase();
    return lista.filter(
      (i) =>
        i.codigo.toLowerCase().includes(term) ||
        i.clienteNombre.toLowerCase().includes(term) ||
        (i.producto?.codigo || "").toLowerCase().includes(term) ||
        (i.guiaInfo?.tracking_number?.toLowerCase() || "").includes(term)
    );
  };

  // Badge de urgencia según días
  const getBadgeUrgencia = (dias: number) => {
    if (dias > 7) return <Badge variant="destructive" className="text-xs">{dias}d</Badge>;
    if (dias > 3) return <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-xs">{dias}d</Badge>;
    return <Badge variant="outline" className="text-xs">{dias}d</Badge>;
  };

  // Badge de estado
  const getBadgeEstado = (estado: string, quiereEnvio: boolean) => {
    switch (estado) {
      case "REPARADO":
        return <Badge className="bg-emerald-100 text-emerald-800">Reparada</Badge>;
      case "RECHAZADO":
        return <Badge variant="destructive">Rechazada</Badge>;
      case "CAMBIO_POR_GARANTIA":
        return <Badge className="bg-blue-100 text-blue-800">Cambio</Badge>;
      case "EN_ENTREGA":
        return quiereEnvio 
          ? <Badge className="bg-purple-100 text-purple-800">En Ruta</Badge>
          : <Badge className="bg-amber-100 text-amber-800">Esperando</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  // Acciones según contexto
  const handleCrearGuia = (incidente: IncidenteEnriquecido) => {
    navigate(`/logistica/guias?incidente=${incidente.id}`);
  };

  const handleVerGuia = (incidente: IncidenteEnriquecido) => {
    if (incidente.guiaInfo) {
      navigate(`/logistica/guias?guia=${incidente.guiaInfo.id}`);
    }
  };

  const handleConfirmarEntrega = (incidente: IncidenteEnriquecido) => {
    navigate(`/mostrador/detalle-entrega/${incidente.id}`);
  };

  // Renderizar tabla
  const renderTable = (data: IncidenteEnriquecido[], tipo: TabType) => {
    const filtrados = filtrarPorBusqueda(data);

    if (filtrados.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Package className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">Sin resultados</p>
          <p className="text-sm">No hay máquinas en esta categoría</p>
        </div>
      );
    }

    return (
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[120px]">Código</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="hidden md:table-cell">Producto</TableHead>
              <TableHead className="hidden lg:table-cell">Dirección</TableHead>
              <TableHead className="w-[100px]">Estado</TableHead>
              <TableHead className="w-[80px] text-center">Días</TableHead>
              {tipo === "en_ruta" && <TableHead className="hidden sm:table-cell">Guía</TableHead>}
              <TableHead className="w-[120px] text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.map((incidente) => (
              <TableRow 
                key={incidente.id} 
                className="hover:bg-muted/30 cursor-pointer"
                onClick={() => {
                  setSelectedIncidente(incidente);
                  setSheetOpen(true);
                }}
              >
                <TableCell className="font-mono font-medium text-primary">
                  {incidente.codigo}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium truncate max-w-[180px]">{incidente.clienteNombre}</span>
                    {incidente.clienteCelular && (
                      <span className="text-xs text-muted-foreground">{incidente.clienteCelular}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {incidente.producto?.codigo || "-"}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground max-w-[200px] truncate">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{incidente.clienteDireccion || "Sin dirección"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {getBadgeEstado(incidente.estado, incidente.quiere_envio)}
                </TableCell>
                <TableCell className="text-center">
                  {getBadgeUrgencia(incidente.diasEspera)}
                </TableCell>
                {tipo === "en_ruta" && (
                  <TableCell className="hidden sm:table-cell">
                    {incidente.guiaInfo?.tracking_number ? (
                      <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                        {incidente.guiaInfo.tracking_number}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                )}
                <TableCell className="text-right">
                  {tipo === "por_despachar" && (
                    <Button 
                      size="sm" 
                      onClick={() => handleCrearGuia(incidente)}
                      className="gap-1"
                    >
                      <Send className="h-3 w-3" />
                      <span className="hidden sm:inline">Crear Guía</span>
                    </Button>
                  )}
                  {tipo === "en_ruta" && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleVerGuia(incidente)}
                      className="gap-1"
                    >
                      <Eye className="h-3 w-3" />
                      <span className="hidden sm:inline">Ver Guía</span>
                    </Button>
                  )}
                  {tipo === "para_recoger" && (
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => handleConfirmarEntrega(incidente)}
                      className="gap-1"
                    >
                      <CheckCircle className="h-3 w-3" />
                      <span className="hidden sm:inline">Entregar</span>
                    </Button>
                  )}
                  {tipo === "exceso_dias" && (
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleConfirmarEntrega(incidente)}
                      className="gap-1"
                    >
                      <Clock className="h-3 w-3" />
                      <span className="hidden sm:inline">Atender</span>
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Truck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Centro de Despacho</h1>
            <p className="text-sm text-muted-foreground">Gestión de salida de máquinas</p>
          </div>
        </div>
        <Button onClick={fetchData} disabled={loading} variant="outline" className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Send className="h-4 w-4" />
              Por Despachar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{categorias.porDespachar.length}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Truck className="h-4 w-4" />
              En Ruta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{categorias.enRuta.length}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              Para Recoger
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{categorias.paraRecoger.length}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Exceso Días
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{categorias.excesoDias.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por código, cliente o guía..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 max-w-xl">
          <TabsTrigger value="por_despachar" className="gap-2">
            <Send className="h-4 w-4 hidden sm:block" />
            Por Despachar
            <Badge variant="secondary" className="ml-1">{categorias.porDespachar.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="en_ruta" className="gap-2">
            <Truck className="h-4 w-4 hidden sm:block" />
            En Ruta
            <Badge variant="secondary" className="ml-1">{categorias.enRuta.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="para_recoger" className="gap-2">
            <User className="h-4 w-4 hidden sm:block" />
            Recoger
            <Badge variant="secondary" className="ml-1">{categorias.paraRecoger.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="exceso_dias" className="gap-2">
            <Clock className="h-4 w-4 hidden sm:block" />
            +7 días
            {categorias.excesoDias.length > 0 && (
              <Badge variant="destructive" className="ml-1">{categorias.excesoDias.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="por_despachar">
          {loading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            renderTable(categorias.porDespachar, "por_despachar")
          )}
        </TabsContent>

        <TabsContent value="en_ruta">
          {loading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            renderTable(categorias.enRuta, "en_ruta")
          )}
        </TabsContent>

        <TabsContent value="para_recoger">
          {loading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            renderTable(categorias.paraRecoger, "para_recoger")
          )}
        </TabsContent>

        <TabsContent value="exceso_dias">
          {loading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            renderTable(categorias.excesoDias, "exceso_dias")
          )}
        </TabsContent>
      </Tabs>

      {/* Sheet de Detalle */}
      <DetalleDespachoSheet
        incidente={selectedIncidente}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
