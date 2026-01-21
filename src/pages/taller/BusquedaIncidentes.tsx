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
import { apiBackendAction } from "@/lib/api-backend";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import type { Database } from "@/integrations/supabase/types";

type IncidenteDB = Database["public"]["Tables"]["incidentes"]["Row"];
type ClienteDB = Database["public"]["Tables"]["clientes"]["Row"];
type ProductoDB = Database["public"]["Tables"]["productos"]["Row"];
type DiagnosticoDB = Database["public"]["Tables"]["diagnosticos"]["Row"];
type MediaDB = Database["public"]["Tables"]["media"]["Row"];

interface DetalleData {
  cliente: ClienteDB | null;
  producto: ProductoDB | null;
  diagnostico: DiagnosticoDB | null;
  mediaFiles: MediaDB[];
}

// Extended type to include nested objects from API
interface IncidenteConRelaciones extends Omit<IncidenteDB, 'cliente_id' | 'producto_id'> {
  cliente_id: number;
  producto_id: number | null;
  cliente?: ClienteDB | null;
  producto?: ProductoDB | null;
}

export default function BusquedaIncidentes() {
  const [incidentes, setIncidentes] = useState<IncidenteConRelaciones[]>([]);
  const [filteredIncidentes, setFilteredIncidentes] = useState<IncidenteConRelaciones[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<string>("todos");
  const [selectedIncidente, setSelectedIncidente] = useState<IncidenteConRelaciones | null>(null);
  const [detalleData, setDetalleData] = useState<DetalleData>({
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
      
      // Use apiBackendAction for incidentes
      const result = await apiBackendAction("incidentes.list", { limit: 1000 });
      
      // Filter by estados and sort by created_at, map to local type
      const filtered = result.results
        .filter(inc => ["EN_DIAGNOSTICO", "REPARADO"].includes(inc.estado))
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .map(inc => ({
          ...inc,
          cliente_id: inc.cliente?.id || 0,
          producto_id: inc.producto?.id || null,
          fecha_ingreso: inc.created_at,
        } as unknown as IncidenteConRelaciones));
      
      setIncidentes(filtered);
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
          inc.descripcion_problema?.toLowerCase().includes(term)
      );
    }

    // Filtrar por estado
    if (estadoFiltro !== "todos") {
      filtered = filtered.filter((inc) => inc.estado === estadoFiltro);
    }

    setFilteredIncidentes(filtered);
  };

  const handleVerDetalle = async (incidente: IncidenteConRelaciones) => {
    setSelectedIncidente(incidente);
    setLoadingDetalle(true);

    try {
      // Use nested objects from incidente if available, otherwise fetch
      let clienteData = incidente.cliente || null;
      let productoData = incidente.producto || null;

      // If not in incidente, fetch from registry
      if (!clienteData && incidente.cliente_id) {
        const clientesResult = await apiBackendAction("clientes.list", { limit: 5000 });
        clienteData = clientesResult.results.find(c => c.id === incidente.cliente_id) as unknown as ClienteDB || null;
      }
      
      if (!productoData && incidente.producto_id) {
        const productosResult = await apiBackendAction("productos.list", { limit: 2000 });
        productoData = productosResult.results.find(p => p.id === incidente.producto_id) as unknown as ProductoDB || null;
      }

      // Diagnóstico via apiBackendAction, media still via direct Supabase (not in registry)
      const [diagnosticoResult, mediaRes] = await Promise.all([
        apiBackendAction("diagnosticos.search", { incidente_id: incidente.id }),
        supabase
          .from("media")
          .select("*")
          .eq("incidente_id", incidente.id)
          .order("created_at", { ascending: false })
      ]);

      const diagnosticoData = diagnosticoResult.results?.[0] || null;

      setDetalleData({
        cliente: clienteData as ClienteDB | null,
        producto: productoData as ProductoDB | null,
        diagnostico: diagnosticoData as unknown as DiagnosticoDB | null,
        mediaFiles: mediaRes.data || [],
      });
    } catch (error) {
      console.error("Error al cargar detalles:", error);
      toast.error("Error al cargar los detalles del incidente");
    } finally {
      setLoadingDetalle(false);
    }
  };

  const getStatusBadgeVariant = (estado: string) => {
    if (estado === "REPARADO") return "default";
    if (estado === "EN_DIAGNOSTICO") return "secondary";
    return "outline";
  };

  const handleCompartirMultimedia = () => {
    if (!detalleData.mediaFiles.length || !detalleData.cliente) return;
    
    const mensaje = `Hola ${detalleData.cliente.nombre}, aquí están las fotos/videos del incidente ${selectedIncidente?.codigo}:\n\n${detalleData.mediaFiles.map((file, idx) => `${idx + 1}. ${file.url}`).join('\n')}`;
    
    const telefono = detalleData.cliente.celular || detalleData.cliente.telefono_principal || "";
    const whatsappUrl = `https://wa.me/${telefono.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(mensaje)}`;
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

  const handleImprimirDiagnostico = () => {
    if (!selectedIncidente || !detalleData.diagnostico) return;
    
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
            <div class="section-title">Estado del Diagnóstico:</div>
            <div class="section-content">
              <p>${detalleData.diagnostico.estado}</p>
            </div>
          </div>

          ${detalleData.diagnostico.recomendaciones ? `
          <div class="section">
            <div class="section-title">Recomendaciones:</div>
            <div class="section-content">
              <p>${detalleData.diagnostico.recomendaciones}</p>
            </div>
          </div>
          ` : ''}

          <div class="section">
            <div class="section-title">Link de Multimedia (Fotos y Videos):</div>
            <div class="section-content">
              ${detalleData.mediaFiles.length > 0 ? 
                detalleData.mediaFiles.map((file, idx) => 
                  `<div style="word-break: break-all; font-size: 11px; margin: 4px 0;">${idx + 1}. ${file.url}</div>`
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
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por código o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="EN_DIAGNOSTICO">En Diagnóstico</SelectItem>
                <SelectItem value="REPARADO">Reparado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabla */}
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Ingreso</TableHead>
                  <TableHead>Problema</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncidentes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No se encontraron incidentes
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredIncidentes.map((incidente) => (
                    <TableRow key={incidente.id}>
                      <TableCell className="font-mono font-semibold">
                        {incidente.codigo}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(incidente.estado)}>
                          {incidente.estado.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {incidente.fecha_ingreso
                          ? format(new Date(incidente.fecha_ingreso), "dd/MM/yyyy", { locale: es })
                          : "-"}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {incidente.descripcion_problema || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVerDetalle(incidente)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de detalle */}
      <Dialog open={!!selectedIncidente} onOpenChange={() => setSelectedIncidente(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del Incidente {selectedIncidente?.codigo}</DialogTitle>
            <DialogDescription>
              Información completa del incidente
            </DialogDescription>
          </DialogHeader>

          {loadingDetalle ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Cliente */}
              <div>
                <h4 className="font-semibold mb-2">Cliente</h4>
                <p>{detalleData.cliente?.nombre || "No disponible"}</p>
                <p className="text-sm text-muted-foreground">
                  {detalleData.cliente?.codigo}
                </p>
              </div>

              <Separator />

              {/* Producto */}
              <div>
                <h4 className="font-semibold mb-2">Producto</h4>
                <p>{detalleData.producto?.descripcion || "No disponible"}</p>
                <p className="text-sm text-muted-foreground">
                  {detalleData.producto?.codigo}
                </p>
              </div>

              <Separator />

              {/* Diagnóstico */}
              {detalleData.diagnostico && (
                <>
                  <div>
                    <h4 className="font-semibold mb-2">Diagnóstico</h4>
                    <div className="space-y-2">
                      <Badge>{detalleData.diagnostico.estado}</Badge>
                      {detalleData.diagnostico.recomendaciones && (
                        <p className="text-sm">{detalleData.diagnostico.recomendaciones}</p>
                      )}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Multimedia */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Multimedia ({detalleData.mediaFiles.length})</h4>
                  {detalleData.mediaFiles.length > 0 && (
                    <Button size="sm" variant="outline" onClick={handleCompartirMultimedia}>
                      <Share2 className="h-4 w-4 mr-1" />
                      Compartir
                    </Button>
                  )}
                </div>
                {detalleData.mediaFiles.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {detalleData.mediaFiles.map((file) => (
                      <div key={file.id} className="relative group">
                        {file.tipo === "FOTO" ? (
                          <img
                            src={file.url}
                            alt={file.descripcion || "Media"}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-full h-24 bg-muted rounded-lg flex items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-8 w-8"
                            onClick={() => window.open(file.url, "_blank")}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-8 w-8"
                            onClick={() => handleDescargarFoto(file.url, `media-${file.id}`)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin archivos multimedia</p>
                )}
              </div>

              {/* Acciones */}
              {detalleData.diagnostico && (
                <div className="pt-4">
                  <Button onClick={handleImprimirDiagnostico} className="w-full">
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimir Diagnóstico
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
