import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, PackageCheck, User, Calendar, FileSignature, FileCheck, Printer, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { OutlinedInput } from "@/components/ui/outlined-input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SignatureCanvasComponent, SignatureCanvasRef, StatusBadge } from "@/components/shared";
import { SidebarMediaCapture, SidebarPhoto } from "@/components/features/media";
import type { Database } from "@/integrations/supabase/types";

type IncidenteDB = Database['public']['Tables']['incidentes']['Row'];
type ClienteDB = Database['public']['Tables']['clientes']['Row'];
type DiagnosticoDB = Database['public']['Tables']['diagnosticos']['Row'];

export default function DetalleEntrega() {
  const { incidenteId } = useParams<{ incidenteId: string }>();
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
  const [productoInfo, setProductoInfo] = useState<{ descripcion: string } | null>(null);
  const [centroServicio, setCentroServicio] = useState<string>("HPC Centro de Servicio");
  const [repuestosConPrecios, setRepuestosConPrecios] = useState<Array<{codigo: string; descripcion: string; cantidad: number; precioUnitario: number}>>([]);
  const signatureRef = useRef<SignatureCanvasRef>(null);

  useEffect(() => {
    if (incidenteId) {
      fetchData();
    }
  }, [incidenteId]);

  useEffect(() => {
    // Cargar nombre del técnico cuando tengamos el diagnóstico
    const loadTecnicoNombre = async () => {
      if (diagnostico?.tecnico_id) {
        const { data } = await (supabase as any)
          .from('usuarios')
          .select('nombre')
          .eq('id', diagnostico.tecnico_id)
          .maybeSingle();
        if (data) {
          setTecnicoNombre(data.nombre);
        }
      }
    };
    loadTecnicoNombre();
  }, [diagnostico]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Cargar incidente
      const { data: incidenteData, error: incidenteError } = await supabase
        .from('incidentes')
        .select('*')
        .eq('id', Number(incidenteId))
        .single();
      
      if (incidenteError) throw incidenteError;
      if (!incidenteData) {
        toast.error("Incidente no encontrado");
        navigate('/mostrador/entrega-maquinas');
        return;
      }
      
      // Validar que el incidente esté en un estado válido para entrega
      const estadosValidosEntrega = ['REPARADO', 'PENDIENTE_ENTREGA'];
      if (!estadosValidosEntrega.includes(incidenteData.estado)) {
        toast.error("Este incidente no está listo para entrega");
        navigate('/mostrador/entrega-maquinas');
        return;
      }
      setIncidente(incidenteData);

      // Cargar cliente, diagnóstico, producto, centro de servicio y solicitudes de repuestos en paralelo
      const [clienteRes, diagRes, productoRes, centroRes, solicitudesRes] = await Promise.all([
        supabase.from('clientes').select('*').eq('id', incidenteData.cliente_id).single(),
        supabase
          .from('diagnosticos')
          .select('*')
          .eq('incidente_id', Number(incidenteId))
          .eq('estado', 'COMPLETADO')
          .order('created_at', { ascending: false })
          .limit(1),
        incidenteData.producto_id 
          ? supabase.from('productos').select('descripcion').eq('id', incidenteData.producto_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        incidenteData.centro_de_servicio_id 
          ? supabase.from('centros_de_servicio').select('nombre').eq('id', incidenteData.centro_de_servicio_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        (supabase as any)
          .from('solicitudes_repuestos')
          .select('repuestos, estado, created_at')
          .eq('incidente_id', Number(incidenteId))
          .order('created_at', { ascending: false })
          .limit(20)
      ]);

      if (clienteRes.error) throw clienteRes.error;
      setCliente(clienteRes.data);

      // diagRes.data es un array, tomamos el primer elemento
      const diagData = diagRes.data && diagRes.data.length > 0 ? diagRes.data[0] : null;
      setDiagnostico(diagData);
      setProductoInfo(productoRes.data);
      if (centroRes.data) {
        setCentroServicio(centroRes.data.nombre);
      }

      // Cargar repuestos utilizados (preferir diagnostico; si no existe, tomar de solicitudes_repuestos)
      let repuestosUtilizados: any[] = [];

      if (Array.isArray(solicitudesRes.data) && solicitudesRes.data.length > 0) {
        const entregadas = solicitudesRes.data.filter((s: any) => (s.estado || '').toLowerCase().includes('entreg'));
        const fuente = entregadas.length > 0 ? entregadas : solicitudesRes.data;
        repuestosUtilizados = fuente.flatMap((s: any) => (Array.isArray(s.repuestos) ? s.repuestos : []));
      }

      if (repuestosUtilizados.length > 0) {
        // Normalizar + agrupar por código
        const grouped = new Map<string, { codigo: string; descripcion: string; cantidad: number }>();
        for (const r of repuestosUtilizados) {
          const codigo = r?.codigo || r?.codigo_repuesto;
          if (!codigo) continue;
          const cantidad = Number(r?.cantidad ?? r?.cantidad_solicitada ?? 1) || 1;
          const descripcion = r?.descripcion || r?.descripcion_repuesto || '';

          const prev = grouped.get(codigo);
          grouped.set(codigo, {
            codigo,
            descripcion: prev?.descripcion || descripcion,
            cantidad: (prev?.cantidad || 0) + cantidad,
          });
        }

        const repuestosAgrupados = Array.from(grouped.values());
        const codigosRepuestos = repuestosAgrupados.map(r => r.codigo);

        const { data: inventarioData } = await supabase
          .from('inventario')
          .select('codigo_repuesto, costo_unitario, descripcion')
          .in('codigo_repuesto', codigosRepuestos);

        const invMap = new Map<string, { costo: number; descripcion: string }>();
        for (const inv of (inventarioData || [])) {
          const codigo = inv.codigo_repuesto;
          const costo = Number(inv.costo_unitario || 0);
          const desc = inv.descripcion || '';
          const prev = invMap.get(codigo);
          // Elegir el costo más alto como referencia (evita tomar 0 si hay múltiples filas)
          if (!prev || costo > prev.costo) {
            invMap.set(codigo, { costo, descripcion: desc });
          }
        }

        const repuestosConPrecio = repuestosAgrupados.map((r) => {
          const inv = invMap.get(r.codigo);
          return {
            codigo: r.codigo,
            descripcion: r.descripcion || inv?.descripcion || 'Sin descripción',
            cantidad: r.cantidad,
            precioUnitario: inv?.costo ?? 0,
          };
        });

        setRepuestosConPrecios(repuestosConPrecio);
      } else {
        setRepuestosConPrecios([]);
      }
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
      const fechaEntregaActual = new Date().toISOString();
      
      // Store delivery confirmation data in observaciones since confirmacion_cliente doesn't exist
      const confirmacionData = JSON.stringify({
        fecha_entrega: fechaEntregaActual,
        nombre_recibe: nombreRecibe,
        dpi_recibe: dpiRecibe,
        firma_base64: firmaBase64,
        fotos_salida: fotosSalida.map(f => f.comment || 'Sin comentario')
      });
      
      const observacionesActuales = incidente.observaciones || '';
      const nuevasObservaciones = `${observacionesActuales}\n[${fechaEntregaActual}] ENTREGA CONFIRMADA - Recibe: ${nombreRecibe}, DPI: ${dpiRecibe}`;
      
      const { error: updateError } = await (supabase as any)
        .from('incidentes')
        .update({
          estado: 'ENTREGADO',
          fecha_entrega: fechaEntregaActual,
          observaciones: nuevasObservaciones
        })
        .eq('id', incidente.id);
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

    // Obtener el nombre del técnico (usar el estado o un fallback)
    const tecnicoDisplay = tecnicoNombre || `Técnico ${diagnostico.tecnico_id}`;

    // Parsear resolución del diagnóstico
    const tipoResolucion = diagnostico.tipo_resolucion || 'Reparar en Garantía';
    const aplicaGarantia = diagnostico.aplica_garantia ?? incidente.aplica_garantia ?? false;
    const accesorios = 'Ninguno';
    
    // Calcular costos
    const subtotalRepuestos = repuestosConPrecios.reduce((sum, r) => sum + (r.cantidad * r.precioUnitario), 0);
    const costoManoObra = 150;
    const costoEnvio = incidente.quiere_envio ? 75 : 0;
    const subtotalGeneral = subtotalRepuestos + costoManoObra + costoEnvio;
    
    let descuento = 0;
    let porcentajeDesc = diagnostico.descuento_porcentaje || 0;
    if (tipoResolucion === 'REPARAR_EN_GARANTIA' && aplicaGarantia) {
      descuento = subtotalGeneral;
      porcentajeDesc = 100;
    } else if (porcentajeDesc > 0) {
      descuento = subtotalGeneral * (porcentajeDesc / 100);
    }
    const totalFinal = subtotalGeneral - descuento;

    // Generar filas de repuestos
    const repuestosRows = repuestosConPrecios.map(r => 
      `<tr><td class="border px-3 py-1">${r.codigo} - ${r.descripcion}</td><td class="border px-2 py-1 text-center">${r.cantidad}</td><td class="border px-3 py-1 text-right">Q ${r.precioUnitario.toFixed(2)}</td><td class="border px-3 py-1 text-right">Q ${(r.cantidad * r.precioUnitario).toFixed(2)}</td></tr>`
    ).join('');

    const printWindow = window.open('', '', 'width=900,height=700');
    if (!printWindow) return;

    printWindow.document.write(`<!DOCTYPE html><html><head><title>Diagnóstico - ${incidente.codigo}</title>
      <script src="https://cdn.tailwindcss.com"><\/script>
      <style>@media print { .no-print { display: none !important; } body { -webkit-print-color-adjust: exact; } } body { font-size: 11px; }</style>
    </head><body class="p-4 bg-white text-black font-sans">
      <div class="max-w-4xl mx-auto">
        <div class="flex justify-between items-start border-b-2 border-black pb-2 mb-2">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">HPC</div>
            <div><h1 class="font-bold text-lg">HPC Centro de Servicio</h1><p class="text-xs text-gray-600">${centroServicio}</p></div>
          </div>
          <div class="text-right"><h2 class="font-bold text-base text-orange-600">${tipoResolucion}</h2><p class="font-mono text-base font-bold">${incidente.codigo}</p></div>
        </div>
        <div class="grid grid-cols-2 gap-2 mb-2">
          <div class="border rounded p-2"><h3 class="font-bold text-xs mb-1 border-b pb-1">Cliente</h3>
            <p class="text-xs"><span class="text-gray-500">Código:</span> ${cliente.codigo}</p>
            <p class="text-xs"><span class="text-gray-500">Nombre:</span> ${cliente.nombre}</p>
            <p class="text-xs"><span class="text-gray-500">Teléfono:</span> ${cliente.celular}</p>
          </div>
          <div class="border rounded p-2"><h3 class="font-bold text-xs mb-1 border-b pb-1">Equipo</h3>
            <p class="text-xs"><span class="text-gray-500">Producto ID:</span> ${incidente.producto_id || 'N/A'}</p>
            <p class="text-xs"><span class="text-gray-500">Accesorios:</span> ${accesorios}</p>
          </div>
        </div>
        <div class="mb-2 border-2 border-orange-200 rounded overflow-hidden">
          <div class="bg-orange-100 px-2 py-1"><h3 class="font-bold text-orange-800 text-xs">DIAGNÓSTICO TÉCNICO</h3></div>
          <div class="p-2">
            <div class="grid grid-cols-2 gap-2">
              <div>
                <p class="font-semibold text-gray-600 text-xs">Resolución:</p>
                <p class="text-xs">${tipoResolucion}</p>
              </div>
              <div>
                <p class="font-semibold text-gray-600 text-xs">Aplica Garantía:</p>
                <p class="text-xs">${aplicaGarantia ? 'Sí' : 'No'}</p>
              </div>
            </div>
            ${diagnostico.recomendaciones ? `<p class="font-semibold text-gray-600 text-xs mt-1">Recomendaciones:</p><p class="bg-gray-50 p-1 rounded text-xs">${diagnostico.recomendaciones}</p>` : ''}
            <p class="text-xs mt-1 pt-1 border-t">Técnico: <strong>${tecnicoDisplay}</strong></p>
          </div>
        </div>
        ${(repuestosConPrecios.length > 0 || costoManoObra > 0) ? `
        <div class="mb-2"><h3 class="font-bold mb-1 text-xs">DETALLE DE COSTOS</h3>
          <table class="w-full border-collapse text-xs">
            <thead><tr class="bg-gray-100"><th class="border px-2 py-1 text-left">Concepto</th><th class="border px-1 py-1 text-center w-12">Cant.</th><th class="border px-2 py-1 text-right w-20">Precio</th><th class="border px-2 py-1 text-right w-20">Subtotal</th></tr></thead>
            <tbody>
              ${repuestosRows}
              <tr><td class="border px-2 py-1">Mano de Obra</td><td class="border px-1 py-1 text-center">1</td><td class="border px-2 py-1 text-right">Q ${costoManoObra.toFixed(2)}</td><td class="border px-2 py-1 text-right">Q ${costoManoObra.toFixed(2)}</td></tr>
              ${costoEnvio > 0 ? `<tr><td class="border px-2 py-1">Envío</td><td class="border px-1 py-1 text-center">1</td><td class="border px-2 py-1 text-right">Q ${costoEnvio.toFixed(2)}</td><td class="border px-2 py-1 text-right">Q ${costoEnvio.toFixed(2)}</td></tr>` : ''}
              <tr class="bg-gray-50"><td colspan="3" class="border px-2 py-1 text-right font-semibold">SUBTOTAL</td><td class="border px-2 py-1 text-right font-semibold">Q ${subtotalGeneral.toFixed(2)}</td></tr>
              ${descuento > 0 ? `<tr class="bg-green-50"><td colspan="3" class="border px-2 py-1 text-right font-semibold text-green-700">DESCUENTO (${porcentajeDesc}%)</td><td class="border px-2 py-1 text-right font-semibold text-green-700">-Q ${descuento.toFixed(2)}</td></tr>` : ''}
              <tr class="bg-orange-100"><td colspan="3" class="border px-2 py-1 text-right font-bold">TOTAL</td><td class="border px-2 py-1 text-right font-bold text-orange-700">Q ${totalFinal.toFixed(2)}</td></tr>
            </tbody>
          </table>
          ${aplicaGarantia && tipoResolucion === 'REPARAR_EN_GARANTIA' ? '<div class="mt-1 p-1 bg-green-50 border border-green-200 rounded text-xs text-green-700"><strong>✓ Reparación cubierta por garantía.</strong></div>' : ''}
        </div>` : ''}
      </div>
      <div class="no-print fixed bottom-4 right-4 flex gap-2">
        <button onclick="window.print()" class="px-4 py-2 bg-orange-500 text-white rounded-lg font-semibold">Imprimir</button>
        <button onclick="window.close()" class="px-4 py-2 bg-gray-500 text-white rounded-lg font-semibold">Cerrar</button>
      </div>
    </body></html>`);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Cargando información...</p>
      </div>
    );
  }

  if (!incidente || !cliente) {
    return null;
  }

  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Incidente Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PackageCheck className="h-5 w-5" />
                Información del Incidente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-sm">Código Incidente</Label>
                  <p className="font-mono font-bold">{incidente.codigo}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Estado</Label>
                  <div><StatusBadge status={incidente.estado} /></div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Producto</Label>
                  <p>{productoInfo?.descripcion || `ID: ${incidente.producto_id || 'N/A'}`}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Centro de Servicio</Label>
                  <p>{centroServicio}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cliente Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Información del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-sm">Nombre</Label>
                  <p className="font-medium">{cliente.nombre}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Código</Label>
                  <p className="font-mono">{cliente.codigo}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Teléfono</Label>
                  <p>{cliente.celular || cliente.telefono_principal || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Correo</Label>
                  <p>{cliente.correo || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Diagnóstico Summary */}
          {diagnostico && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Resumen del Diagnóstico
                </CardTitle>
                <Button variant="outline" size="sm" onClick={handlePrintDiagnostico}>
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir Diagnóstico
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-sm">Tipo Resolución</Label>
                    <p className="font-medium">{diagnostico.tipo_resolucion || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Aplica Garantía</Label>
                    <p>{diagnostico.aplica_garantia ? 'Sí' : 'No'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Técnico</Label>
                    <p>{tecnicoNombre || `ID: ${diagnostico.tecnico_id}`}</p>
                  </div>
                </div>
                {diagnostico.recomendaciones && (
                  <div>
                    <Label className="text-muted-foreground text-sm">Recomendaciones</Label>
                    <p className="text-sm bg-muted p-2 rounded mt-1">{diagnostico.recomendaciones}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Delivery Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSignature className="h-5 w-5" />
                Confirmación de Entrega
              </CardTitle>
              <CardDescription>
                Complete los datos de quien recibe la máquina
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <OutlinedInput
                label="Nombre de quien recibe *"
                value={nombreRecibe}
                onChange={(e) => setNombreRecibe(e.target.value)}
                placeholder="Nombre completo"
              />
              
              <OutlinedInput
                label="DPI / Identificación *"
                value={dpiRecibe}
                onChange={(e) => setDpiRecibe(e.target.value)}
                placeholder="Número de DPI o identificación"
              />

              <Separator />

              <div>
                <Label className="text-sm font-medium mb-2 block">Firma del Cliente *</Label>
                <SignatureCanvasComponent ref={signatureRef} />
              </div>

              <Separator />

              <div>
                <Label className="text-sm font-medium mb-2 block">Fotos de Salida (Opcional)</Label>
                <SidebarMediaCapture
                  tipo="salida"
                  photos={fotosSalida}
                  onPhotosChange={setFotosSalida}
                  maxPhotos={5}
                />
              </div>

              <Button 
                className="w-full" 
                size="lg"
                onClick={handleDeliver}
                disabled={delivering}
              >
                <FileCheck className="h-5 w-5 mr-2" />
                {delivering ? "Registrando..." : "Confirmar Entrega"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
