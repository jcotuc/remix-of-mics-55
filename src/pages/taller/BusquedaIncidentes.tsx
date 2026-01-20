import { useState, useEffect } from "react";
import { Search, Filter, Eye, Image as ImageIcon, Share2, Download, ExternalLink, Printer } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatFechaLarga, formatFechaHora, formatFechaCorta } from "@/utils/dateFormatters";
import { Skeleton } from "@/components/ui/skeleton";

interface Incidente {
  id: string;
  codigo: string;
  status: string;
  fecha_ingreso: string;
  codigo_cliente: string;
  codigo_producto: string;
  codigo_tecnico: string | null;
  descripcion_problema: string;
  familia_padre_id: number | null;
  tipologia: string | null;
  confirmacion_cliente: any;
}

interface Cliente {
  codigo: string;
  nombre: string;
  celular: string;
}

interface Producto {
  codigo: string;
  descripcion: string;
}

interface Diagnostico {
  tecnico_codigo: string;
  fallas: string[];
  causas: string[];
  resolucion: string | null;
  estado: string;
  created_at: string;
  recomendaciones: string | null;
  repuestos_utilizados: any;
  accesorios: string | null;
  tiempo_estimado: string | null;
}

interface MediaFile {
  id: string;
  nombre: string;
  descripcion: string | null;
  url: string;
  tipo: string;
}

