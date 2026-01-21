import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Eye,
  AlertTriangle,
  CheckCircle,
  Package,
  PlusCircle,
  Bell,
  Phone,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type EstadoIncidente = Database["public"]["Enums"]["estadoincidente"];

type IncidenteDB = Database["public"]["Tables"]["incidentes"]["Row"];
type ClienteDB = Database["public"]["Tables"]["clientes"]["Row"];
type ProductoDB = Database["public"]["Tables"]["productos"]["Row"];

// Notificaciones cliente - interface local ya que puede no estar tipada
interface NotificacionCliente {
  id: number;
  incidente_id: number;
  numero_notificacion: number;
  canal: string;
  mensaje: string;
  enviado_por: string;
  fecha_envio: string;
  created_at: string;
}

export default function IncidentesMostrador() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [incidentesList, setIncidentesList] = useState<IncidenteDB[]>([]);
  const [clientesList, setClientesList] = useState<ClienteDB[]>([]);
  const [productosList, setProductosList] = useState<ProductoDB[]>([]);
  const [notificacionesList, setNotificacionesList] = useState<NotificacionCliente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Cargar incidentes, clientes y productos en paralelo
      const [incidentesResult, clientesResult, productosResult] = await Promise.all([
        supabase.from("incidentes").select("*").order("fecha_ingreso", { ascending: false }),
        supabase.from("clientes").select("*"),
        supabase.from("productos").select("*"),
      ]);

      if (incidentesResult.error) throw incidentesResult.error;
      if (clientesResult.error) throw clientesResult.error;
      if (productosResult.error) throw productosResult.error;

      setIncidentesList(incidentesResult.data || []);
      setClientesList(clientesResult.data || []);
      setProductosList(productosResult.data || []);
      
      // Intentar cargar notificaciones (tabla puede no existir)
      try {
        const { data: notifData } = await (supabase as any)
          .from("notificaciones_cliente")
          .select("*");
        setNotificacionesList(notifData || []);
      } catch {
        setNotificacionesList([]);
      }
    } catch (error) {
      console.error("Error al cargar datos:", error);
      toast.error("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  // Buscar cliente por ID
  const getClienteName = (clienteId: number | null): string => {
    if (!clienteId) return "Cliente no asignado";
    const cliente = clientesList.find((c) => c.id === clienteId);
    return cliente ? cliente.nombre : "Cliente no encontrado";
  };

  // Buscar producto por ID
  const getProductDisplayName = (productoId: number | null): string => {
    if (!productoId) return "Producto no asignado";
    const producto = productosList.find((p) => p.id === productoId);
    return producto ? producto.descripcion : `ID: ${productoId}`;
  };

  const isProductDiscontinued = (productoId: number | null): boolean => {
    if (!productoId) return false;
    const producto = productosList.find((p) => p.id === productoId);
    return producto?.descontinuado ?? false;
  };

  // Obtener número de notificaciones por incidente
  const getNotificacionesCount = (incidenteId: number): number => {
    return notificacionesList.filter((n) => n.incidente_id === incidenteId).length;
  };

  // Obtener última notificación
  const getUltimaNotificacion = (incidenteId: number): NotificacionCliente | undefined => {
    const notifs = notificacionesList
      .filter((n) => n.incidente_id === incidenteId)
      .sort((a, b) => new Date(b.fecha_envio).getTime() - new Date(a.fecha_envio).getTime());
    return notifs[0];
  };

  // Función para verificar si debe reaparecer (después de 1 día)
  const debeReaparecer = (incidenteId: number): boolean => {
    const ultimaNotif = getUltimaNotificacion(incidenteId);
    if (!ultimaNotif) return true;

    const haceUnDia = new Date();
    haceUnDia.setDate(haceUnDia.getDate() - 1);
    return new Date(ultimaNotif.fecha_envio) <= haceUnDia;
  };

  // Calcular métricas del dashboard usando estado correcto
  const maquinasIngresadas = incidentesList.filter((i) => i.estado === "REGISTRADO").length;
  const pendientesNotificar = incidentesList.filter((i) => i.estado === "REPARADO").length;
  const pendientesEntrega = incidentesList.filter((i) => i.estado === "REPARADO").length;

  // Filtrar incidentes reparados para notificar
  const incidentesReparados = incidentesList.filter((i) => i.estado === "REPARADO");

  const incidentesPorNotificaciones = {
    cero: incidentesReparados.filter((i) => getNotificacionesCount(i.id) === 0),
    una: incidentesReparados.filter((i) => getNotificacionesCount(i.id) === 1 && debeReaparecer(i.id)),
    dos: incidentesReparados.filter((i) => getNotificacionesCount(i.id) === 2 && debeReaparecer(i.id)),
    tresMas: incidentesReparados.filter((i) => getNotificacionesCount(i.id) >= 3),
  };

  const handleRowClick = (incidenteId: number) => {
    navigate(`/mostrador/seguimiento/${incidenteId}`);
  };

  // Función para enviar notificaciones masivas
  const enviarNotificacionesMasivas = async (incidentes: IncidenteDB[]) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("No se encontró usuario autenticado");
        return;
      }

      const notificaciones = incidentes.map((inc) => ({
        incidente_id: inc.id,
        numero_notificacion: getNotificacionesCount(inc.id) + 1,
        canal: "whatsapp",
        mensaje: `Estimado cliente, su equipo ${inc.codigo} está listo para entregar.`,
        enviado_por: user.id,
      }));

      const { error } = await (supabase as any)
        .from("notificaciones_cliente")
        .insert(notificaciones);

      if (error) throw error;

      toast.success(`${incidentes.length} notificaciones enviadas correctamente`);
      await fetchData();
    } catch (error) {
      console.error("Error al enviar notificaciones:", error);
      toast.error("Error al enviar notificaciones");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Consulta de Incidentes</h1>
          <p className="text-muted-foreground">Consulte el estado de los incidentes y seguimiento de reparaciones</p>
        </div>
        <Button
          onClick={() => navigate("/mostrador/incidentes/nuevo")}
          size="lg"
          className="shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
        >
          <PlusCircle className="h-5 w-5 mr-2" />
          Crear Incidente
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Máquinas Ingresadas</p>
                <p className="text-2xl font-bold">{maquinasIngresadas}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Pendientes por Notificar (Reparadas)</p>
                <p className="text-2xl font-bold">{pendientesNotificar}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Pendientes de Entrega</p>
                <p className="text-2xl font-bold">{pendientesEntrega}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="ingresadas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ingresadas">Máquinas Ingresadas ({maquinasIngresadas})</TabsTrigger>
          <TabsTrigger value="notificar">Pendientes de Notificar ({pendientesNotificar})</TabsTrigger>
        </TabsList>

        <TabsContent value="ingresadas">
          <Card>
            <CardHeader>
              <CardTitle>Máquinas Ingresadas</CardTitle>
              <CardDescription>
                {incidentesList.filter((i) => i.estado === "REGISTRADO").length} máquinas ingresadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar incidentes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Garantía</TableHead>
                      <TableHead>Fecha Ingreso</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">
                          Cargando incidentes...
                        </TableCell>
                      </TableRow>
                    ) : incidentesList.filter((i) => {
                        const matchesSearch =
                          i.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          i.descripcion_problema.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          getClienteName(i.cliente_id).toLowerCase().includes(searchTerm.toLowerCase());
                        return i.estado === "REGISTRADO" && matchesSearch;
                      }).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">
                          No hay máquinas ingresadas
                        </TableCell>
                      </TableRow>
                    ) : (
                      incidentesList
                        .filter((i) => {
                          const matchesSearch =
                            i.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            i.descripcion_problema.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            getClienteName(i.cliente_id).toLowerCase().includes(searchTerm.toLowerCase());
                          return i.estado === "REGISTRADO" && matchesSearch;
                        })
                        .map((incidente) => (
                          <TableRow
                            key={incidente.id}
                            className="cursor-pointer hover:bg-muted/30"
                            onClick={() => handleRowClick(incidente.id)}
                          >
                            <TableCell className="font-medium">{incidente.codigo}</TableCell>
                            <TableCell>{getClienteName(incidente.cliente_id)}</TableCell>
                            <TableCell>
                              <span className="text-sm">{getProductDisplayName(incidente.producto_id)}</span>
                            </TableCell>
                            <TableCell>
                              {incidente.aplica_garantia ? (
                                <Badge className="bg-success text-success-foreground">Sí</Badge>
                              ) : (
                                <Badge variant="outline">No</Badge>
                              )}
                            </TableCell>
                            <TableCell>{new Date(incidente.fecha_ingreso).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRowClick(incidente.id);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Ver Detalles
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notificar">
          <Card>
            <CardHeader>
              <CardTitle>Pendientes de Notificar</CardTitle>
              <CardDescription>
                {incidentesList.filter((i) => i.estado === "REPARADO").length} máquinas listas para notificar al cliente
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Botones de notificación masiva */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Bell className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        <span className="font-semibold text-foreground">0 Notificaciones</span>
                      </div>
                      <Badge className="bg-orange-600 text-white">{incidentesPorNotificaciones.cero.length}</Badge>
                    </div>
                    <Button
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white shadow-md"
                      onClick={() => enviarNotificacionesMasivas(incidentesPorNotificaciones.cero)}
                      disabled={incidentesPorNotificaciones.cero.length === 0}
                    >
                      <Bell className="h-4 w-4 mr-2" />
                      Notificar Todos
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <span className="font-semibold text-foreground">1 Notificación</span>
                      </div>
                      <Badge className="bg-blue-600 text-white">{incidentesPorNotificaciones.una.length}</Badge>
                    </div>
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                      onClick={() => enviarNotificacionesMasivas(incidentesPorNotificaciones.una)}
                      disabled={incidentesPorNotificaciones.una.length === 0}
                    >
                      <Bell className="h-4 w-4 mr-2" />
                      Notificar Segunda Vez
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        <span className="font-semibold text-foreground">2 Notificaciones</span>
                      </div>
                      <Badge className="bg-amber-600 text-white">{incidentesPorNotificaciones.dos.length}</Badge>
                    </div>
                    <Button
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white shadow-md"
                      onClick={() => enviarNotificacionesMasivas(incidentesPorNotificaciones.dos)}
                      disabled={incidentesPorNotificaciones.dos.length === 0}
                    >
                      <Bell className="h-4 w-4 mr-2" />
                      Notificar Tercera Vez
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Apartado de llamadas obligatorias */}
              {incidentesPorNotificaciones.tresMas.length > 0 && (
                <Card className="mb-6 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
                  <CardHeader>
                    <CardTitle className="flex items-center text-red-700 dark:text-red-300">
                      <Phone className="h-5 w-5 mr-2" />
                      Llamadas Obligatorias
                    </CardTitle>
                    <CardDescription className="text-red-600 dark:text-red-400">
                      {incidentesPorNotificaciones.tresMas.length} casos con 3 o más notificaciones requieren llamada
                      telefónica
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border border-red-200 dark:border-red-800">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-red-50 dark:bg-red-950/50">
                            <TableHead>Código</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Producto</TableHead>
                            <TableHead>Notificaciones</TableHead>
                            <TableHead>Última Notificación</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {incidentesPorNotificaciones.tresMas.map((incidente) => {
                            const numNotif = getNotificacionesCount(incidente.id);
                            const ultimaNotif = getUltimaNotificacion(incidente.id);
                            return (
                              <TableRow
                                key={incidente.id}
                                className="cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/30"
                                onClick={() => handleRowClick(incidente.id)}
                              >
                                <TableCell className="font-medium">{incidente.codigo}</TableCell>
                                <TableCell>{getClienteName(incidente.cliente_id)}</TableCell>
                                <TableCell>{getProductDisplayName(incidente.producto_id)}</TableCell>
                                <TableCell>
                                  <Badge className="bg-red-600 text-white">{numNotif} notificaciones</Badge>
                                </TableCell>
                                <TableCell>
                                  {ultimaNotif ? new Date(ultimaNotif.fecha_envio).toLocaleDateString() : "N/A"}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRowClick(incidente.id);
                                    }}
                                  >
                                    <Phone className="h-4 w-4 mr-1" />
                                    Llamar
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex items-center space-x-4 mb-4">
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar incidentes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Notificaciones</TableHead>
                      <TableHead>Garantía</TableHead>
                      <TableHead>Fecha Ingreso</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">
                          Cargando incidentes...
                        </TableCell>
                      </TableRow>
                    ) : incidentesList.filter((i) => {
                        const matchesSearch =
                          i.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          i.descripcion_problema.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          getClienteName(i.cliente_id).toLowerCase().includes(searchTerm.toLowerCase());
                        const numNotif = getNotificacionesCount(i.id);
                        const esVisible = numNotif < 3 && (numNotif === 0 || debeReaparecer(i.id));
                        return i.estado === "REPARADO" && matchesSearch && esVisible;
                      }).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">
                          No hay máquinas pendientes de notificar
                        </TableCell>
                      </TableRow>
                    ) : (
                      incidentesList
                        .filter((i) => {
                          const matchesSearch =
                            i.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            i.descripcion_problema.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            getClienteName(i.cliente_id).toLowerCase().includes(searchTerm.toLowerCase());
                          const numNotif = getNotificacionesCount(i.id);
                          const esVisible = numNotif < 3 && (numNotif === 0 || debeReaparecer(i.id));
                          return i.estado === "REPARADO" && matchesSearch && esVisible;
                        })
                        .map((incidente) => {
                          const numNotif = getNotificacionesCount(incidente.id);
                          return (
                            <TableRow
                              key={incidente.id}
                              className="cursor-pointer hover:bg-muted/30"
                              onClick={() => handleRowClick(incidente.id)}
                            >
                              <TableCell className="font-medium">{incidente.codigo}</TableCell>
                              <TableCell>{getClienteName(incidente.cliente_id)}</TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm">{getProductDisplayName(incidente.producto_id)}</span>
                                  {isProductDiscontinued(incidente.producto_id) && (
                                    <Badge variant="destructive" className="text-xs">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      Descontinuado
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={
                                    numNotif === 0
                                      ? "bg-orange-600 text-white"
                                      : numNotif === 1
                                        ? "bg-blue-600 text-white"
                                        : "bg-amber-600 text-white"
                                  }
                                >
                                  <Bell className="h-3 w-3 mr-1" />
                                  {numNotif}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {incidente.aplica_garantia ? (
                                  <Badge className="bg-success text-success-foreground">Sí</Badge>
                                ) : (
                                  <Badge variant="outline">No</Badge>
                                )}
                              </TableCell>
                              <TableCell>{new Date(incidente.fecha_ingreso).toLocaleDateString()}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRowClick(incidente.id);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Ver Detalles
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
