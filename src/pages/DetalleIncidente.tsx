import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Package,
  Wrench,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  Clock,
  ClipboardList,
  Camera,
  Truck,
  FilePenLine,
  ShieldCheck,
  Tag,
  Hash,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared";

import { formatFechaHora } from "@/utils/dateFormatters";
import { mycsapi } from "@/mics-api";

// Alias for legacy function name
const formatFechaConHora = formatFechaHora;

export default function DetalleIncidente() {
  const { incidenteId } = useParams<{ incidenteId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [incidente, setIncidente] = useState<any>(null);

  useEffect(() => {
    if (incidenteId) {
      fetchIncidenteData();
    }
  }, [incidenteId]);

  const fetchIncidenteData = async () => {
    try {
      setLoading(true);
      const result = await mycsapi.get("/api/v1/incidentes/{incidente_id}", { path: { incidente_id: Number(incidenteId) } });
      setIncidente(result);
    } catch (error) {
      console.error("Error fetching incidente data:", error);
      setIncidente(null);
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

  if (!incidente) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Incidente no encontrado</h2>
          <p className="text-muted-foreground mb-4">
            No se encontró un incidente con el ID "{incidenteId}"
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
            <h1 className="text-2xl font-bold">Incidente {incidente.codigo}</h1>
            <p className="text-muted-foreground">{incidente.tipologia}</p>
          </div>
          <StatusBadge status={incidente.estado} />
        </div>
        <Button variant="outline">
          <FilePenLine className="h-4 w-4 mr-2" />
          Editar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info Principal */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Detalles del Incidente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Código</p>
                <p className="font-medium">{incidente.codigo}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <Badge variant="outline">{incidente.tipologia}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <StatusBadge status={incidente.estado} />
              </div>
              {incidente.created_at && (
                <div>
                  <p className="text-sm text-muted-foreground">Fecha Creación</p>
                  <p className="font-medium">{formatFechaConHora(incidente.created_at)}</p>
                </div>
              )}
              {incidente.updated_at && (
                <div>
                  <p className="text-sm text-muted-foreground">Última Actualización</p>
                  <p className="font-medium">{formatFechaConHora(incidente.updated_at)}</p>
                </div>
              )}
              {incidente.tracking_token && (
                <div>
                  <p className="text-sm text-muted-foreground">Token de Seguimiento</p>
                  <p className="font-medium">{incidente.tracking_token}</p>
                </div>
              )}
              {incidente.incidente_origen_id && (
                <div>
                  <p className="text-sm text-muted-foreground">Incidente Origen</p>
                  <p className="font-medium">{incidente.incidente_origen_id}</p>
                </div>
              )}
              {incidente.aplica_garantia !== null && (
                <div>
                  <p className="text-sm text-muted-foreground">Aplica Garantía</p>
                  <Badge variant={incidente.aplica_garantia ? "default" : "secondary"}>
                    {incidente.aplica_garantia ? "Sí" : "No"}
                  </Badge>
                </div>
              )}
              {incidente.tipo_resolucion && (
                <div>
                  <p className="text-sm text-muted-foreground">Tipo de Resolución</p>
                  <Badge variant="outline">{incidente.tipo_resolucion}</Badge>
                </div>
              )}
            </div>

            {incidente.descripcion_problema && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" />
                    Descripción del Problema
                  </h3>
                  <p className="text-muted-foreground">{incidente.descripcion_problema}</p>
                </div>
              </>
            )}

            {incidente.observaciones && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Observaciones
                  </h3>
                  <p className="text-muted-foreground">{incidente.observaciones}</p>
                </div>
              </>
            )}

            {incidente.accesorios && incidente.accesorios.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Accesorios
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {incidente.accesorios.map((accesorio) => (
                      <Badge key={accesorio.id} variant="secondary">
                        {accesorio.nombre}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Sidebar - Related Info */}
        <div className="space-y-6">
          {incidente.cliente && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Cliente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{incidente.cliente.nombre}</p>
                <p className="text-sm text-muted-foreground">{incidente.cliente.codigo}</p>
                {incidente.cliente.telefono_principal && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                    <Phone className="h-3 w-3" />
                    <span>{incidente.cliente.telefono_principal}</span>
                  </div>
                )}
                {incidente.cliente.correo && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span>{incidente.cliente.correo}</span>
                  </div>
                )}
                {incidente.cliente.direccion && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{incidente.cliente.direccion}</span>
                  </div>
                )}
                <Button variant="link" className="px-0 mt-2" onClick={() => navigate(`/mostrador/clientes/${incidente.cliente?.codigo}`)}>
                  Ver Cliente
                </Button>
              </CardContent>
            </Card>
          )}

          {incidente.producto && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Producto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{incidente.producto.descripcion || incidente.producto.codigo}</p>
                <p className="text-sm text-muted-foreground">Código: {incidente.producto.codigo}</p>
                {incidente.producto.marca && <p className="text-sm text-muted-foreground">Marca: {incidente.producto.marca}</p>}
                {incidente.producto.modelo && <p className="text-sm text-muted-foreground">Modelo: {incidente.producto.modelo}</p>}
              </CardContent>
            </Card>
          )}

          {incidente.tecnicos && incidente.tecnicos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Técnicos Asignados
                </CardTitle>
              </CardHeader>
              <CardContent>
                {incidente.tecnicos.map((tecnico) => (
                  <div key={tecnico.id} className="mb-2">
                    <p className="font-medium">{tecnico.tecnico.nombre}</p>
                    <p className="text-sm text-muted-foreground">{tecnico.tecnico.email}</p>
                    {tecnico.es_principal && <Badge className="mt-1">Principal</Badge>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {incidente.centro_de_servicio && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Centro de Servicio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{incidente.centro_de_servicio.nombre}</p>
                <p className="text-sm text-muted-foreground">{incidente.centro_de_servicio.direccion}</p>
                {incidente.centro_de_servicio.telefono && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                    <Phone className="h-3 w-3" />
                    <span>{incidente.centro_de_servicio.telefono}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {incidente.guias && incidente.guias.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Guías de Envío
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {incidente.guias.map((guia) => (
                  <div key={guia.id} className="border p-3 rounded-lg">
                    <p className="font-medium">Tipo: {guia.tipo}</p>
                    <p className="text-sm text-muted-foreground">Estado: {guia.estado}</p>
                    {guia.tracking_number && <p className="text-sm text-muted-foreground">Tracking: {guia.tracking_number}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {incidente.media && incidente.media.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Archivos Multimedia
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {incidente.media.map((mediaItem) => (
                    <a key={mediaItem.id} href={mediaItem.url} target="_blank" rel="noopener noreferrer" className="block">
                      <img src={mediaItem.url} alt={mediaItem.descripcion || "Imagen del incidente"} className="w-full h-24 object-cover rounded-md" />
                      {mediaItem.descripcion && <p className="text-xs text-muted-foreground mt-1">{mediaItem.descripcion}</p>}
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
