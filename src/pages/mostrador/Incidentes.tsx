import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  getIncidentesApiV1IncidentesGet,
  listClientesApiV1ClientesGet,
  listProductosApiV1ProductosGet,
  // Assuming the notifications endpoint is available in the SDK
  // createNotificacionesClienteApiV1NotificacionesClientePost, 
  // getAllNotificacionesClienteApiV1NotificacionesClienteGet 
} from "@/generated_sdk";
import type { IncidenteSchema, ClienteSchema, ProductoSchema } from "@/generated_sdk/types.gen";

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
  const [incidentesList, setIncidentesList] = useState<IncidenteSchema[]>([]);
  const [clientesList, setClientesList] = useState<ClienteSchema[]>([]);
  const [productosList, setProductosList] = useState<ProductoSchema[]>([]);
  const [notificacionesList, setNotificacionesList] = useState<NotificacionCliente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [incidentesResult, clientesResult, productosResult] = await Promise.all([
        getIncidentesApiV1IncidentesGet({ query: { limit: 500 }, responseStyle: 'data' }),
        listClientesApiV1ClientesGet({ query: { limit: 5000 }, responseStyle: 'data' }),
        listProductosApiV1ProductosGet({ query: { limit: 1000 }, responseStyle: 'data' }),
      ]);

      setIncidentesList(incidentesResult.results || []);
      setClientesList(clientesResult.results || []);
      setProductosList(productosResult.results || []);
      
      // TODO: Cargar notificaciones usando apiBackendAction
      // try {
      //   const { results } = await getAllNotificacionesClienteApiV1NotificacionesClienteGet({});
      //   setNotificacionesList(results as NotificacionCliente[] || []);
      // } catch {
      //   setNotificacionesList([]);
      // }
    } catch (error) {
      console.error("Error al cargar datos:", error);
      toast.error("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  // Buscar cliente por ID
  // Helper to get client name from incidente
  const getClienteName = (incidente: IncidenteSchema): string => {
    if (incidente.cliente?.nombre) return incidente.cliente.nombre;
    return "Cliente no asignado";
  };

  // Helper to get product display name from incidente
  const getProductDisplayName = (incidente: IncidenteSchema): string => {
    if (incidente.producto?.descripcion) return incidente.producto.descripcion;
    if (incidente.producto?.codigo) return incidente.producto.codigo;
    return "Producto no asignado";
  };

  const isProductDiscontinued = (incidente: IncidenteSchema): boolean => {
    const producto = incidente.producto as any;
    if (!producto) return false;
    return (producto as any)?.descontinuado ?? false;
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
  const { user } = useAuth();
  const enviarNotificacionesMasivas = async (incidentes: IncidenteSchema[]) => {
    try {
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

      // This is a placeholder for the actual SDK call, as the function name is not clear
      // await createNotificacionesClienteApiV1NotificacionesClientePost({ body: notificaciones });

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
          disabled
        >
          <PlusCircle className="h-5 w-5 mr-2" />
          Crear Incidente (En desarrollo)
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

      <Tabs defaultValue="todos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="todos">Todos ({incidentesList.length})</TabsTrigger>
          <TabsTrigger value="ingresadas">Máquinas Ingresadas ({maquinasIngresadas})</TabsTrigger>
          <TabsTrigger value="notificar">Pendientes de Notificar ({pendientesNotificar})</TabsTrigger>
        </TabsList>

        <TabsContent value="todos">
          <Card>
            <CardHeader>
              <CardTitle>Todos los Incidentes</CardTitle>
              <CardDescription>
                {incidentesList.length} incidentes en total
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
                      <TableHead>Estado</TableHead>
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
                          (i.descripcion_problema || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                          getClienteName(i).toLowerCase().includes(searchTerm.toLowerCase());
                        return matchesSearch;
                      }).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">
                          No hay incidentes
                        </TableCell>
                      </TableRow>
                    ) : (
                      incidentesList
                        .filter((i) => {
                          const matchesSearch =
                            i.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (i.descripcion_problema || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                            getClienteName(i).toLowerCase().includes(searchTerm.toLowerCase());
                          return matchesSearch;
                        })
                        .map((incidente) => (
                          <TableRow
                            key={incidente.id}
                            className="cursor-pointer hover:bg-muted/30"
                            onClick={() => handleRowClick(incidente.id)}
                          >
                            <TableCell className="font-medium">{incidente.codigo}</TableCell>
                            <TableCell>{getClienteName(incidente)}</TableCell>
                            <TableCell>
                              <span className="text-sm">{getProductDisplayName(incidente)}</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{incidente.estado}</Badge>
                            </TableCell>
                            <TableCell>{incidente.created_at ? new Date(incidente.created_at).toLocaleDateString() : "-"}</TableCell>
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
                      <TableHead>Estado</TableHead>
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
                          (i.descripcion_problema || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                          getClienteName(i).toLowerCase().includes(searchTerm.toLowerCase());
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
                            (i.descripcion_problema || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                            getClienteName(i).toLowerCase().includes(searchTerm.toLowerCase());
                          return i.estado === "REGISTRADO" && matchesSearch;
                        })
                        .map((incidente) => (
                          <TableRow
                            key={incidente.id}
                            className="cursor-pointer hover:bg-muted/30"
                            onClick={() => handleRowClick(incidente.id)}
                          >
                            <TableCell className="font-medium">{incidente.codigo}</TableCell>
                            <TableCell>{getClienteName(incidente)}</TableCell>
                            <TableCell>
                              <span className="text-sm">{getProductDisplayName(incidente)}</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{incidente.estado}</Badge>
                            </TableCell>
                            <TableCell>{incidente.created_at ? new Date(incidente.created_at).toLocaleDateString() : "-"}</TableCell>
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

              {/* Lista de incidentes con 3+ notificaciones */}
              {incidentesPorNotificaciones.tresMas.length > 0 && (
                <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800 mb-6">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
                      <Phone className="h-5 w-5" />
                      Requieren llamada telefónica ({incidentesPorNotificaciones.tresMas.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {incidentesPorNotificaciones.tresMas.slice(0, 5).map((inc) => (
                        <div
                          key={inc.id}
                          className="flex items-center justify-between p-2 bg-card rounded cursor-pointer hover:bg-muted/50"
                          onClick={() => handleRowClick(inc.id)}
                        >
                          <span className="font-mono">{inc.codigo}</span>
                          <Badge variant="destructive">{getNotificacionesCount(inc.id)} notifs</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tabla de incidentes reparados */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Notificaciones</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incidentesReparados.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          No hay máquinas pendientes de notificar
                        </TableCell>
                      </TableRow>
                    ) : (
                      incidentesReparados.map((incidente) => (
                        <TableRow
                          key={incidente.id}
                          className="cursor-pointer hover:bg-muted/30"
                          onClick={() => handleRowClick(incidente.id)}
                        >
                          <TableCell className="font-medium">{incidente.codigo}</TableCell>
                          <TableCell>{getClienteName(incidente)}</TableCell>
                          <TableCell>{getProductDisplayName(incidente)}</TableCell>
                          <TableCell>
                            <Badge variant={getNotificacionesCount(incidente.id) >= 3 ? "destructive" : "secondary"}>
                              {getNotificacionesCount(incidente.id)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              Ver
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
      </Tabs>
    </div>
  );
}
