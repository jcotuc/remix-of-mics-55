import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, PackageCheck, User, Calendar, FileSignature, FileCheck, Printer, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SignatureCanvasComponent, SignatureCanvasRef } from "@/components/SignatureCanvas";
import { StatusBadge } from "@/components/StatusBadge";
import { SidebarMediaCapture, SidebarPhoto } from "@/components/SidebarMediaCapture";
import type { Database } from "@/integrations/supabase/types";
import type { StatusIncidente } from "@/types";
type IncidenteDB = Database['public']['Tables']['incidentes']['Row'];
type ClienteDB = Database['public']['Tables']['clientes']['Row'];
type DiagnosticoDB = Database['public']['Tables']['diagnosticos']['Row'];
export default function DetalleEntrega() {
  const {
    incidenteId
  } = useParams<{
    incidenteId: string;
  }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [delivering, setDelivering] = useState(false);
  const [incidente, setIncidente] = useState<IncidenteDB | null>(null);
  const [cliente, setCliente] = useState<ClienteDB | null>(null);
  const [diagnostico, setDiagnostico] = useState<DiagnosticoDB | null>(null);
  const [tecnicoNombre, setTecnicoNombre] = useState<string | null>(null);
  const [nombreRecibe, setNombreRecibe] = useState("");
  const [dpiRecibe, setDpiRecibe] = useState("");
  const [fotosSalida, setFotosSalida] = useState<SidebarPhoto[]>([]);
  const signatureRef = useRef<SignatureCanvasRef>(null);
  useEffect(() => {
    if (incidenteId) {
      fetchData();
    }
  }, [incidenteId]);
  useEffect(() => {
    // Cargar nombre del técnico cuando tengamos el diagnóstico
    const loadTecnicoNombre = async () => {
      if (diagnostico?.tecnico_codigo) {
        const {
          data
        } = await supabase.from('profiles').select('nombre, apellido').eq('codigo_empleado', diagnostico.tecnico_codigo).maybeSingle();
        if (data) {
          setTecnicoNombre(`${data.nombre} ${data.apellido}`);
        }
      }
    };
    loadTecnicoNombre();
  }, [diagnostico]);
  const fetchData = async () => {
    setLoading(true);
    try {
      // Cargar incidente
      const {
        data: incidenteData,
        error: incidenteError
      } = await supabase.from('incidentes').select('*').eq('id', incidenteId).single();
      if (incidenteError) throw incidenteError;
      if (!incidenteData) {
        toast.error("Incidente no encontrado");
        navigate('/mostrador/entrega-maquinas');
        return;
      }
      if (incidenteData.status !== 'Reparado') {
        toast.error("Este incidente no está listo para entrega");
        navigate('/mostrador/entrega-maquinas');
        return;
      }
      setIncidente(incidenteData);

      // Cargar cliente
      const {
        data: clienteData,
        error: clienteError
      } = await supabase.from('clientes').select('*').eq('codigo', incidenteData.codigo_cliente).single();
      if (clienteError) throw clienteError;
      setCliente(clienteData);

      // Cargar diagnóstico
      const {
        data: diagData
      } = await supabase.from('diagnosticos').select('*').eq('incidente_id', incidenteId).maybeSingle();
      setDiagnostico(diagData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error("Error al cargar la información del incidente");
      navigate('/mostrador/entrega-maquinas');
    } finally {
      setLoading(false);
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
      const {
        error: updateError
      } = await supabase.from('incidentes').update({
        status: 'Entregado' as any,
        confirmacion_cliente: {
          fecha_entrega: new Date().toISOString(),
          nombre_recibe: nombreRecibe,
          dpi_recibe: dpiRecibe,
          firma_base64: firmaBase64,
          fotos_salida: fotosSalida.map(f => f.comment || 'Sin comentario')
        }
      }).eq('id', incidente.id);
      if (updateError) throw updateError;
      toast.success("Entrega registrada exitosamente");
      navigate('/mostrador/entrega-maquinas');
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
            <p><span class="label">Técnico:</span><span class="value">${tecnicoNombre || diagnostico.tecnico_codigo}</span></p>
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
  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Cargando información...</p>
      </div>;
  }
  if (!incidente || !cliente) {
    return null;
  }
  return <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/mostrador/entrega-maquinas')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Entrega de Máquina</h1>
          <p className="text-muted-foreground">Incidente {incidente.codigo}</p>
        </div>
      </div>

      {/* Información del Incidente y Cliente en paralelo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card Información del Incidente */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <PackageCheck className="h-5 w-5 text-primary" />
              Información del Incidente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Código Incidente</Label>
                <p className="font-semibold">{incidente.codigo}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Estado</Label>
                <div className="mt-0.5">
                  <StatusBadge status={incidente.status as StatusIncidente} />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Código Producto</Label>
                <p className="font-medium">{incidente.codigo_producto}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Fecha Ingreso</Label>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-sm">{new Date(incidente.fecha_ingreso).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
            <Separator />
            <div>
              <Label className="text-xs text-muted-foreground">Descripción del Problema</Label>
              <p className="text-sm mt-1">{incidente.descripcion_problema}</p>
            </div>
          </CardContent>
        </Card>

        {/* Card Información del Cliente */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" />
              Información del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Nombre</Label>
                <p className="font-semibold">{cliente.nombre}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">NIT</Label>
                <p className="font-medium">{cliente.nit}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Teléfono</Label>
                <p className="text-sm">{cliente.celular}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Correo</Label>
                <p className="text-sm">{cliente.correo || "No registrado"}</p>
              </div>
              {cliente.direccion && <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Dirección</Label>
                  <p className="text-sm">{cliente.direccion}</p>
                </div>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Diagnóstico Técnico - Simplificado */}
      {diagnostico && <Card className="border-2 border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileCheck className="h-5 w-5 text-primary" />
                Diagnóstico Técnico
              </CardTitle>
              <Button variant="outline" size="sm" onClick={handlePrintDiagnostico}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {diagnostico.fallas && diagnostico.fallas.length > 0 && <div>
                  <p className="text-sm text-muted-foreground mb-2 font-medium">Fallas Detectadas</p>
                  <ul className="list-disc list-inside space-y-1 bg-muted p-3 rounded-md">
                    {diagnostico.fallas.map((falla, idx) => <li key={idx} className="text-sm">{falla}</li>)}
                  </ul>
                </div>}

              {diagnostico.causas && diagnostico.causas.length > 0 && <div>
                  <p className="text-sm text-muted-foreground mb-2 font-medium">Causas Identificadas</p>
                  <ul className="list-disc list-inside space-y-1 bg-muted p-3 rounded-md">
                    {diagnostico.causas.map((causa, idx) => <li key={idx} className="text-sm">{causa}</li>)}
                  </ul>
                </div>}
            </div>

            {/* Resolución - Solo mostrar "Reparar en Garantía" */}
            {diagnostico.resolucion && <div>
                <p className="text-sm text-muted-foreground mb-2 font-medium">Resolución</p>
                {(() => {
            try {
              const resolucionData = typeof diagnostico.resolucion === 'string' ? JSON.parse(diagnostico.resolucion) : diagnostico.resolucion;
              return <div className="bg-muted p-4 rounded-md flex items-center gap-4 flex-wrap">
                        {resolucionData.aplicaGarantia !== undefined && <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Reparado en Garantía:</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${resolucionData.aplicaGarantia ? 'bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-red-500/20 text-red-700 dark:text-red-400'}`}>
                              {resolucionData.aplicaGarantia ? 'Sí' : 'No'}
                            </span>
                          </div>}
                      </div>;
            } catch {
              return <p className="text-sm bg-muted p-3 rounded-md">{diagnostico.resolucion}</p>;
            }
          })()}
              </div>}

            {diagnostico.recomendaciones && <div>
                <p className="text-sm text-muted-foreground mb-2 font-medium">Recomendaciones</p>
                <p className="text-sm bg-muted p-3 rounded-md">{diagnostico.recomendaciones}</p>
              </div>}

            <Separator />

            {/* Info del técnico y costo - Sin tiempo estimado */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {diagnostico.costo_estimado && <div>
                  <p className="text-sm text-muted-foreground">Costo Estimado</p>
                  <p className="text-xl font-bold text-primary">
                    Q {Number(diagnostico.costo_estimado).toFixed(2)}
                  </p>
                </div>}

              <div>
                <p className="text-sm text-muted-foreground">Técnico que revisó</p>
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{tecnicoNombre || diagnostico.tecnico_codigo}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>}

      {/* Formulario de Entrega */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" />
            Registro de Entrega
          </CardTitle>
          
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre-recibe">Nombre Completo de Quien Recibe *</Label>
              <Input id="nombre-recibe" value={nombreRecibe} onChange={e => setNombreRecibe(e.target.value)} placeholder="Ej: Juan Pérez García" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dpi-recibe">DPI / Identificación *</Label>
              <Input id="dpi-recibe" value={dpiRecibe} onChange={e => setDpiRecibe(e.target.value)} placeholder="Ej: 1234567890101" />
            </div>
          </div>

          <SignatureCanvasComponent ref={signatureRef} />

          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => navigate('/mostrador/entrega-maquinas')}>
              Cancelar
            </Button>
            <Button onClick={handleDeliver} disabled={delivering} className="min-w-32">
              {delivering ? "Registrando..." : "Confirmar Entrega"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Widget de fotos en sidebar */}
      <SidebarMediaCapture photos={fotosSalida} onPhotosChange={setFotosSalida} tipo="salida" maxPhotos={10} commentRequired />
    </div>;
}