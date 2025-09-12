import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit, Calendar, User, Package, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/StatusBadge";
import { incidentes, clientes, productos, tecnicos } from "@/data/mockData";
import { Incidente } from "@/types";
import { supabase } from "@/integrations/supabase/client";

export default function DetalleIncidente() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [incidente, setIncidente] = useState<Incidente | null>(null);
  const [productoInfo, setProductoInfo] = useState<any>(null);

  useEffect(() => {
    if (id) {
      const incidenteEncontrado = incidentes.find(i => i.id === id);
      setIncidente(incidenteEncontrado || null);
      
      if (incidenteEncontrado) {
        // Buscar información del producto en la base de datos
        const fetchProducto = async () => {
          try {
            const { data, error } = await supabase
              .from('productos')
              .select('*')
              .eq('codigo', incidenteEncontrado.codigoProducto)
              .single();
            
            if (data && !error) {
              setProductoInfo(data);
            }
          } catch (error) {
            console.error('Error fetching producto:', error);
          }
        };
        
        fetchProducto();
      }
    }
  }, [id]);

  if (!incidente) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate("/incidentes")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Incidentes
          </Button>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">Incidente no encontrado</h2>
            <p className="text-muted-foreground">El incidente con ID "{id}" no existe en el sistema.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getClienteName = (codigo: string) => {
    const cliente = clientes.find(c => c.codigo === codigo);
    return cliente ? cliente.nombre : "Cliente no encontrado";
  };

  const getTecnicoName = (codigo: string) => {
    const tecnico = tecnicos.find(t => t.codigo === codigo);
    return tecnico ? `${tecnico.nombre} ${tecnico.apellido}` : "Técnico no encontrado";
  };

  const getTecnicoEmail = (codigo: string) => {
    const tecnico = tecnicos.find(t => t.codigo === codigo);
    return tecnico ? tecnico.email : "";
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/incidentes")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Incidentes
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Incidente {incidente.id}</h1>
            <p className="text-muted-foreground">Detalles del servicio técnico</p>
          </div>
        </div>
        <Button variant="outline">
          <Edit className="w-4 h-4 mr-2" />
          Editar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="w-4 h-4" />
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{getClienteName(incidente.codigoCliente)}</p>
            <p className="text-sm text-muted-foreground">Código: {incidente.codigoCliente}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="w-4 h-4" />
              Producto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">
              {productoInfo ? productoInfo.descripcion : `Código: ${incidente.codigoProducto}`}
            </p>
            <p className="text-sm text-muted-foreground">
              Código: {incidente.codigoProducto}
              {productoInfo && ` | Clave: ${productoInfo.clave}`}
            </p>
            {productoInfo?.descontinuado && (
              <Badge variant="destructive" className="mt-2">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Descontinuado
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Estado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBadge status={incidente.status} />
            <p className="text-sm text-muted-foreground mt-2">
              Ingresado: {incidente.fechaIngreso}
            </p>
            <div className="flex items-center gap-2 mt-2">
              {incidente.coberturaGarantia ? (
                <Badge className="bg-success text-success-foreground">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Con Garantía
                </Badge>
              ) : (
                <Badge variant="outline">
                  <Clock className="w-3 h-3 mr-1" />
                  Sin Garantía
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="detalles" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="detalles">Detalles</TabsTrigger>
          <TabsTrigger value="diagnostico">Diagnóstico</TabsTrigger>
          <TabsTrigger value="repuestos">Repuestos</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="detalles" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Descripción del Problema</CardTitle>
              <CardDescription>Problema reportado por el cliente</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{incidente.descripcionProblema}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Técnico Asignado</CardTitle>
              <CardDescription>Responsable del servicio</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{getTecnicoName(incidente.codigoTecnico)}</p>
                  <p className="text-sm text-muted-foreground">{getTecnicoEmail(incidente.codigoTecnico)}</p>
                  <p className="text-xs text-muted-foreground">Código: {incidente.codigoTecnico}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diagnostico" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Diagnóstico Técnico</CardTitle>
              <CardDescription>Análisis y evaluación del problema</CardDescription>
            </CardHeader>
            <CardContent>
              {incidente.status === "Pendiente de diagnostico" ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">El diagnóstico aún no ha sido realizado</p>
                  <Button className="mt-4" variant="outline">
                    Iniciar Diagnóstico
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm">Estado del diagnóstico: <StatusBadge status={incidente.status} /></p>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      El diagnóstico detallado se mostrará aquí una vez completado.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="repuestos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Repuestos Requeridos</CardTitle>
              <CardDescription>Lista de componentes necesarios para la reparación</CardDescription>
            </CardHeader>
            <CardContent>
              {incidente.status === "Pendiente por repuestos" ? (
                <div className="space-y-4">
                  <Badge variant="outline" className="bg-warning/10 text-warning">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Esperando repuestos
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    Los repuestos necesarios están siendo gestionados.
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No se han solicitado repuestos aún</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historial" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Actividades</CardTitle>
              <CardDescription>Cronología de eventos del incidente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 border-l-2 border-primary/20 bg-muted/30 rounded-r">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Incidente creado</p>
                    <p className="text-xs text-muted-foreground">{incidente.fechaIngreso}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Problema reportado: {incidente.descripcionProblema}
                    </p>
                  </div>
                </div>
                
                {incidente.status !== "Pendiente de diagnostico" && (
                  <div className="flex items-start gap-3 p-3 border-l-2 border-warning/20 bg-muted/30 rounded-r">
                    <div className="w-2 h-2 bg-warning rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Diagnóstico iniciado</p>
                      <p className="text-xs text-muted-foreground">Estado actual: {incidente.status}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}