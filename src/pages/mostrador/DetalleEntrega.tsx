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
import { SignatureCanvasComponent, SignatureCanvasRef } from "@/components/SignatureCanvas";
import { StatusBadge } from "@/components/StatusBadge";
import { SidebarMediaCapture, SidebarPhoto } from "@/components/SidebarMediaCapture";
import DiagnosticoPrintSheet, { DiagnosticoPrintData } from "@/components/DiagnosticoPrintSheet";
import { createRoot } from 'react-dom/client';
import type { Database } from "@/integrations/supabase/types";

type StatusIncidente = Database["public"]["Enums"]["status_incidente"];

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
      // Validar que el incidente esté en un estado válido para entrega
      const estadosValidosEntrega = ['Reparado', 'Pendiente entrega'];
      if (!estadosValidosEntrega.includes(incidenteData.status)) {
        toast.error("Este incidente no está listo para entrega");
        navigate('/mostrador/entrega-maquinas');
        return;
      }
      setIncidente(incidenteData);

      // Cargar cliente, diagnóstico, producto, centro de servicio y solicitudes de repuestos en paralelo
      const [clienteRes, diagRes, productoRes, centroRes, solicitudesRes] = await Promise.all([
        supabase.from('clientes').select('*').eq('codigo', incidenteData.codigo_cliente).single(),
        supabase
          .from('diagnosticos')
          .select('*')
          .eq('incidente_id', incidenteId)
          .eq('estado', 'finalizado')
          .order('created_at', { ascending: false })
          .limit(1),
        supabase.from('productos').select('descripcion').eq('codigo', incidenteData.codigo_producto).maybeSingle(),
        incidenteData.centro_servicio 
          ? supabase.from('centros_servicio').select('nombre').eq('nombre', incidenteData.centro_servicio).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase
          .from('solicitudes_repuestos')
          .select('repuestos, estado, created_at')
          .eq('incidente_id', incidenteId)
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

      // Cargar repuestos utilizados (preferir diagnostico.repuestos_utilizados; si no existe, tomar de solicitudes_repuestos)
      let repuestosUtilizados: any[] = [];

      if (Array.isArray(diagData?.repuestos_utilizados) && diagData?.repuestos_utilizados?.length > 0) {
        repuestosUtilizados = diagData.repuestos_utilizados as any[];
      } else if (Array.isArray(solicitudesRes.data) && solicitudesRes.data.length > 0) {
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
      const {
        error: updateError
      } = await supabase.from('incidentes').update({
        status: 'Entregado' as any,
        fecha_entrega: fechaEntregaActual,
        confirmacion_cliente: {
          fecha_entrega: fechaEntregaActual,
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

    // Obtener el nombre del técnico (usar el estado o un fallback)
    const tecnicoDisplay = tecnicoNombre || diagnostico.tecnico_codigo || 'Sin asignar';

    // Parsear resolución del diagnóstico
    let resolucionData: any = {};
    try {
      resolucionData = typeof diagnostico.resolucion === 'string' 
        ? JSON.parse(diagnostico.resolucion) 
        : diagnostico.resolucion || {};
    } catch {
      resolucionData = {};
    }

    const tipoResolucion = resolucionData.tipoResolucion || 'Reparar en Garantía';
    const aplicaGarantia = resolucionData.aplicaGarantia ?? incidente.cobertura_garantia ?? false;
    const accesorios = incidente.accesorios || 'Ninguno';
    
    // Calcular costos
    const subtotalRepuestos = repuestosConPrecios.reduce((sum, r) => sum + (r.cantidad * r.precioUnitario), 0);
    const costoManoObra = 150;
    const costoEnvio = incidente.quiere_envio ? 75 : 0;
    const subtotalGeneral = subtotalRepuestos + costoManoObra + costoEnvio;
    
    let descuento = 0;
    let porcentajeDesc = 0;
    if (tipoResolucion === 'Reparar en Garantía' && aplicaGarantia) {
      descuento = subtotalGeneral;
      porcentajeDesc = 100;
    } else if (tipoResolucion === 'Canje' && resolucionData.porcentajeDescuento) {
      porcentajeDesc = resolucionData.porcentajeDescuento;
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
            <p class="text-xs"><span class="text-gray-500">Código:</span> ${incidente.codigo_producto}</p>
            <p class="text-xs"><span class="text-gray-500">SKU:</span> ${incidente.sku_maquina || 'N/A'}</p>
            <p class="text-xs"><span class="text-gray-500">Accesorios:</span> ${accesorios}</p>
          </div>
        </div>
        <div class="mb-2 border-2 border-orange-200 rounded overflow-hidden">
          <div class="bg-orange-100 px-2 py-1"><h3 class="font-bold text-orange-800 text-xs">DIAGNÓSTICO TÉCNICO</h3></div>
          <div class="p-2">
            <div class="grid grid-cols-2 gap-2">
              <div>
                <p class="font-semibold text-gray-600 text-xs">Fallas:</p>
                <ul class="list-disc list-inside text-xs">${(diagnostico.fallas || []).map((f: string) => `<li>${f}</li>`).join('')}</ul>
              </div>
              <div>
                <p class="font-semibold text-gray-600 text-xs">Causas:</p>
                <ul class="list-disc list-inside text-xs">${(diagnostico.causas || []).map((c: string) => `<li>${c}</li>`).join('')}</ul>
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
          ${aplicaGarantia && tipoResolucion === 'Reparar en Garantía' ? '<div class="mt-1 p-1 bg-green-50 border border-green-200 rounded text-xs text-green-700"><strong>✓ Reparación cubierta por garantía.</strong></div>' : ''}
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
            <OutlinedInput 
              label="Nombre Completo de Quien Recibe" 
              value={nombreRecibe} 
              onChange={e => setNombreRecibe(e.target.value)} 
              required 
            />
            <OutlinedInput 
              label="DPI / Identificación" 
              value={dpiRecibe} 
              onChange={e => setDpiRecibe(e.target.value)} 
              required 
            />
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