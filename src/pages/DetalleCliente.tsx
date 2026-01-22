import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  Package,
  Clock,
  Edit,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { apiBackendAction } from "@/lib/api-backend";
import { StatusBadge } from "@/components/shared";
import { formatFechaCorta } from "@/utils/dateFormatters";

type ClienteData = {
  id: number;
  codigo: string;
  nombre: string;
  nit?: string | null;
  telefono_principal?: string | null;
  telefono_secundario?: string | null;
  celular?: string | null;
  correo?: string | null;
  direccion?: string | null;
  direccion_envio?: string | null;
  municipio?: string | null;
  departamento?: string | null;
  pais?: string | null;
  origen?: string | null;
  nombre_facturacion?: string | null;
  codigo_sap?: string | null;
  activo?: boolean | null;
  created_at?: string | null;
};

type IncidenteResumen = {
  id: number;
  codigo: string;
  estado: string;
  tipologia: string | null;
  descripcion_problema: string | null;
  created_at: string | null;
  producto?: { codigo: string; descripcion: string | null } | null;
};

type DireccionData = {
  id: number;
  direccion: string;
  es_principal: boolean | null;
};

export default function DetalleCliente() {
  const { codigo } = useParams<{ codigo: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [cliente, setCliente] = useState<ClienteData | null>(null);
  const [incidentes, setIncidentes] = useState<IncidenteResumen[]>([]);
  const [direcciones, setDirecciones] = useState<DireccionData[]>([]);

  useEffect(() => {
    if (codigo) {
      fetchClienteData();
    }
  }, [codigo]);

  const fetchClienteData = async () => {
    try {
      setLoading(true);
      
      // Buscar cliente por código
      const { results: clientes } = await apiBackendAction("clientes.search", { 
        search: codigo, 
        limit: 1 
      });
      
      if (!clientes || clientes.length === 0) {
        setLoading(false);
        return;
      }

      // Obtener cliente completo con direcciones
      const { result: clienteData } = await apiBackendAction("clientes.get", { 
        id: clientes[0].id 
      });

      if (clienteData) {
        setCliente(clienteData);
        setDirecciones((clienteData as any).direcciones || []);
      }

      // Obtener incidentes del cliente
      const { results: allIncidentes } = await apiBackendAction("incidentes.list", { 
        limit: 1000 
      });
      
      const clienteIncidentes = (allIncidentes || []).filter(
        (inc: any) => inc.cliente?.id === clientes[0].id
      ).map((inc: any) => ({
        id: inc.id,
        codigo: inc.codigo,
        estado: inc.estado,
        tipologia: inc.tipologia,
        descripcion_problema: inc.descripcion_problema,
        created_at: inc.created_at,
        producto: inc.producto,
      }));
      
      setIncidentes(clienteIncidentes);
    } catch (error) {
      console.error("Error fetching cliente data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Cliente no encontrado</h2>
          <p className="text-muted-foreground mb-4">
            No se encontró un cliente con el código "{codigo}"
          </p>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{cliente.nombre}</h1>
            <p className="text-muted-foreground">{cliente.codigo}</p>
          </div>
          <Badge variant={cliente.activo !== false ? "default" : "secondary"}>
            {cliente.activo !== false ? "Activo" : "Inactivo"}
          </Badge>
        </div>
        <Button variant="outline">
          <Edit className="h-4 w-4 mr-2" />
          Editar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info Principal */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Información del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Código</p>
                <p className="font-medium">{cliente.codigo}</p>
              </div>
              {cliente.codigo_sap && (
                <div>
                  <p className="text-sm text-muted-foreground">Código SAP</p>
                  <p className="font-medium">{cliente.codigo_sap}</p>
                </div>
              )}
              {cliente.nit && (
                <div>
                  <p className="text-sm text-muted-foreground">NIT</p>
                  <p className="font-medium">{cliente.nit}</p>
                </div>
              )}
              {cliente.origen && (
                <div>
                  <p className="text-sm text-muted-foreground">Origen</p>
                  <Badge variant="outline">{cliente.origen}</Badge>
                </div>
              )}
              {cliente.created_at && (
                <div>
                  <p className="text-sm text-muted-foreground">Cliente desde</p>
                  <p className="font-medium">{formatFechaCorta(cliente.created_at)}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Contacto */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Contacto
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cliente.telefono_principal && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{cliente.telefono_principal}</span>
                  </div>
                )}
                {cliente.celular && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{cliente.celular} (Celular)</span>
                  </div>
                )}
                {cliente.telefono_secundario && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{cliente.telefono_secundario} (Secundario)</span>
                  </div>
                )}
                {cliente.correo && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{cliente.correo}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Direcciones */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Direcciones
              </h3>
              <div className="space-y-3">
                {cliente.direccion && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p>{cliente.direccion}</p>
                      {(cliente.municipio || cliente.departamento) && (
                        <p className="text-sm text-muted-foreground">
                          {[cliente.municipio, cliente.departamento, cliente.pais]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {direcciones.map((dir) => (
                  <div key={dir.id} className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p>{dir.direccion}</p>
                      {dir.es_principal && (
                        <Badge variant="outline" className="text-xs mt-1">
                          Principal
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                {!cliente.direccion && direcciones.length === 0 && (
                  <p className="text-muted-foreground text-sm">Sin direcciones registradas</p>
                )}
              </div>
            </div>

            {cliente.nombre_facturacion && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Facturación
                  </h3>
                  <p>{cliente.nombre_facturacion}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Sidebar - Stats */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Incidentes</span>
                  <span className="text-2xl font-bold">{incidentes.length}</span>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Activos</span>
                    <span className="font-medium">
                      {incidentes.filter(i => !["ENTREGADO", "CANCELADO", "CERRADO"].includes(i.estado)).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Finalizados</span>
                    <span className="font-medium">
                      {incidentes.filter(i => ["ENTREGADO", "CERRADO"].includes(i.estado)).length}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Historial de Incidentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Historial de Incidentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {incidentes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Este cliente no tiene incidentes registrados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {incidentes.map((inc) => (
                <div
                  key={inc.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/mostrador/seguimiento/${inc.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium">{inc.codigo}</p>
                      <p className="text-sm text-muted-foreground">
                        {inc.producto?.codigo || "Sin producto"} - {inc.tipologia || "Sin tipo"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={inc.estado} />
                    <span className="text-sm text-muted-foreground">
                      {inc.created_at ? formatFechaCorta(inc.created_at) : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
