import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Cliente = Database['public']['Tables']['clientes']['Row'];
type Incidente = Database['public']['Tables']['incidentes']['Row'];

export default function DetalleCliente() {
  const { codigo } = useParams();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [incidentes, setIncidentes] = useState<Incidente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (codigo) {
      fetchClienteData();
    }
  }, [codigo]);

  const fetchClienteData = async () => {
    try {
      setLoading(true);
      
      // Fetch cliente
      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes')
        .select('*')
        .eq('codigo', codigo)
        .single();

      if (clienteError) throw clienteError;
      setCliente(clienteData);

      // Fetch incidentes del cliente
      const { data: incidentesData, error: incidentesError } = await supabase
        .from('incidentes')
        .select('*')
        .eq('codigo_cliente', codigo)
        .order('fecha_ingreso', { ascending: false });

      if (incidentesError) throw incidentesError;
      setIncidentes(incidentesData || []);
    } catch (error) {
      console.error('Error al cargar datos del cliente:', error);
      toast.error('Error al cargar los datos del cliente');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Cliente no encontrado</p>
        <Button onClick={() => navigate('/mostrador/clientes')}>
          Volver a Clientes
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate('/mostrador/clientes')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">{cliente.nombre}</h1>
          <p className="text-muted-foreground">Código: {cliente.codigo}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Datos Personales */}
        <Card>
          <CardHeader>
            <CardTitle>Datos Personales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">NIT</p>
              <p className="font-medium">{cliente.nit}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Celular</p>
              <p className="font-medium">{cliente.celular}</p>
            </div>
            {cliente.telefono_principal && (
              <div>
                <p className="text-sm text-muted-foreground">Teléfono Principal</p>
                <p className="font-medium">{cliente.telefono_principal}</p>
              </div>
            )}
            {cliente.telefono_secundario && (
              <div>
                <p className="text-sm text-muted-foreground">Teléfono Secundario</p>
                <p className="font-medium">{cliente.telefono_secundario}</p>
              </div>
            )}
            {cliente.correo && (
              <div>
                <p className="text-sm text-muted-foreground">Correo</p>
                <p className="font-medium">{cliente.correo}</p>
              </div>
            )}
            {cliente.direccion && (
              <div>
                <p className="text-sm text-muted-foreground">Dirección</p>
                <p className="font-medium">{cliente.direccion}</p>
              </div>
            )}
            {cliente.direccion_envio && (
              <div>
                <p className="text-sm text-muted-foreground">Dirección de Envío</p>
                <p className="font-medium">{cliente.direccion_envio}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Datos de Facturación */}
        <Card>
          <CardHeader>
            <CardTitle>Datos de Facturación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cliente.nombre_facturacion && (
              <div>
                <p className="text-sm text-muted-foreground">Nombre Facturación</p>
                <p className="font-medium">{cliente.nombre_facturacion}</p>
              </div>
            )}
            {cliente.pais && (
              <div>
                <p className="text-sm text-muted-foreground">País</p>
                <p className="font-medium">{cliente.pais}</p>
              </div>
            )}
            {cliente.departamento && (
              <div>
                <p className="text-sm text-muted-foreground">Departamento</p>
                <p className="font-medium">{cliente.departamento}</p>
              </div>
            )}
            {cliente.municipio && (
              <div>
                <p className="text-sm text-muted-foreground">Municipio</p>
                <p className="font-medium">{cliente.municipio}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Historial de Incidentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Historial de Incidentes
          </CardTitle>
          <CardDescription>
            {incidentes.length} {incidentes.length === 1 ? 'incidente registrado' : 'incidentes registrados'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {incidentes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No hay incidentes registrados para este cliente</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Fecha Ingreso</TableHead>
                    <TableHead>Centro Servicio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incidentes.map((incidente) => (
                    <TableRow 
                      key={incidente.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/incidentes/${incidente.id}`)}
                    >
                      <TableCell className="font-medium">{incidente.codigo}</TableCell>
                      <TableCell>{incidente.codigo_producto}</TableCell>
                      <TableCell>
                        <StatusBadge status={incidente.status as any} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {new Date(incidente.fecha_ingreso).toLocaleDateString('es-GT')}
                        </div>
                      </TableCell>
                      <TableCell>{incidente.centro_servicio || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
