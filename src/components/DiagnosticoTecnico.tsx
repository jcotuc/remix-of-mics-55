import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Wrench, 
  Plus, 
  Trash2, 
  Search, 
  Camera,
  FileText,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Upload,
  Package,
  User,
  Info
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { PhotoGalleryWithDescriptions, PhotoWithDescription } from "@/components/PhotoGalleryWithDescriptions";
import { obtenerCodigoPadre } from "@/lib/repuestosService";

type RepuestoDB = Database['public']['Tables']['repuestos']['Row'];
type IncidenteDB = Database['public']['Tables']['incidentes']['Row'];

interface DiagnosticoTecnicoProps {
  incidente: IncidenteDB;
  onDiagnosticoCompleto: () => void;
}

export function DiagnosticoTecnico({ incidente, onDiagnosticoCompleto }: DiagnosticoTecnicoProps) {
  const [paso, setPaso] = useState(1);
  const [productoInfo, setProductoInfo] = useState<any>(null);
  const [clienteInfo, setClienteInfo] = useState<any>(null);
  const [repuestosDisponibles, setRepuestosDisponibles] = useState<RepuestoDB[]>([]);
  const [searchRepuesto, setSearchRepuesto] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSolicitudCambioDialog, setShowSolicitudCambioDialog] = useState(false);
  
  // Paso 1: Revisión
  const [fallas, setFallas] = useState<string[]>([""]);
  const [causas, setCausas] = useState<string[]>([""]);
  const [accesorios, setAccesorios] = useState("");
  const [fotos, setFotos] = useState<PhotoWithDescription[]>([]);
  
  // Paso 2: Repuestos
  const [repuestosSeleccionados, setRepuestosSeleccionados] = useState<{codigo: string, cantidad: number, descripcion: string, codigoOriginal?: string}[]>([]);
  const [notas, setNotas] = useState("");
  
  // Paso 3: Decisión Final
  const [estatusFinal, setEstatusFinal] = useState<string>("");
  const [recomendaciones, setRecomendaciones] = useState("");
  const [resolucion, setResolucion] = useState("");
  const [tiempoEstimado, setTiempoEstimado] = useState("");
  const [costoEstimado, setCostoEstimado] = useState("");
  
  // Solicitud de cambio
  const [tipoCambio, setTipoCambio] = useState<'garantia' | 'canje' | 'nota_credito'>('garantia');
  const [justificacion, setJustificacion] = useState("");
  
  // Auto-guardado
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    fetchRepuestos();
    fetchInfoAdicional();
  }, []);

  // Auto-guardado cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      if (fallas.some(f => f.trim() !== "") || causas.some(c => c.trim() !== "")) {
        guardarBorradorSilencioso();
      }
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [fallas, causas, accesorios, fotos, repuestosSeleccionados, recomendaciones, resolucion]);

  const fetchInfoAdicional = async () => {
    try {
      // Obtener info del producto
      const { data: producto } = await supabase
        .from('productos')
        .select('*')
        .eq('codigo', incidente.codigo_producto)
        .maybeSingle();
      
      if (producto) setProductoInfo(producto);

      // Obtener info del cliente
      const { data: cliente } = await supabase
        .from('clientes')
        .select('*')
        .eq('codigo', incidente.codigo_cliente)
        .maybeSingle();
      
      if (cliente) setClienteInfo(cliente);
    } catch (error) {
      console.error('Error:', error);
    }
  };


  const fetchRepuestos = async () => {
    try {
      const { data, error } = await supabase
        .from('repuestos')
        .select('*')
        .eq('codigo_producto', incidente.codigo_producto);
      
      if (error) throw error;
      setRepuestosDisponibles(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const agregarFalla = () => setFallas([...fallas, ""]);
  const eliminarFalla = (idx: number) => setFallas(fallas.filter((_, i) => i !== idx));
  const actualizarFalla = (idx: number, valor: string) => {
    const nuevasFallas = [...fallas];
    nuevasFallas[idx] = valor;
    setFallas(nuevasFallas);
  };

  const agregarCausa = () => setCausas([...causas, ""]);
  const eliminarCausa = (idx: number) => setCausas(causas.filter((_, i) => i !== idx));
  const actualizarCausa = (idx: number, valor: string) => {
    const nuevasCausas = [...causas];
    nuevasCausas[idx] = valor;
    setCausas(nuevasCausas);
  };

  const agregarRepuesto = async (repuesto: RepuestoDB) => {
    // Verificar si el código tiene un padre en la tabla de relaciones
    const { codigoPadre, descripcionPadre } = await obtenerCodigoPadre(repuesto.codigo);
    
    // Determinar qué código usar
    const codigoFinal = codigoPadre || repuesto.codigo;
    const descripcionFinal = descripcionPadre || repuesto.descripcion;
    const fueSustituido = codigoPadre !== null;
    
    const existente = repuestosSeleccionados.find(r => r.codigo === codigoFinal);
    if (existente) {
      setRepuestosSeleccionados(prev => 
        prev.map(r => r.codigo === codigoFinal ? {...r, cantidad: r.cantidad + 1} : r)
      );
    } else {
      setRepuestosSeleccionados(prev => [...prev, {
        codigo: codigoFinal,
        cantidad: 1,
        descripcion: descripcionFinal,
        codigoOriginal: fueSustituido ? repuesto.codigo : undefined
      }]);
    }
    
    // Mensaje informativo
    if (fueSustituido) {
      toast.success(`${repuesto.codigo} → ${codigoFinal} (código padre)`);
    } else {
      toast.success(`${descripcionFinal} agregado`);
    }
  };

  const eliminarRepuesto = (codigo: string) => {
    setRepuestosSeleccionados(prev => prev.filter(r => r.codigo !== codigo));
  };

  const actualizarCantidad = (codigo: string, cantidad: number) => {
    if (cantidad <= 0) {
      eliminarRepuesto(codigo);
    } else {
      setRepuestosSeleccionados(prev =>
        prev.map(r => r.codigo === codigo ? {...r, cantidad} : r)
      );
    }
  };

  const solicitarRepuestos = async () => {
    if (repuestosSeleccionados.length === 0) {
      toast.error("Selecciona al menos un repuesto");
      return;
    }

    // Verificar que todos los repuestos tengan descripción
    const repuestosSinDescripcion = repuestosSeleccionados.filter(r => !r.descripcion || r.descripcion.trim() === '');
    if (repuestosSinDescripcion.length > 0) {
      console.error('❌ Repuestos sin descripción:', repuestosSinDescripcion);
      toast.error("Error: Algunos repuestos no tienen descripción. Intenta agregarlos nuevamente.");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('No se pudo identificar el usuario. Por favor inicia sesión nuevamente.');
        return;
      }

      // Obtener perfil del usuario
      const { data: profile } = await supabase
        .from('profiles')
        .select('nombre, apellido')
        .eq('user_id', user.id)
        .maybeSingle();

      const tecnicoNombre = profile ? `${profile.nombre} ${profile.apellido}` : user.email || 'Técnico';

      console.log('📦 Repuestos seleccionados antes de enviar:', repuestosSeleccionados);

      // Insertar la solicitud - usar directamente repuestosSeleccionados
      const { data: solicitud, error: solicitudError } = await supabase
        .from('solicitudes_repuestos')
        .insert({
          incidente_id: incidente.id,
          tecnico_solicitante: tecnicoNombre,
          repuestos: repuestosSeleccionados,
          notas: notas || null,
          estado: 'pendiente'
        })
        .select()
        .single();

      if (solicitudError) {
        console.error('❌ Error detallado al insertar solicitud:', solicitudError);
        console.error('Código de error:', solicitudError.code);
        console.error('Mensaje:', solicitudError.message);
        console.error('Detalles:', solicitudError.details);
        
        if (solicitudError.code === '42501') {
          toast.error('No tienes permisos para crear solicitudes de repuestos. Contacta al administrador.');
        } else {
          toast.error(`Error: ${solicitudError.message}`);
        }
        return;
      }

      console.log('✅ Solicitud creada exitosamente:', solicitud);
      toast.success("Solicitud de repuestos enviada a bodega");
      setPaso(3);
    } catch (error: any) {
      console.error('❌ Error general al solicitar repuestos:', error);
      toast.error(`Error al solicitar repuestos: ${error.message || 'Error desconocido'}`);
    }
  };

  const guardarBorradorSilencioso = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existingDiag } = await supabase
        .from('diagnosticos')
        .select('id')
        .eq('incidente_id', incidente.id)
        .maybeSingle();

      const diagnosticoData = {
        incidente_id: incidente.id,
        tecnico_codigo: incidente.codigo_tecnico || user.email || 'técnico',
        digitador_codigo: null,
        fallas: fallas.filter(f => f.trim() !== ""),
        causas: causas.filter(c => c.trim() !== ""),
        repuestos_utilizados: repuestosSeleccionados,
        recomendaciones: recomendaciones,
        resolucion: resolucion,
        fotos_urls: fotos.map(f => f.preview),
        accesorios: accesorios,
        tiempo_estimado: tiempoEstimado,
        costo_estimado: costoEstimado ? parseFloat(costoEstimado) : null,
        estado: 'borrador'
      };

      if (existingDiag) {
        await supabase
          .from('diagnosticos')
          .update(diagnosticoData)
          .eq('id', existingDiag.id);
      } else {
        await supabase
          .from('diagnosticos')
          .insert(diagnosticoData);
      }

      setLastSaved(new Date());
    } catch (error) {
      console.error('Error guardando borrador:', error);
    }
  };

  const solicitarCambio = async () => {
    if (!justificacion.trim()) {
      toast.error("Debes justificar la solicitud");
      return;
    }

    // Fotos obligatorias para cambio por garantía
    if (tipoCambio === 'garantia' && fotos.length === 0) {
      toast.error("Debes agregar al menos una foto de evidencia para cambio por garantía");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      const fotosUrls = fotos.map(f => f.preview);

      const { error } = await supabase
        .from('solicitudes_cambio')
        .insert({
          incidente_id: incidente.id,
          tipo_cambio: tipoCambio,
          tecnico_solicitante: user.email || 'técnico',
          justificacion: justificacion,
          fotos_urls: fotosUrls,
          estado: 'pendiente'
        });

      if (error) throw error;

      toast.success("Solicitud enviada al supervisor regional para aprobación");
      setShowSolicitudCambioDialog(false);
      onDiagnosticoCompleto();
    } catch (error) {
      console.error('Error:', error);
      toast.error("Error al enviar solicitud");
    }
  };

  const guardarDiagnostico = async () => {
    if (!estatusFinal) {
      toast.error("Selecciona el estatus final");
      return;
    }

    if (fallas.filter(f => f.trim() !== "").length === 0) {
      toast.error("Debes agregar al menos una falla");
      return;
    }

    if (causas.filter(c => c.trim() !== "").length === 0) {
      toast.error("Debes agregar al menos una causa");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      // Check if diagnostico already exists
      const { data: existingDiag } = await supabase
        .from('diagnosticos')
        .select('id')
        .eq('incidente_id', incidente.id)
        .maybeSingle();

      // Guardar diagnóstico
      const diagnosticoData = {
        incidente_id: incidente.id,
        tecnico_codigo: incidente.codigo_tecnico || user.email || 'técnico',
        digitador_codigo: null,
        fallas: fallas.filter(f => f.trim() !== ""),
        causas: causas.filter(c => c.trim() !== ""),
        repuestos_utilizados: repuestosSeleccionados,
        recomendaciones: recomendaciones,
        resolucion: resolucion,
        fotos_urls: fotos.map(f => f.preview),
        accesorios: accesorios,
        tiempo_estimado: tiempoEstimado,
        costo_estimado: costoEstimado ? parseFloat(costoEstimado) : null,
        estado: 'completado',
        digitador_asignado: null,
        fecha_inicio_digitacion: null
      };

      let diagError;
      if (existingDiag) {
        // Update existing
        const { error } = await supabase
          .from('diagnosticos')
          .update(diagnosticoData)
          .eq('id', existingDiag.id);
        diagError = error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('diagnosticos')
          .insert(diagnosticoData);
        diagError = error;
      }

      if (diagError) throw diagError;

      // Mapear estatus final a los estados del sistema
      type StatusIncidente = "Ingresado" | "En ruta" | "Pendiente de diagnostico" | "En diagnostico" | "Pendiente por repuestos" | "Presupuesto" | "Porcentaje" | "Reparado" | "Cambio por garantia" | "Nota de credito" | "Bodega pedido" | "Rechazado" | "Pendiente entrega" | "Logistica envio" | "Pendiente de aprobación NC";
      
      let nuevoEstatus: StatusIncidente = incidente.status;
      
      switch (estatusFinal) {
        case 'reparado':
          nuevoEstatus = 'Reparado';
          break;
        case 'pendiente_repuestos':
          nuevoEstatus = 'Pendiente por repuestos';
          break;
        case 'presupuesto':
          nuevoEstatus = 'Presupuesto';
          break;
        case 'porcentaje':
          nuevoEstatus = 'Porcentaje';
          break;
        case 'cambio_garantia':
          nuevoEstatus = 'Cambio por garantia';
          break;
        case 'nota_credito':
          nuevoEstatus = 'Nota de credito';
          break;
        case 'pendiente_entrega':
          nuevoEstatus = 'Pendiente entrega';
          break;
        case 'logistica_envio':
          nuevoEstatus = 'Logistica envio';
          break;
      }

      const { error: incError } = await supabase
        .from('incidentes')
        .update({ status: nuevoEstatus })
        .eq('id', incidente.id);

      if (incError) throw incError;

      toast.success("Diagnóstico guardado exitosamente");
      setShowConfirmDialog(false);
      onDiagnosticoCompleto();
    } catch (error) {
      console.error('Error:', error);
      toast.error("Error al guardar diagnóstico");
    }
  };

  const filteredRepuestos = repuestosDisponibles.filter(r =>
    r.descripcion.toLowerCase().includes(searchRepuesto.toLowerCase()) ||
    r.codigo.toLowerCase().includes(searchRepuesto.toLowerCase())
  );

  return (
    <div className="space-y-6 mb-6">
      {/* Información de la Máquina */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            Información de la Máquina
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6">
            {/* Foto de la máquina */}
            {productoInfo?.url_foto && (
              <div className="flex justify-center lg:justify-start">
                <div className="w-48 h-48 rounded-lg overflow-hidden border-2 border-border bg-muted flex items-center justify-center">
                  <img 
                    src={productoInfo.url_foto} 
                    alt={productoInfo.descripcion}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder.svg';
                    }}
                  />
                </div>
              </div>
            )}
            
            {/* Información del producto */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <p className="text-xs text-muted-foreground mb-1">Descripción de la Máquina</p>
                <p className="font-semibold text-base">{productoInfo?.descripcion || incidente.codigo_producto}</p>
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground mb-1">Código del Producto</p>
                <p className="font-semibold">{incidente.codigo_producto}</p>
              </div>
              
              {productoInfo && (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Estado</p>
                    {productoInfo.descontinuado ? (
                      <Badge variant="destructive">Descontinuado</Badge>
                    ) : (
                      <Badge className="bg-green-500 text-white">Vigente</Badge>
                    )}
                  </div>
                  
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Familia ID</p>
                    <p className="font-semibold">{productoInfo.familia_padre_id || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Clave</p>
                    <p className="font-semibold">{productoInfo.clave}</p>
                  </div>
                </>
              )}
              
              {incidente.sku_maquina && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">SKU</p>
                  <p className="font-semibold">{incidente.sku_maquina}</p>
                </div>
              )}
              
              {clienteInfo && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Cliente</p>
                  <p className="font-semibold">{clienteInfo.nombre}</p>
                  <p className="text-xs text-muted-foreground">{clienteInfo.codigo}</p>
                </div>
              )}
              
              <div>
                <p className="text-xs text-muted-foreground mb-1">Garantía</p>
                {incidente.cobertura_garantia ? (
                  <Badge className="bg-green-500 text-white">Con Garantía</Badge>
                ) : (
                  <Badge variant="outline">Sin Garantía</Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información Adicional */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-5 w-5" />
            Información del Ingreso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {incidente.descripcion_problema && (
              <div className="md:col-span-2">
                <p className="text-xs text-muted-foreground mb-1">Problema Reportado por el Cliente</p>
                <p className="text-sm bg-muted/30 p-3 rounded-lg">{incidente.descripcion_problema}</p>
              </div>
            )}
            {incidente.accesorios && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Accesorios Incluidos</p>
                <p className="text-sm">{incidente.accesorios}</p>
              </div>
            )}
            {incidente.log_observaciones && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Observaciones de Logística</p>
                <p className="text-sm">{incidente.log_observaciones}</p>
              </div>
            )}
            {incidente.persona_deja_maquina && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Persona que dejó la máquina</p>
                <p className="text-sm">{incidente.persona_deja_maquina}</p>
              </div>
            )}
            {incidente.producto_descontinuado && (
              <div className="md:col-span-2">
                <Badge variant="destructive" className="text-sm">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Producto Descontinuado
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Progress Steps */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center flex-1">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                paso >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                  1
                </div>
                <p className="text-xs mt-2 text-center">Revisar<br/>Máquina</p>
              </div>
              <ArrowRight className={`h-6 w-6 ${paso > 1 ? 'text-primary' : 'text-muted'}`} />
              <div className="flex flex-col items-center flex-1">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                  paso >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  2
                </div>
                <p className="text-xs mt-2 text-center">Solicitar<br/>Repuestos</p>
              </div>
              <ArrowRight className={`h-6 w-6 ${paso > 2 ? 'text-primary' : 'text-muted'}`} />
              <div className="flex flex-col items-center flex-1">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                  paso >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  3
                </div>
                <p className="text-xs mt-2 text-center">Decisión<br/>Final</p>
              </div>
            </div>
          </CardContent>
        </Card>

      {/* Paso 1: Revisar Máquina */}
      {paso === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Paso 1: Revisar la Máquina
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Fallas Encontradas */}
            <div className="space-y-3">
              <label className="text-sm font-medium flex items-center justify-between">
                Fallas Encontradas
                <Button size="sm" variant="outline" onClick={agregarFalla}>
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar
                </Button>
              </label>
              {fallas.map((falla, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    placeholder="Describe la falla encontrada..."
                    value={falla}
                    onChange={(e) => actualizarFalla(idx, e.target.value)}
                  />
                  {fallas.length > 1 && (
                    <Button size="icon" variant="ghost" onClick={() => eliminarFalla(idx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Causas */}
            <div className="space-y-3">
              <label className="text-sm font-medium flex items-center justify-between">
                Causas Identificadas
                <Button size="sm" variant="outline" onClick={agregarCausa}>
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar
                </Button>
              </label>
              {causas.map((causa, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    placeholder="Describe la causa de la falla..."
                    value={causa}
                    onChange={(e) => actualizarCausa(idx, e.target.value)}
                  />
                  {causas.length > 1 && (
                    <Button size="icon" variant="ghost" onClick={() => eliminarCausa(idx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Accesorios */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Accesorios Revisados</label>
              <Textarea
                placeholder="Lista de accesorios incluidos con la máquina..."
                value={accesorios}
                onChange={(e) => setAccesorios(e.target.value)}
                rows={3}
              />
            </div>

            {/* Fotos con Descripción (Gembadocs Style) */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Fotos del Diagnóstico</label>
              <PhotoGalleryWithDescriptions 
                photos={fotos}
                onPhotosChange={setFotos}
                maxPhotos={20}
              />
            </div>

            {/* Fotos */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Fotos del Diagnóstico
              </label>
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Subir fotos (Próximamente)
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex justify-end gap-2">
              <Button onClick={() => setPaso(2)} size="lg">
                Siguiente: Repuestos
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Paso 2: Solicitar Repuestos */}
      {paso === 2 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Buscar Repuestos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Buscar por código o descripción..."
                value={searchRepuesto}
                onChange={(e) => setSearchRepuesto(e.target.value)}
              />
              
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {filteredRepuestos.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => agregarRepuesto(rep)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{rep.descripcion}</p>
                        <p className="text-xs text-muted-foreground">Código: {rep.codigo}</p>
                        <div className="flex gap-2 mt-2">
                          {rep.stock_actual && rep.stock_actual > 0 ? (
                            <Badge className="bg-green-500 text-white text-xs">
                              Stock: {rep.stock_actual}
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs">Sin stock</Badge>
                          )}
                        </div>
                      </div>
                      <Plus className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Repuestos Seleccionados ({repuestosSeleccionados.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {repuestosSeleccionados.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                  <p className="text-sm text-muted-foreground">No has seleccionado repuestos</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {repuestosSeleccionados.map((rep) => (
                      <div key={rep.codigo} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-sm">{rep.descripcion}</p>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => eliminarRepuesto(rep.codigo)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-muted-foreground">Cantidad:</label>
                          <Input
                            type="number"
                            min="1"
                            value={rep.cantidad}
                            onChange={(e) => actualizarCantidad(rep.codigo, parseInt(e.target.value))}
                            className="w-20 h-8"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Notas para Bodega</label>
                    <Textarea
                      placeholder="Notas adicionales para el bodegero..."
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                      rows={3}
                    />
                  </div>
                </>
              )}

              <Separator />

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPaso(1)} className="flex-1">
                  Volver
                </Button>
                {repuestosSeleccionados.length > 0 && (
                  <Button onClick={solicitarRepuestos} className="flex-1">
                    Solicitar a Bodega
                  </Button>
                )}
                <Button variant="outline" onClick={() => setPaso(3)}>
                  Saltar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Paso 3: Decisión Final */}
      {paso === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Paso 3: Decisión Final del Diagnóstico
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Estatus Final - Visual con botones */}
            <div className="space-y-3">
              <label className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-primary" />
                Resolución del Diagnóstico *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setEstatusFinal('reparado')}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    estatusFinal === 'reparado'
                      ? 'border-green-500 bg-green-500/10 shadow-md'
                      : 'border-border hover:border-green-500/50 hover:bg-muted'
                  }`}
                >
                  <div className="text-2xl mb-1">✓</div>
                  <div className="font-semibold text-sm">Reparado</div>
                  <div className="text-xs text-muted-foreground">Equipo funcional</div>
                </button>

                <button
                  type="button"
                  onClick={() => setEstatusFinal('pendiente_entrega')}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    estatusFinal === 'pendiente_entrega'
                      ? 'border-blue-500 bg-blue-500/10 shadow-md'
                      : 'border-border hover:border-blue-500/50 hover:bg-muted'
                  }`}
                >
                  <div className="text-2xl mb-1">📦</div>
                  <div className="font-semibold text-sm">Pendiente Entrega</div>
                  <div className="text-xs text-muted-foreground">Listo para cliente</div>
                </button>

                <button
                  type="button"
                  onClick={() => setEstatusFinal('logistica_envio')}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    estatusFinal === 'logistica_envio'
                      ? 'border-indigo-500 bg-indigo-500/10 shadow-md'
                      : 'border-border hover:border-indigo-500/50 hover:bg-muted'
                  }`}
                >
                  <div className="text-2xl mb-1">🚚</div>
                  <div className="font-semibold text-sm">Logística Envío</div>
                  <div className="text-xs text-muted-foreground">Enviar al cliente</div>
                </button>

                <button
                  type="button"
                  onClick={() => setEstatusFinal('pendiente_repuestos')}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    estatusFinal === 'pendiente_repuestos'
                      ? 'border-amber-500 bg-amber-500/10 shadow-md'
                      : 'border-border hover:border-amber-500/50 hover:bg-muted'
                  }`}
                >
                  <div className="text-2xl mb-1">⏳</div>
                  <div className="font-semibold text-sm">Pendiente Repuestos</div>
                  <div className="text-xs text-muted-foreground">Falta material</div>
                </button>

                <button
                  type="button"
                  onClick={() => setEstatusFinal('presupuesto')}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    estatusFinal === 'presupuesto'
                      ? 'border-purple-500 bg-purple-500/10 shadow-md'
                      : 'border-border hover:border-purple-500/50 hover:bg-muted'
                  }`}
                >
                  <div className="text-2xl mb-1">💰</div>
                  <div className="font-semibold text-sm">Presupuesto</div>
                  <div className="text-xs text-muted-foreground">Cotizar reparación</div>
                </button>

                <button
                  type="button"
                  onClick={() => setEstatusFinal('porcentaje')}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    estatusFinal === 'porcentaje'
                      ? 'border-orange-500 bg-orange-500/10 shadow-md'
                      : 'border-border hover:border-orange-500/50 hover:bg-muted'
                  }`}
                >
                  <div className="text-2xl mb-1">🔄</div>
                  <div className="font-semibold text-sm">Porcentaje/Canje</div>
                  <div className="text-xs text-muted-foreground">Requiere aprobación</div>
                </button>

                <button
                  type="button"
                  onClick={() => setEstatusFinal('cambio_garantia')}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    estatusFinal === 'cambio_garantia'
                      ? 'border-cyan-500 bg-cyan-500/10 shadow-md'
                      : 'border-border hover:border-cyan-500/50 hover:bg-muted'
                  }`}
                >
                  <div className="text-2xl mb-1">🛡️</div>
                  <div className="font-semibold text-sm">Cambio Garantía</div>
                  <div className="text-xs text-muted-foreground">Defecto de fábrica</div>
                </button>

                <button
                  type="button"
                  onClick={() => setEstatusFinal('nota_credito')}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    estatusFinal === 'nota_credito'
                      ? 'border-pink-500 bg-pink-500/10 shadow-md'
                      : 'border-border hover:border-pink-500/50 hover:bg-muted'
                  }`}
                >
                  <div className="text-2xl mb-1">📝</div>
                  <div className="font-semibold text-sm">Nota de Crédito</div>
                  <div className="text-xs text-muted-foreground">Devolución</div>
                </button>
              </div>
            </div>

            {/* Solicitar Cambio/Garantía/Canje */}
            {(estatusFinal === 'cambio_garantia' || estatusFinal === 'porcentaje' || estatusFinal === 'nota_credito') && (
              <div className="p-4 border-2 border-primary/20 rounded-lg bg-primary/5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="space-y-3 flex-1">
                    <div>
                      <p className="font-medium text-sm">Solicitud de Aprobación Requerida</p>
                      <p className="text-xs text-muted-foreground">
                        Este estatus requiere aprobación del jefe de taller. Debes enviar una solicitud con fotos y justificación.
                      </p>
                    </div>
                    <Button onClick={() => setShowSolicitudCambioDialog(true)} className="w-full">
                      <FileText className="h-4 w-4 mr-2" />
                      Crear Solicitud
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Recomendaciones */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Recomendaciones</label>
              <Textarea
                placeholder="Recomendaciones para el cliente..."
                value={recomendaciones}
                onChange={(e) => setRecomendaciones(e.target.value)}
                rows={3}
              />
            </div>

            {/* Resolución */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Resolución</label>
              <Textarea
                placeholder="Resumen de la resolución del problema..."
                value={resolucion}
                onChange={(e) => setResolucion(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Tiempo Estimado */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Tiempo Estimado</label>
                <Input
                  placeholder="Ej: 2-3 días hábiles"
                  value={tiempoEstimado}
                  onChange={(e) => setTiempoEstimado(e.target.value)}
                />
              </div>

              {/* Costo Estimado */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Costo Estimado (Q)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={costoEstimado}
                  onChange={(e) => setCostoEstimado(e.target.value)}
                />
              </div>
            </div>

            <Separator />

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPaso(2)}>
                Volver
              </Button>
              <Button onClick={() => setShowConfirmDialog(true)} className="flex-1">
                <CheckCircle className="h-4 w-4 mr-2" />
                Guardar Diagnóstico
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog Confirmación */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Diagnóstico</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de guardar este diagnóstico? Esta acción actualizará el estado del incidente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarDiagnostico}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Solicitud Cambio */}
      <Dialog open={showSolicitudCambioDialog} onOpenChange={setShowSolicitudCambioDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Solicitud de Cambio/Garantía</DialogTitle>
            <DialogDescription>
              Esta solicitud será enviada al jefe de taller para su aprobación
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Solicitud</label>
              <Select value={tipoCambio} onValueChange={(v: any) => setTipoCambio(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="garantia">Cambio por Garantía</SelectItem>
                  <SelectItem value="canje">Canje</SelectItem>
                  <SelectItem value="nota_credito">Nota de Crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Justificación *</label>
              <Textarea
                placeholder="Explica por qué aplica este tipo de cambio. Incluye detalles técnicos, evidencias y fotos..."
                value={justificacion}
                onChange={(e) => setJustificacion(e.target.value)}
                rows={5}
              />
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Importante:</strong> Asegúrate de tomar fotos claras que evidencien el defecto de fábrica, 
                daño grave o justifiquen el cambio/canje solicitado.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSolicitudCambioDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={solicitarCambio}>
              Enviar Solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
