import { useState, useRef, useEffect } from "react";
import { Search, PackageCheck, User, Calendar, FileSignature, CheckCircle, FileCheck, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SignatureCanvasComponent, SignatureCanvasRef } from "@/components/SignatureCanvas";
import { StatusBadge } from "@/components/StatusBadge";
import type { Database } from "@/integrations/supabase/types";
import type { StatusIncidente } from "@/types";
import { WhatsAppStyleMediaCapture, MediaFile } from "@/components/WhatsAppStyleMediaCapture";

type IncidenteDB = Database['public']['Tables']['incidentes']['Row'];
type ClienteDB = Database['public']['Tables']['clientes']['Row'];
type DiagnosticoDB = Database['public']['Tables']['diagnosticos']['Row'];

export default function EntregaMaquinas() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [delivering, setDelivering] = useState(false);
  const [loading, setLoading] = useState(true);
  const [incidentesReparados, setIncidentesReparados] = useState<IncidenteDB[]>([]);
  const [clientesMap, setClientesMap] = useState<Map<string, ClienteDB>>(new Map());
  const [incidente, setIncidente] = useState<IncidenteDB | null>(null);
  const [cliente, setCliente] = useState<ClienteDB | null>(null);
  const [diagnostico, setDiagnostico] = useState<DiagnosticoDB | null>(null);
  const [nombreRecibe, setNombreRecibe] = useState("");
  const [dpiRecibe, setDpiRecibe] = useState("");
  const [mediaSalida, setMediaSalida] = useState<MediaFile[]>([]);
  const signatureRef = useRef<SignatureCanvasRef>(null);

  useEffect(() => {
    fetchIncidentesReparados();
  }, []);

  const fetchIncidentesReparados = async () => {
    setLoading(true);
    try {
      // Buscar todos los incidentes en estado "Reparado"
      const { data: incidentesData, error: incidentesError } = await supabase
        .from('incidentes')
        .select('*')
        .eq('status', 'Reparado')
        .order('fecha_ingreso', { ascending: false });

      if (incidentesError) throw incidentesError;

      setIncidentesReparados(incidentesData || []);

      // Obtener todos los clientes únicos
      const codigosClientes = [...new Set(incidentesData?.map(i => i.codigo_cliente) || [])];
      
      if (codigosClientes.length > 0) {
        const { data: clientesData, error: clientesError } = await supabase
          .from('clientes')
          .select('*')
          .in('codigo', codigosClientes);

        if (clientesError) throw clientesError;

        const newClientesMap = new Map<string, ClienteDB>();
        clientesData?.forEach(cliente => {
          newClientesMap.set(cliente.codigo, cliente);
        });
        setClientesMap(newClientesMap);
      }
    } catch (error) {
      console.error('Error al cargar incidentes:', error);
      toast.error("Error al cargar las máquinas listas para entrega");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectIncidente = async (incidenteData: IncidenteDB) => {
    const clienteData = clientesMap.get(incidenteData.codigo_cliente);
    if (clienteData) {
      setIncidente(incidenteData);
      setCliente(clienteData);
      
      // Cargar diagnóstico
      const { data: diagData } = await supabase
        .from('diagnosticos')
        .select('*')
        .eq('incidente_id', incidenteData.id)
        .maybeSingle();
      setDiagnostico(diagData);
      
      // Scroll hacia el formulario
      setTimeout(() => {
        document.getElementById('formulario-entrega')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error("Ingrese un código de incidente para buscar");
      return;
    }

    setSearching(true);
    try {
      const { data: incidenteData, error: incidenteError } = await supabase
        .from('incidentes')
        .select('*')
        .eq('codigo', searchTerm.toUpperCase())
        .single();

      if (incidenteError) throw incidenteError;

      if (!incidenteData) {
        toast.error("Incidente no encontrado");
        return;
      }

      if (incidenteData.status !== 'Reparado') {
        toast.error("Este incidente no está en estado 'Reparado' y listo para entrega");
        setIncidente(null);
        setCliente(null);
        return;
      }

      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes')
        .select('*')
        .eq('codigo', incidenteData.codigo_cliente)
        .single();

      if (clienteError) throw clienteError;

      setIncidente(incidenteData);
      setCliente(clienteData);
      
      // Cargar diagnóstico
      const { data: diagData } = await supabase
        .from('diagnosticos')
        .select('*')
        .eq('incidente_id', incidenteData.id)
        .maybeSingle();
      setDiagnostico(diagData);
      
      toast.success("Incidente encontrado");
      
      // Scroll hacia el formulario
      setTimeout(() => {
        document.getElementById('formulario-entrega')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Error al buscar incidente:', error);
      toast.error("Error al buscar el incidente");
      setIncidente(null);
      setCliente(null);
    } finally {
      setSearching(false);
    }
  };

  const handleDeliver = async () => {
    if (!incidente) {
      toast.error("No hay incidente seleccionado");
      return;
    }

    if (!nombreRecibe.trim()) {
      toast.error("Ingrese el nombre de quien recibe");
      return;
    }

    if (!dpiRecibe.trim()) {
      toast.error("Ingrese el DPI/Identificación de quien recibe");
      return;
    }

    if (signatureRef.current?.isEmpty()) {
      toast.error("Se requiere la firma del cliente");
      return;
    }

    setDelivering(true);
    try {
      const firmaBase64 = signatureRef.current?.toDataURL();

      const { error: updateError } = await supabase
        .from('incidentes')
        .update({
          status: 'Entregado' as StatusIncidente,
          confirmacion_cliente: {
            fecha_entrega: new Date().toISOString(),
            nombre_recibe: nombreRecibe,
            dpi_recibe: dpiRecibe,
            firma_base64: firmaBase64,
          }
        })
        .eq('id', incidente.id);

      if (updateError) throw updateError;

      toast.success("Entrega registrada exitosamente");
      
      // Limpiar formulario y recargar lista
      setIncidente(null);
      setCliente(null);
      setSearchTerm("");
      setNombreRecibe("");
      setDpiRecibe("");
      setMediaSalida([]);
      signatureRef.current?.clear();
      setDiagnostico(null);
      fetchIncidentesReparados();
    } catch (error) {
      console.error('Error al registrar entrega:', error);
      toast.error("Error al registrar la entrega");
    } finally {
      setDelivering(false);
    }
  };

  const handlePrintDiagnostico = () => {
    if (!diagnostico || !incidente || !cliente) return;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Diagnóstico - ${incidente.codigo}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
            h2 { color: #666; margin-top: 20px; }
            .section { margin-bottom: 20px; }
            .label { font-weight: bold; color: #666; }
            .value { margin-left: 10px; }
            ul { margin: 5px 0; padding-left: 20px; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>Diagnóstico Técnico</h1>
          
          <div class="section">
            <h2>Información del Incidente</h2>
            <p><span class="label">Código:</span><span class="value">${incidente.codigo}</span></p>
            <p><span class="label">Fecha Ingreso:</span><span class="value">${new Date(incidente.fecha_ingreso).toLocaleDateString()}</span></p>
            <p><span class="label">Estado:</span><span class="value">${incidente.status}</span></p>
          </div>

          <div class="section">
            <h2>Cliente</h2>
            <p><span class="label">Nombre:</span><span class="value">${cliente.nombre}</span></p>
            <p><span class="label">NIT:</span><span class="value">${cliente.nit}</span></p>
            <p><span class="label">Teléfono:</span><span class="value">${cliente.celular}</span></p>
          </div>

          <div class="section">
            <h2>Producto</h2>
            <p><span class="label">Código:</span><span class="value">${incidente.codigo_producto}</span></p>
            <p><span class="label">Descripción:</span><span class="value">${incidente.descripcion_problema}</span></p>
          </div>

          <div class="section">
            <h2>Diagnóstico</h2>
            <p><span class="label">Técnico:</span><span class="value">${diagnostico.tecnico_codigo}</span></p>
            <p><span class="label">Estado:</span><span class="value">${diagnostico.estado}</span></p>
            
            ${diagnostico.fallas && diagnostico.fallas.length > 0 ? `
              <p class="label">Fallas Detectadas:</p>
              <ul>
                ${diagnostico.fallas.map((f: string) => `<li>${f}</li>`).join('')}
              </ul>
            ` : ''}
            
            ${diagnostico.causas && diagnostico.causas.length > 0 ? `
              <p class="label">Causas:</p>
              <ul>
                ${diagnostico.causas.map((c: string) => `<li>${c}</li>`).join('')}
              </ul>
            ` : ''}
            
            ${diagnostico.resolucion ? `
              <p class="label">Resolución:</p>
              <p>${diagnostico.resolucion}</p>
            ` : ''}
            
            ${diagnostico.recomendaciones ? `
              <p class="label">Recomendaciones:</p>
              <p>${diagnostico.recomendaciones}</p>
            ` : ''}
            
            ${diagnostico.costo_estimado ? `
              <p><span class="label">Costo Estimado:</span><span class="value">Q ${Number(diagnostico.costo_estimado).toFixed(2)}</span></p>
            ` : ''}
            
            ${diagnostico.tiempo_estimado ? `
              <p><span class="label">Tiempo Estimado:</span><span class="value">${diagnostico.tiempo_estimado}</span></p>
            ` : ''}
          </div>

          <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; background: #333; color: white; border: none; cursor: pointer;">
            Imprimir
          </button>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Entrega de Máquinas</h1>
        <p className="text-muted-foreground">
          Registre la entrega de máquinas reparadas con firma digital
        </p>
      </div>

      {/* Búsqueda Rápida */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Búsqueda Rápida
          </CardTitle>
          <CardDescription>
            Ingrese el código del incidente para búsqueda directa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="INC-000001"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="uppercase"
              />
            </div>
            <Button onClick={handleSearch} disabled={searching}>
              {searching ? "Buscando..." : "Buscar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Máquinas Listas para Entrega */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5" />
            Máquinas Listas para Entrega
          </CardTitle>
          <CardDescription>
            {incidentesReparados.length} máquinas reparadas esperando entrega
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Cargando máquinas...</p>
            </div>
          ) : incidentesReparados.length === 0 ? (
            <div className="text-center py-8">
              <PackageCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay máquinas listas para entrega en este momento</p>
              <p className="text-sm text-muted-foreground mt-2">
                Las máquinas aparecerán aquí cuando tengan estado "Reparado"
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Fecha Ingreso</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incidentesReparados.map((inc) => (
                    <TableRow key={inc.id}>
                      <TableCell className="font-medium">{inc.codigo}</TableCell>
                      <TableCell>
                        {clientesMap.get(inc.codigo_cliente)?.nombre || "Desconocido"}
                      </TableCell>
                      <TableCell>{inc.codigo_producto}</TableCell>
                      <TableCell>
                        {new Date(inc.fecha_ingreso).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={inc.status as StatusIncidente} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleSelectIncidente(inc)}
                          disabled={incidente?.id === inc.id}
                        >
                          {incidente?.id === inc.id ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Seleccionado
                            </>
                          ) : (
                            "Entregar"
                          )}
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

      {/* Información del Incidente y Cliente */}
      {incidente && cliente && (
        <>
          <div id="formulario-entrega" className="scroll-mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PackageCheck className="h-5 w-5" />
                  Información del Incidente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Código Incidente</Label>
                    <p className="text-lg font-semibold">{incidente.codigo}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Estado</Label>
                    <div className="mt-1">
                      <StatusBadge status={incidente.status as StatusIncidente} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Código Producto</Label>
                    <p className="text-lg font-medium">{incidente.codigo_producto}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Fecha Ingreso</Label>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p>{new Date(incidente.fecha_ingreso).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-muted-foreground">Descripción del Problema</Label>
                  <p className="mt-1">{incidente.descripcion_problema}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Información del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Nombre</Label>
                  <p className="text-lg font-semibold">{cliente.nombre}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">NIT</Label>
                  <p className="text-lg font-medium">{cliente.nit}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Teléfono</Label>
                  <p>{cliente.celular}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Correo</Label>
                  <p>{cliente.correo || "No registrado"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Diagnóstico */}
          {diagnostico && (
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileCheck className="h-5 w-5" />
                    Diagnóstico Técnico
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrintDiagnostico}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimir Diagnóstico
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {diagnostico.fallas && diagnostico.fallas.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2 font-medium">Fallas Detectadas</p>
                      <ul className="list-disc list-inside space-y-1 bg-muted p-3 rounded-md">
                        {diagnostico.fallas.map((falla, idx) => (
                          <li key={idx} className="text-sm">{falla}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {diagnostico.causas && diagnostico.causas.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2 font-medium">Causas Identificadas</p>
                      <ul className="list-disc list-inside space-y-1 bg-muted p-3 rounded-md">
                        {diagnostico.causas.map((causa, idx) => (
                          <li key={idx} className="text-sm">{causa}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {diagnostico.resolucion && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2 font-medium">Resolución</p>
                    <p className="text-sm bg-muted p-3 rounded-md">{diagnostico.resolucion}</p>
                  </div>
                )}

                {diagnostico.recomendaciones && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2 font-medium">Recomendaciones</p>
                    <p className="text-sm bg-muted p-3 rounded-md">{diagnostico.recomendaciones}</p>
                  </div>
                )}

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {diagnostico.costo_estimado && (
                    <div>
                      <p className="text-sm text-muted-foreground">Costo Estimado</p>
                      <p className="text-xl font-bold text-primary">
                        Q {Number(diagnostico.costo_estimado).toFixed(2)}
                      </p>
                    </div>
                  )}

                  {diagnostico.tiempo_estimado && (
                    <div>
                      <p className="text-sm text-muted-foreground">Tiempo Estimado</p>
                      <p className="font-medium">{diagnostico.tiempo_estimado}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-muted-foreground">Técnico</p>
                    <p className="font-medium">{diagnostico.tecnico_codigo}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}


          {/* Formulario de Entrega */}
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSignature className="h-5 w-5" />
                Registro de Entrega
              </CardTitle>
              <CardDescription>
                Complete la información de quien recibe la máquina y su firma
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre-recibe">Nombre Completo de Quien Recibe *</Label>
                  <Input
                    id="nombre-recibe"
                    value={nombreRecibe}
                    onChange={(e) => setNombreRecibe(e.target.value)}
                    placeholder="Ej: Juan Pérez García"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dpi-recibe">DPI / Identificación *</Label>
                  <Input
                    id="dpi-recibe"
                    value={dpiRecibe}
                    onChange={(e) => setDpiRecibe(e.target.value)}
                    placeholder="Ej: 1234567890101"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Fotos y Videos de Salida</Label>
                <WhatsAppStyleMediaCapture
                  media={mediaSalida}
                  onMediaChange={setMediaSalida}
                  maxFiles={10}
                />
              </div>

              <SignatureCanvasComponent ref={signatureRef} />

              <div className="flex justify-end gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIncidente(null);
                    setCliente(null);
                    setSearchTerm("");
                    setNombreRecibe("");
                    setDpiRecibe("");
                    setMediaSalida([]);
                    signatureRef.current?.clear();
                    setDiagnostico(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleDeliver}
                  disabled={delivering}
                  className="min-w-32"
                >
                  {delivering ? "Registrando..." : "Confirmar Entrega"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