export default function BusquedaIncidentes() {
  const [incidentes, setIncidentes] = useState<Incidente[]>([]);
  const [filteredIncidentes, setFilteredIncidentes] = useState<Incidente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<string>("todos");
  const [selectedIncidente, setSelectedIncidente] = useState<Incidente | null>(null);
  const [detalleData, setDetalleData] = useState<{
    cliente: Cliente | null;
    producto: Producto | null;
    diagnostico: Diagnostico | null;
    mediaFiles: MediaFile[];
  }>({
    cliente: null,
    producto: null,
    diagnostico: null,
    mediaFiles: [],
  });
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  useEffect(() => {
    fetchIncidentes();
  }, []);

  useEffect(() => {
    filterIncidentes();
  }, [searchTerm, estadoFiltro, incidentes]);

  const fetchIncidentes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("incidentes")
        .select("*")
        .in("status", ["En diagnostico", "Reparado"])
        .order("fecha_ingreso", { ascending: false });

      if (error) throw error;
      setIncidentes(data || []);
    } catch (error) {
      console.error("Error al cargar incidentes:", error);
      toast.error("Error al cargar los incidentes");
    } finally {
      setLoading(false);
    }
  };

  const filterIncidentes = () => {
    let filtered = [...incidentes];

    // Filtrar por búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (inc) =>
          inc.codigo.toLowerCase().includes(term) ||
          inc.codigo_cliente.toLowerCase().includes(term) ||
          inc.codigo_producto.toLowerCase().includes(term) ||
          inc.descripcion_problema.toLowerCase().includes(term)
      );
    }

    // Filtrar por estado
    if (estadoFiltro !== "todos") {
      filtered = filtered.filter((inc) => inc.status === estadoFiltro);
    }

    setFilteredIncidentes(filtered);
  };

  const handleVerDetalle = async (incidente: Incidente) => {
    setSelectedIncidente(incidente);
    setLoadingDetalle(true);

    try {
      // Obtener cliente
      const { data: clienteData } = await supabase
        .from("clientes")
        .select("codigo, nombre, celular")
        .eq("codigo", incidente.codigo_cliente)
        .single();

      // Obtener producto
      const { data: productoData } = await supabase
        .from("productos")
        .select("codigo, descripcion")
        .eq("codigo", incidente.codigo_producto)
        .single();

      // Obtener diagnóstico
      const { data: diagnosticoData } = await supabase
        .from("diagnosticos")
        .select("*")
        .eq("incidente_id", incidente.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Obtener archivos multimedia
      const { data: mediaData } = await supabase
        .from("media_files")
        .select("*")
        .eq("incidente_id", incidente.id)
        .order("created_at", { ascending: false });

      setDetalleData({
        cliente: clienteData,
        producto: productoData,
        diagnostico: diagnosticoData,
        mediaFiles: mediaData || [],
      });
    } catch (error) {
      console.error("Error al cargar detalles:", error);
      toast.error("Error al cargar los detalles del incidente");
    } finally {
      setLoadingDetalle(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    if (status === "Reparado") return "default";
    if (status === "En diagnostico") return "secondary";
    return "outline";
  };

  const handleCompartirMultimedia = () => {
    if (!detalleData.mediaFiles.length || !detalleData.cliente) return;
    
    const mensaje = `Hola ${detalleData.cliente.nombre}, aquí están las fotos/videos del incidente ${selectedIncidente?.codigo}:\n\n${detalleData.mediaFiles.map((file, idx) => `${idx + 1}. ${file.url}`).join('\n')}`;
    
    const whatsappUrl = `https://wa.me/${detalleData.cliente.celular.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(mensaje)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleDescargarFoto = async (url: string, nombre: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = nombre;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success("Imagen descargada");
    } catch (error) {
      console.error("Error al descargar:", error);
      toast.error("Error al descargar la imagen");
    }
  };

  const parseResolucion = (resolucion: string | null) => {
    if (!resolucion) return null;
    try {
      return JSON.parse(resolucion);
    } catch {
      return null;
    }
  };

  const handleImprimirDiagnostico = () => {
    if (!selectedIncidente || !detalleData.diagnostico) return;

    const resolucionData = parseResolucion(detalleData.diagnostico.resolucion);
    
    // Generar enlace multimedia
    const multimediaLinks = detalleData.mediaFiles.length > 0 
      ? detalleData.mediaFiles.map((file, idx) => `${idx + 1}. ${file.url}`).join('\n')
      : 'No hay multimedia disponible';
    
    const contenidoImpresion = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Diagnóstico ${selectedIncidente.codigo}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 40px;
              padding: 20px;
              color: #333;
              max-width: 800px;
              margin-left: auto;
              margin-right: auto;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              border-bottom: 3px solid #000;
              padding-bottom: 20px;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
            }
            .header h2 {
              margin: 10px 0;
              font-size: 20px;
              color: #666;
            }
            .info-header {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
              margin-bottom: 30px;
              padding: 15px;
              background: #f5f5f5;
              border-radius: 8px;
            }
            .info-header-item {
              margin-bottom: 8px;
            }
            .info-header-label {
              font-weight: bold;
              font-size: 12px;
              color: #666;
              text-transform: uppercase;
            }
            .info-header-value {
              font-size: 14px;
              margin-top: 2px;
            }
            .section {
              margin-bottom: 25px;
              page-break-inside: avoid;
            }
            .section-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 12px;
              color: #000;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .section-content {
              padding-left: 15px;
              line-height: 1.8;
              font-size: 14px;
            }
            .section-content p {
              margin: 8px 0;
              white-space: pre-wrap;
            }
            .item-list {
              margin: 8px 0;
            }
            .item {
              padding: 6px 0;
              border-bottom: 1px dotted #ddd;
            }
            .item:last-child {
              border-bottom: none;
            }
            .multimedia-link {
              word-break: break-all;
              color: #0066cc;
              font-size: 11px;
              line-height: 1.6;
              display: block;
              margin: 4px 0;
            }
            .footer {
              margin-top: 50px;
              padding-top: 20px;
              border-top: 2px solid #ccc;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
            @media print {
              body { margin: 0; padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>DIAGNÓSTICO TÉCNICO</h1>
            <h2>${selectedIncidente.codigo}</h2>
            <p style="margin: 5px 0; color: #666;">${format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}</p>
          </div>

          <div class="info-header">
            <div class="info-header-item">
              <div class="info-header-label">Cliente</div>
              <div class="info-header-value">${detalleData.cliente?.nombre || 'N/A'}</div>
            </div>
            <div class="info-header-item">
              <div class="info-header-label">Código Cliente</div>
              <div class="info-header-value">${detalleData.cliente?.codigo || 'N/A'}</div>
            </div>
            <div class="info-header-item">
              <div class="info-header-label">Producto</div>
              <div class="info-header-value">${detalleData.producto?.descripcion || 'N/A'}</div>
            </div>
            <div class="info-header-item">
              <div class="info-header-label">Código Producto</div>
              <div class="info-header-value">${detalleData.producto?.codigo || 'N/A'}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Fallas:</div>
            <div class="section-content">
              <div class="item-list">
                ${detalleData.diagnostico.fallas.map((f, idx) => `<div class="item">${idx + 1}. ${f}</div>`).join('')}
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Causas:</div>
            <div class="section-content">
              <div class="item-list">
                ${detalleData.diagnostico.causas.map((c, idx) => `<div class="item">${idx + 1}. ${c}</div>`).join('')}
              </div>
            </div>
          </div>

          ${detalleData.diagnostico.accesorios ? `
          <div class="section">
            <div class="section-title">Accesorios:</div>
            <div class="section-content">
              <p>${detalleData.diagnostico.accesorios}</p>
            </div>
          </div>
          ` : ''}

          ${detalleData.diagnostico.recomendaciones ? `
          <div class="section">
            <div class="section-title">Recomendación:</div>
            <div class="section-content">
              <p>${detalleData.diagnostico.recomendaciones}</p>
            </div>
          </div>
          ` : ''}

          ${selectedIncidente.confirmacion_cliente ? `
          <div class="section">
            <div class="section-title">Observaciones:</div>
            <div class="section-content">
              <p>${typeof selectedIncidente.confirmacion_cliente === 'object' ? 
                (selectedIncidente.confirmacion_cliente.observaciones || 'Sin observaciones') : 
                selectedIncidente.confirmacion_cliente}</p>
            </div>
          </div>
          ` : ''}

          ${resolucionData ? `
          <div class="section">
            <div class="section-title">Costo:</div>
            <div class="section-content">
              <p><strong>Tipo de Resolución:</strong> ${resolucionData.tipoResolucion || 'No especificado'}</p>
              ${resolucionData.tipoTrabajo ? `<p><strong>Tipo de Trabajo:</strong> ${resolucionData.tipoTrabajo}</p>` : ''}
              ${resolucionData.aplicaGarantia !== undefined ? `<p><strong>Garantía:</strong> ${resolucionData.aplicaGarantia ? "Aplica" : "No Aplica"}</p>` : ''}
            </div>
          </div>
          ` : ''}

          ${resolucionData ? `
          <div class="section">
            <div class="section-title">Resolución:</div>
            <div class="section-content">
              <p><strong>Tipo:</strong> ${resolucionData.tipoResolucion || 'No especificado'}</p>
              ${resolucionData.tipoTrabajo ? `<p><strong>Trabajo Realizado:</strong> ${resolucionData.tipoTrabajo}</p>` : ''}
            </div>
          </div>
          ` : ''}

          ${detalleData.diagnostico.repuestos_utilizados && Array.isArray(detalleData.diagnostico.repuestos_utilizados) && detalleData.diagnostico.repuestos_utilizados.length > 0 ? `
          <div class="section">
            <div class="section-title">Repuestos Utilizados:</div>
            <div class="section-content">
              <div class="item-list">
                ${detalleData.diagnostico.repuestos_utilizados.map((r: any, idx: number) => `
                  <div class="item">
                    ${idx + 1}. ${r.descripcion || r.codigo} - Cantidad: ${r.cantidad || 1}
                    ${r.codigo ? `<br><small style="color: #666;">Código: ${r.codigo}</small>` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
          ` : ''}

          <div class="section">
            <div class="section-title">Link de Multimedia (Fotos y Videos):</div>
            <div class="section-content">
              ${detalleData.mediaFiles.length > 0 ? 
                detalleData.mediaFiles.map((file, idx) => 
                  `<div class="multimedia-link">${idx + 1}. ${file.nombre}: ${file.url}</div>`
                ).join('') : 
                '<p>No hay multimedia disponible</p>'
              }
            </div>
          </div>

          <div class="footer">
            <p>Este documento ha sido generado automáticamente</p>
            <p>${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}</p>
          </div>

          <div class="no-print" style="margin-top: 30px; text-align: center; padding: 20px;">
            <button onclick="window.print()" style="padding: 12px 24px; font-size: 16px; cursor: pointer; background: #000; color: #fff; border: none; border-radius: 6px; margin-right: 10px;">
              Imprimir
            </button>
            <button onclick="window.close()" style="padding: 12px 24px; font-size: 16px; cursor: pointer; background: #666; color: #fff; border: none; border-radius: 6px;">
              Cerrar
            </button>
          </div>
        </body>
      </html>
    `;

    const ventanaImpresion = window.open('', '_blank');
    if (ventanaImpresion) {
      ventanaImpresion.document.write(contenidoImpresion);
      ventanaImpresion.document.close();
    } else {
      toast.error("No se pudo abrir la ventana de impresión");
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Búsqueda de Incidentes
          </CardTitle>
          <CardDescription>
            Consulta incidentes finalizados y en proceso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por código, cliente, producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="En diagnostico">En diagnóstico</SelectItem>
                <SelectItem value="Reparado">Reparado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabla de resultados */}
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha Ingreso</TableHead>
                    <TableHead>Familia</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIncidentes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No se encontraron incidentes
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredIncidentes.map((incidente) => (
                      <TableRow key={incidente.id}>
                        <TableCell className="font-medium">{incidente.codigo}</TableCell>
                        <TableCell>{incidente.codigo_cliente}</TableCell>
                        <TableCell>{incidente.codigo_producto}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(incidente.status)}>
                            {incidente.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(incidente.fecha_ingreso), "dd/MM/yyyy", { locale: es })}
                        </TableCell>
                        <TableCell>
                          {incidente.codigo_producto || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleVerDetalle(incidente)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalle
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Detalle */}
      <Dialog open={selectedIncidente !== null} onOpenChange={() => setSelectedIncidente(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Detalle del Incidente {selectedIncidente?.codigo}</DialogTitle>
            <DialogDescription>
              Información completa del diagnóstico y reparación
            </DialogDescription>
          </DialogHeader>

          {loadingDetalle ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="diagnostico">Diagnóstico</TabsTrigger>
                <TabsTrigger value="multimedia">Multimedia</TabsTrigger>
                <TabsTrigger value="cliente">Cliente</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 mt-4">
                {/* Información General */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Información General</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Estado</p>
                      <Badge variant={getStatusBadgeVariant(selectedIncidente?.status || "")} className="mt-1">
                        {selectedIncidente?.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Fecha Ingreso</p>
                      <p className="text-sm mt-1">
                        {selectedIncidente?.fecha_ingreso &&
                          format(new Date(selectedIncidente.fecha_ingreso), "dd/MM/yyyy HH:mm", {
                            locale: es,
                          })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Técnico Asignado</p>
                      <p className="text-sm mt-1">{selectedIncidente?.codigo_tecnico || "Sin asignar"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Código Producto</p>
                      <p className="text-sm mt-1">{selectedIncidente?.codigo_producto || "-"}</p>
                    </div>
                    {selectedIncidente?.tipologia && (
                      <div className="col-span-2">
                        <p className="text-sm font-medium text-muted-foreground">Tipología</p>
                        <Badge variant="outline" className="mt-1">{selectedIncidente.tipologia}</Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Producto */}
                {detalleData.producto && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Producto</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Descripción</p>
                        <p className="text-sm">{detalleData.producto.descripcion}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Código</p>
                        <p className="text-sm">{detalleData.producto.codigo}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Problema */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Problema Reportado</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedIncidente?.descripcion_problema}</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="diagnostico" className="space-y-4 mt-4">
                {detalleData.diagnostico ? (
                  <>
                    <div className="flex justify-end mb-4">
                      <Button
                        variant="outline"
                        onClick={handleImprimirDiagnostico}
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Imprimir Diagnóstico
                      </Button>
                    </div>
                    {/* Diagnóstico Principal */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Diagnóstico Técnico</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-2">Estado</p>
                          <Badge variant="outline">{detalleData.diagnostico.estado}</Badge>
                        </div>
                        
                        <Separator />

                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-2">Fallas Detectadas</p>
                          <div className="flex flex-wrap gap-2">
                            {detalleData.diagnostico.fallas.map((falla, idx) => (
                              <Badge key={idx} variant="destructive" className="text-xs">
                                {falla}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-2">Causas</p>
                          <div className="flex flex-wrap gap-2">
                            {detalleData.diagnostico.causas.map((causa, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {causa}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {detalleData.diagnostico.recomendaciones && (
                          <>
                            <Separator />
                            <div>
                              <p className="text-sm font-medium text-muted-foreground mb-2">Recomendaciones</p>
                              <p className="text-sm bg-muted p-3 rounded-md">{detalleData.diagnostico.recomendaciones}</p>
                            </div>
                          </>
                        )}

                        {detalleData.diagnostico.tiempo_estimado && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Tiempo Estimado</p>
                            <p className="text-sm">{detalleData.diagnostico.tiempo_estimado}</p>
                          </div>
                        )}

                        {detalleData.diagnostico.accesorios && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Accesorios</p>
                            <p className="text-sm">{detalleData.diagnostico.accesorios}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Resolución */}
                    {detalleData.diagnostico.resolucion && (() => {
                      const resolucionData = parseResolucion(detalleData.diagnostico.resolucion);
                      return (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">Resolución</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {resolucionData ? (
                              <>
                                {resolucionData.tipoResolucion && (
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-1">Tipo de Resolución</p>
                                    <Badge variant="default">{resolucionData.tipoResolucion}</Badge>
                                  </div>
                                )}
                                {resolucionData.tipoTrabajo && (
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-1">Tipo de Trabajo</p>
                                    <Badge variant="outline">{resolucionData.tipoTrabajo}</Badge>
                                  </div>
                                )}
                                {resolucionData.aplicaGarantia !== undefined && (
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-1">Garantía</p>
                                    <Badge variant={resolucionData.aplicaGarantia ? "default" : "secondary"}>
                                      {resolucionData.aplicaGarantia ? "Aplica Garantía" : "No Aplica Garantía"}
                                    </Badge>
                                  </div>
                                )}
                              </>
                            ) : (
                              <p className="text-sm">{detalleData.diagnostico.resolucion}</p>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })()}

                    {/* Repuestos Utilizados */}
                    {detalleData.diagnostico.repuestos_utilizados && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Repuestos Utilizados</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {Array.isArray(detalleData.diagnostico.repuestos_utilizados) ? (
                              detalleData.diagnostico.repuestos_utilizados.map((repuesto: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center p-3 bg-muted rounded-md">
                                  <div>
                                    <p className="text-sm font-medium">{repuesto.codigo || repuesto.descripcion}</p>
                                    {repuesto.descripcion && repuesto.codigo && (
                                      <p className="text-xs text-muted-foreground">{repuesto.descripcion}</p>
                                    )}
                                  </div>
                                  <Badge variant="outline">Cant: {repuesto.cantidad || 1}</Badge>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">No hay repuestos registrados</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No hay diagnóstico disponible para este incidente
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="multimedia" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Fotos y Videos
                      </CardTitle>
                      {detalleData.mediaFiles.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCompartirMultimedia}
                        >
                          <Share2 className="h-4 w-4 mr-2" />
                          Compartir con Cliente
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {detalleData.mediaFiles.length > 0 ? (
                      <div className="grid grid-cols-2 gap-4">
                        {detalleData.mediaFiles.map((file) => (
                          <div key={file.id} className="space-y-2">
                            <div className="relative group">
                              {file.tipo === "foto" ? (
                                <img
                                  src={file.url}
                                  alt={file.nombre}
                                  className="w-full h-48 object-cover rounded-lg border"
                                />
                              ) : (
                                <video
                                  src={file.url}
                                  controls
                                  className="w-full h-48 object-cover rounded-lg border"
                                />
                              )}
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                <Button
                                  size="icon"
                                  variant="secondary"
                                  className="h-8 w-8"
                                  onClick={() => handleDescargarFoto(file.url, file.nombre)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="secondary"
                                  className="h-8 w-8"
                                  onClick={() => window.open(file.url, '_blank')}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm font-medium">{file.nombre}</p>
                              {file.descripcion && (
                                <p className="text-xs text-muted-foreground">{file.descripcion}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No hay fotos o videos disponibles</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="cliente" className="space-y-4 mt-4">
                {/* Cliente */}
                {detalleData.cliente && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Información del Cliente</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Nombre</p>
                        <p className="text-sm">{detalleData.cliente.nombre}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Código</p>
                        <p className="text-sm">{detalleData.cliente.codigo}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Celular</p>
                        <p className="text-sm">{detalleData.cliente.celular}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Observaciones del Cliente */}
                {selectedIncidente?.confirmacion_cliente && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Observaciones del Cliente</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-muted p-4 rounded-md">
                        {typeof selectedIncidente.confirmacion_cliente === 'object' ? (
                          <div className="space-y-2">
                            {selectedIncidente.confirmacion_cliente.observaciones && (
                              <p className="text-sm">{selectedIncidente.confirmacion_cliente.observaciones}</p>
                            )}
                            {selectedIncidente.confirmacion_cliente.fecha && (
                              <p className="text-xs text-muted-foreground">
                                Fecha: {format(new Date(selectedIncidente.confirmacion_cliente.fecha), "dd/MM/yyyy HH:mm", { locale: es })}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm">{selectedIncidente.confirmacion_cliente}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
