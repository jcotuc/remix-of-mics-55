import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, CheckCircle2, Package, Plus, Minus, Search, ShoppingCart, X, Clock, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FALLAS_POR_FAMILIA, CAUSAS_POR_FAMILIA, FALLAS_GENERICAS, CAUSAS_GENERICAS } from "@/data/diagnosticoOptions";
import { Textarea } from "@/components/ui/textarea";

export default function DiagnosticoInicial() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incidente, setIncidente] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Paso 1: Fallas, Causas, Garantía, Resolución
  const [fallas, setFallas] = useState<string[]>([]);
  const [causas, setCausas] = useState<string[]>([]);
  const [otraFalla, setOtraFalla] = useState("");
  const [otraCausa, setOtraCausa] = useState("");
  const [aplicaGarantia, setAplicaGarantia] = useState<boolean | null>(null);
  const [tipoResolucion, setTipoResolucion] = useState<string>("");
  
  // Paso 2: Solicitud de Repuestos
  const [necesitaRepuestos, setNecesitaRepuestos] = useState(false);
  const [repuestosDisponibles, setRepuestosDisponibles] = useState<any[]>([]);
  const [repuestosSolicitados, setRepuestosSolicitados] = useState<Array<{codigo: string, descripcion: string, cantidad: number}>>([]);
  const [searchRepuesto, setSearchRepuesto] = useState("");
  const [solicitudRepuestosId, setSolicitudRepuestosId] = useState<string | null>(null);
  const [estadoSolicitud, setEstadoSolicitud] = useState<string | null>(null);
  
  // Paso 3: Fotos y Observaciones
  const [fotos, setFotos] = useState<File[]>([]);
  const [observaciones, setObservaciones] = useState("");
  
  // Control de pasos
  const [paso, setPaso] = useState(1);

  // Obtener fallas y causas según la familia del producto
  const fallasDisponibles = incidente?.familia_producto && FALLAS_POR_FAMILIA[incidente.familia_producto]
    ? FALLAS_POR_FAMILIA[incidente.familia_producto]
    : FALLAS_GENERICAS;

  const causasDisponibles = incidente?.familia_producto && CAUSAS_POR_FAMILIA[incidente.familia_producto]
    ? CAUSAS_POR_FAMILIA[incidente.familia_producto]
    : CAUSAS_GENERICAS;

  useEffect(() => {
    fetchIncidente();
    verificarSolicitudRepuestos();
    cargarBorradorDiagnostico();
  }, [id]);

  useEffect(() => {
    if (incidente?.codigo_producto) {
      fetchRepuestos();
    }
  }, [incidente?.codigo_producto]);

  // Auto-guardado cada 30 segundos
  useEffect(() => {
    if (!incidente) return;
    
    const interval = setInterval(() => {
      guardarBorradorSilencioso();
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [fallas, causas, aplicaGarantia, tipoResolucion, observaciones, paso, incidente]);

  // Cargar borrador existente
  const cargarBorradorDiagnostico = async () => {
    try {
      const { data, error } = await supabase
        .from('diagnosticos')
        .select('*')
        .eq('incidente_id', id)
        .eq('estado', 'borrador')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Restaurar estado del diagnóstico
        if (data.fallas && Array.isArray(data.fallas)) {
          setFallas(data.fallas);
        }
        if (data.causas && Array.isArray(data.causas)) {
          setCausas(data.causas);
        }
        if (data.recomendaciones) {
          setObservaciones(data.recomendaciones);
        }
        
        // Restaurar paso (guardado en el campo tiempo_estimado como hack temporal)
        if (data.tiempo_estimado) {
          const pasoGuardado = parseInt(data.tiempo_estimado);
          if (!isNaN(pasoGuardado)) {
            setPaso(pasoGuardado);
          }
        }

        // Restaurar datos adicionales del metadata (si existen)
        const metadata = data.resolucion ? JSON.parse(data.resolucion) : null;
        if (metadata) {
          if (metadata.aplicaGarantia !== undefined) {
            setAplicaGarantia(metadata.aplicaGarantia);
          }
          if (metadata.tipoResolucion) {
            setTipoResolucion(metadata.tipoResolucion);
          }
        }

        toast.success("Se recuperó el borrador del diagnóstico");
      }
    } catch (error) {
      console.error('Error cargando borrador:', error);
    }
  };

  const guardarBorradorSilencioso = async () => {
    if (!incidente) return;

    console.log('🔄 Auto-guardando diagnóstico...', { paso, fallas: fallas.length, causas: causas.length });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('nombre, apellido')
        .eq('user_id', user.id)
        .maybeSingle();

      const tecnicoNombre = profile ? `${profile.nombre} ${profile.apellido}` : user.email || 'Técnico';

      // Guardar metadata en el campo resolucion como JSON
      const metadata = {
        aplicaGarantia,
        tipoResolucion,
      };

      const borradorData = {
        incidente_id: id,
        tecnico_codigo: incidente.codigo_tecnico || 'TEMP',
        fallas,
        causas,
        recomendaciones: observaciones,
        estado: 'borrador',
        tiempo_estimado: paso.toString(), // Guardar el paso actual
        resolucion: JSON.stringify(metadata),
      };

      // Verificar si ya existe un borrador
      const { data: existingDraft } = await supabase
        .from('diagnosticos')
        .select('id')
        .eq('incidente_id', id)
        .eq('estado', 'borrador')
        .maybeSingle();

      if (existingDraft) {
        // Actualizar borrador existente
        await supabase
          .from('diagnosticos')
          .update(borradorData)
          .eq('id', existingDraft.id);
        console.log('✅ Borrador actualizado automáticamente');
      } else {
        // Crear nuevo borrador
        await supabase
          .from('diagnosticos')
          .insert(borradorData);
        console.log('✅ Borrador creado automáticamente');
      }
    } catch (error) {
      console.error('❌ Error guardando borrador:', error);
    }
  };

  useEffect(() => {
    if (incidente?.codigo_producto) {
      fetchRepuestos();
    }
  }, [incidente?.codigo_producto]);

  // Verificar si ya existe una solicitud de repuestos para este incidente
  const verificarSolicitudRepuestos = async () => {
    try {
      const { data, error } = await supabase
        .from('solicitudes_repuestos')
        .select('*')
        .eq('incidente_id', id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setSolicitudRepuestosId(data.id);
        setEstadoSolicitud(data.estado);
        if (Array.isArray(data.repuestos)) {
          setRepuestosSolicitados(data.repuestos as Array<{codigo: string, descripcion: string, cantidad: number}>);
        }
      }
    } catch (error) {
      console.error('Error verificando solicitud:', error);
    }
  };

  const fetchRepuestos = async () => {
    if (!incidente?.codigo_producto) return;
    
    try {
      const { data, error } = await supabase
        .from('repuestos')
        .select('*')
        .eq('codigo_producto', incidente.codigo_producto)
        .order('descripcion');

      if (error) throw error;
      setRepuestosDisponibles(data || []);
    } catch (error) {
      console.error('Error fetching repuestos:', error);
      toast.error("Error al cargar los repuestos");
    }
  };

  const fetchIncidente = async () => {
    try {
      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setIncidente(data);
    } catch (error) {
      console.error('Error:', error);
      toast.error("Error al cargar el incidente");
    } finally {
      setLoading(false);
    }
  };

  const resolucionesConGarantia = [
    "Reparar en Garantía",
    "Cambio por Garantía",
    "Nota de Crédito"
  ];
  
  const resolucionesSinGarantia = [
    "Canje",
    "Presupuesto"
  ];

  const opcionesResolucion = aplicaGarantia 
    ? resolucionesConGarantia 
    : resolucionesSinGarantia;

  // Determinar si necesita repuestos según el tipo de resolución
  useEffect(() => {
    if (tipoResolucion === "Reparar en Garantía" || tipoResolucion === "Presupuesto") {
      setNecesitaRepuestos(true);
    } else {
      setNecesitaRepuestos(false);
    }
  }, [tipoResolucion]);

  const handleContinuarAPaso2 = async () => {
    if (fallas.length === 0) {
      toast.error("Debes seleccionar al menos una falla");
      return;
    }

    if (causas.length === 0) {
      toast.error("Debes seleccionar al menos una causa");
      return;
    }

    if (aplicaGarantia === null) {
      toast.error("Debes indicar si aplica garantía");
      return;
    }

    if (!tipoResolucion) {
      toast.error("Debes seleccionar un tipo de resolución");
      return;
    }

    // Guardar borrador antes de continuar
    await guardarBorradorSilencioso();

    // Si necesita repuestos, ir al paso 2, si no, ir directo al paso 3
    if (necesitaRepuestos) {
      setPaso(2);
    } else {
      setPaso(3);
    }
  };

  const filteredRepuestos = repuestosDisponibles.filter(repuesto =>
    repuesto.descripcion.toLowerCase().includes(searchRepuesto.toLowerCase()) ||
    repuesto.codigo.toLowerCase().includes(searchRepuesto.toLowerCase()) ||
    repuesto.clave.toLowerCase().includes(searchRepuesto.toLowerCase())
  );

  const agregarRepuesto = (repuesto: any) => {
    const yaExiste = repuestosSolicitados.find(r => r.codigo === repuesto.codigo);
    if (yaExiste) {
      setRepuestosSolicitados(repuestosSolicitados.map(r =>
        r.codigo === repuesto.codigo ? { ...r, cantidad: r.cantidad + 1 } : r
      ));
    } else {
      setRepuestosSolicitados([...repuestosSolicitados, {
        codigo: repuesto.codigo,
        descripcion: repuesto.descripcion,
        cantidad: 1
      }]);
    }
    toast.success("Repuesto agregado");
  };

  const actualizarCantidad = (codigo: string, nuevaCantidad: number) => {
    if (nuevaCantidad <= 0) {
      setRepuestosSolicitados(repuestosSolicitados.filter(r => r.codigo !== codigo));
    } else {
      setRepuestosSolicitados(repuestosSolicitados.map(r =>
        r.codigo === codigo ? { ...r, cantidad: nuevaCantidad } : r
      ));
    }
  };

  const eliminarRepuesto = (codigo: string) => {
    setRepuestosSolicitados(repuestosSolicitados.filter(r => r.codigo !== codigo));
  };

  const handleEnviarSolicitudRepuestos = async () => {
    if (repuestosSolicitados.length === 0) {
      toast.error("Debes agregar al menos un repuesto");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data: profile } = await supabase
        .from('profiles')
        .select('nombre, apellido')
        .eq('user_id', user.id)
        .maybeSingle();

      const tecnicoNombre = profile ? `${profile.nombre} ${profile.apellido}` : user.email || 'Técnico';

      const { data, error } = await supabase
        .from('solicitudes_repuestos')
        .insert({
          incidente_id: id,
          tecnico_solicitante: tecnicoNombre,
          repuestos: repuestosSolicitados,
          estado: 'pendiente'
        })
        .select()
        .single();

      if (error) throw error;

      setSolicitudRepuestosId(data.id);
      setEstadoSolicitud('pendiente');
      
      // Guardar borrador después de enviar solicitud
      await guardarBorradorSilencioso();
      
      toast.success("Solicitud de repuestos enviada a bodega");
    } catch (error) {
      console.error('Error:', error);
      toast.error("Error al enviar la solicitud");
    }
  };

  const verificarEstadoSolicitud = async () => {
    if (!solicitudRepuestosId) return;
    
    try {
      const { data, error } = await supabase
        .from('solicitudes_repuestos')
        .select('estado')
        .eq('id', solicitudRepuestosId)
        .single();

      if (error) throw error;
      setEstadoSolicitud(data.estado);
    } catch (error) {
      console.error('Error verificando estado:', error);
    }
  };

  const handleFinalizarDiagnostico = async () => {
    setSaving(true);
    try {
      // Subir fotos si hay
      let fotosUrls: string[] = [];
      if (fotos.length > 0) {
        fotosUrls = await Promise.all(
          fotos.map(async (foto) => {
            const fileName = `${id}/diagnostico/${Date.now()}-${foto.name}`;
            const { data, error } = await supabase.storage
              .from("incident-photos")
              .upload(fileName, foto);
            
            if (error) throw error;
            
            const { data: { publicUrl } } = supabase.storage
              .from("incident-photos")
              .getPublicUrl(fileName);
            
            return publicUrl;
          })
        );
      }

      const diagnosticoData = {
        incidente_id: id,
        tecnico_codigo: incidente.codigo_tecnico || 'TEMP',
        fallas,
        causas,
        recomendaciones: observaciones,
        fotos_urls: fotosUrls,
        resolucion: JSON.stringify({
          aplicaGarantia,
          tipoResolucion,
        }),
        estado: 'finalizado',
      };

      // Actualizar o crear diagnóstico final
      const { data: existingDraft } = await supabase
        .from('diagnosticos')
        .select('id')
        .eq('incidente_id', id)
        .maybeSingle();

      if (existingDraft) {
        await supabase
          .from('diagnosticos')
          .update(diagnosticoData)
          .eq('id', existingDraft.id);
      } else {
        await supabase
          .from('diagnosticos')
          .insert(diagnosticoData);
      }

      // Actualizar el incidente
      const { error: incidenteError } = await supabase
        .from("incidentes")
        .update({
          status: "En diagnostico",
          cobertura_garantia: aplicaGarantia,
        })
        .eq("id", id);

      if (incidenteError) throw incidenteError;

      toast.success("Diagnóstico finalizado exitosamente");
      navigate("/taller/mis-asignaciones");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al finalizar el diagnóstico");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto p-6">Cargando...</div>;
  }

  if (!incidente) {
    return (
      <div className="container mx-auto p-6">
        <p>Incidente no encontrado</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => navigate("/taller/mis-asignaciones")}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Volver
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">Diagnóstico Técnico</h1>
        <p className="text-muted-foreground">Incidente: {incidente.codigo}</p>
      </div>

      {/* Información del Incidente */}
      <Card className="mb-6 border-l-4 border-l-primary">
        <CardHeader className="bg-primary/5">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Información del Incidente
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground">Cliente</Label>
              <p className="text-base font-medium">{incidente.codigo_cliente}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Producto</Label>
              <p className="text-base font-medium">{incidente.codigo_producto}</p>
            </div>
            {incidente.sku_maquina && (
              <div>
                <Label className="text-sm text-muted-foreground">SKU de la Máquina</Label>
                <p className="text-base font-medium">{incidente.sku_maquina}</p>
              </div>
            )}
            {incidente.familia_producto && (
              <div>
                <Label className="text-sm text-muted-foreground">Familia del Producto</Label>
                <p className="text-base font-medium">{incidente.familia_producto}</p>
              </div>
            )}
            {incidente.accesorios && (
              <div className="md:col-span-2">
                <Label className="text-sm text-muted-foreground">Accesorios Incluidos</Label>
                <p className="text-base">{incidente.accesorios}</p>
              </div>
            )}
            <div className="md:col-span-2">
              <Label className="text-sm text-muted-foreground">Descripción del Problema (Cliente)</Label>
              <p className="text-base bg-muted p-3 rounded-md mt-1">{incidente.descripcion_problema}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>
            {paso === 1 && "Paso 1: Diagnóstico - Fallas y Causas"}
            {paso === 2 && "Paso 2: Solicitud de Repuestos"}
            {paso === 3 && "Paso 3: Fotos y Observaciones"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {paso === 1 && (
            <>
              {/* Fallas */}
              <div className="space-y-4">
                <div>
                  <Label className="text-lg font-semibold">Fallas Encontradas</Label>
                  <p className="text-sm text-muted-foreground">
                    Selecciona todas las fallas que apliquen
                    {incidente.familia_producto && ` - ${incidente.familia_producto}`}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {fallasDisponibles.map((falla) => (
                    <label
                      key={falla}
                      className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        fallas.includes(falla)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Checkbox
                        checked={fallas.includes(falla)}
                        onCheckedChange={() => {
                          setFallas((prev) =>
                            prev.includes(falla)
                              ? prev.filter((f) => f !== falla)
                              : [...prev, falla]
                          );
                        }}
                      />
                      <span className="text-sm">{falla}</span>
                    </label>
                  ))}
                </div>
                <div>
                  <Label>Otra falla no listada</Label>
                  <Textarea
                    value={otraFalla}
                    onChange={(e) => setOtraFalla(e.target.value)}
                    placeholder="Describe la falla..."
                    rows={3}
                  />
                </div>
              </div>

              <Separator />

              {/* Causas */}
              <div className="space-y-4">
                <div>
                  <Label className="text-lg font-semibold">Causas Identificadas</Label>
                  <p className="text-sm text-muted-foreground">
                    Selecciona todas las causas que apliquen
                    {incidente.familia_producto && ` - ${incidente.familia_producto}`}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {causasDisponibles.map((causa) => (
                    <label
                      key={causa}
                      className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        causas.includes(causa)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Checkbox
                        checked={causas.includes(causa)}
                        onCheckedChange={() => {
                          setCausas((prev) =>
                            prev.includes(causa)
                              ? prev.filter((c) => c !== causa)
                              : [...prev, causa]
                          );
                        }}
                      />
                      <span className="text-sm">{causa}</span>
                    </label>
                  ))}
                </div>
                <div>
                  <Label>Otra causa no listada</Label>
                  <Textarea
                    value={otraCausa}
                    onChange={(e) => setOtraCausa(e.target.value)}
                    placeholder="Describe la causa..."
                    rows={3}
                  />
                </div>
              </div>

              <Separator />

              {/* Aplica Garantía */}
              <div className="space-y-4">
                <div>
                  <Label className="text-lg font-semibold">¿Aplica Garantía?</Label>
                  <p className="text-sm text-muted-foreground">
                    Indica si esta reparación está cubierta por garantía
                  </p>
                </div>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={aplicaGarantia === true ? "default" : "outline"}
                    onClick={() => {
                      setAplicaGarantia(true);
                      setTipoResolucion("");
                    }}
                  >
                    Sí, aplica garantía
                  </Button>
                  <Button
                    type="button"
                    variant={aplicaGarantia === false ? "default" : "outline"}
                    onClick={() => {
                      setAplicaGarantia(false);
                      setTipoResolucion("");
                    }}
                  >
                    No aplica garantía
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Tipo de Resolución */}
              {aplicaGarantia !== null && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-lg font-semibold">Tipo de Resolución</Label>
                    <p className="text-sm text-muted-foreground">
                      Selecciona cómo se resolverá este incidente
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {opcionesResolucion.map((opcion) => (
                      <Button
                        key={opcion}
                        type="button"
                        variant={tipoResolucion === opcion ? "default" : "outline"}
                        onClick={() => setTipoResolucion(opcion)}
                        className="justify-start h-auto py-3"
                      >
                        {opcion}
                      </Button>
                    ))}
                  </div>
                  {tipoResolucion === "Presupuesto" && necesitaRepuestos && (
                    <div className="bg-muted p-3 rounded-md text-sm">
                      <p className="text-muted-foreground">
                        <strong>Nota:</strong> Los repuestos se despacharán una vez que el cliente realice el pago del presupuesto.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {paso === 2 && (
            <div className="space-y-4">
              <div>
                <Label className="text-lg font-semibold">Solicitud de Repuestos</Label>
                <p className="text-sm text-muted-foreground">
                  Selecciona los repuestos necesarios para la reparación
                </p>
              </div>
              
              <ResizablePanelGroup direction="horizontal" className="h-[600px] rounded-lg border">
                {/* Panel izquierdo: Repuestos disponibles */}
                <ResizablePanel defaultSize={60} className="p-4 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">Repuestos Disponibles</h4>
                    <Badge variant="outline">
                      {filteredRepuestos.length} disponibles
                    </Badge>
                  </div>
                  
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por código, clave o descripción..."
                      value={searchRepuesto}
                      onChange={(e) => setSearchRepuesto(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                      {filteredRepuestos.map((repuesto) => (
                        <div 
                          key={repuesto.id} 
                          className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => agregarRepuesto(repuesto)}
                        >
                          <div className="w-10 h-10 bg-muted rounded flex items-center justify-center flex-shrink-0">
                            <Package className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{repuesto.descripcion}</div>
                            <div className="text-xs text-muted-foreground">
                              Código: {repuesto.codigo} | Clave: {repuesto.clave}
                            </div>
                            {repuesto.stock_actual !== null && (
                              <div className="text-xs text-muted-foreground">
                                Stock: {repuesto.stock_actual}
                              </div>
                            )}
                          </div>
                          <Button size="sm" variant="outline">
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      
                      {filteredRepuestos.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                          <Search className="w-12 h-12 mb-2 opacity-50" />
                          <p>No se encontraron repuestos</p>
                        </div>
                      )}
                  </div>
                </ResizablePanel>

                <ResizableHandle />

                {/* Panel derecho: Repuestos seleccionados */}
                <ResizablePanel defaultSize={40} className="p-4 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4" />
                      <h4 className="font-medium">Repuestos Solicitados</h4>
                      <Badge>{repuestosSolicitados.length}</Badge>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2">
                      {repuestosSolicitados.length > 0 ? (
                        <div className="space-y-3">
                          {repuestosSolicitados.map((item) => (
                            <div key={item.codigo} className="border rounded-lg p-3">
                              <div className="flex items-start gap-2">
                                <div className="w-8 h-8 bg-muted rounded flex items-center justify-center flex-shrink-0">
                                  <Package className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm">{item.descripcion}</div>
                                  <div className="text-xs text-muted-foreground">{item.codigo}</div>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 w-7 p-0"
                                      onClick={() => actualizarCantidad(item.codigo, item.cantidad - 1)}
                                    >
                                      <Minus className="w-3 h-3" />
                                    </Button>
                                    <span className="text-sm font-medium w-8 text-center">{item.cantidad}</span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 w-7 p-0"
                                      onClick={() => actualizarCantidad(item.codigo, item.cantidad + 1)}
                                    >
                                      <Plus className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={() => eliminarRepuesto(item.codigo)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                          <ShoppingCart className="w-12 h-12 mb-2 opacity-50" />
                          <p className="text-sm">No hay repuestos seleccionados</p>
                          <p className="text-xs">Selecciona repuestos de la lista</p>
                        </div>
                      )}
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          )}

          {paso === 3 && (
            <>
              <div className="space-y-4">
                <div>
                  <Label className="text-lg font-semibold">Fotos del Diagnóstico</Label>
                  <p className="text-sm text-muted-foreground">
                    Evidencia fotográfica del diagnóstico realizado
                  </p>
                </div>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setFotos(prev => [...prev, ...files]);
                  }}
                />
                {fotos.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {fotos.length} foto(s) seleccionada(s)
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <Label className="text-lg font-semibold">Observaciones del Técnico</Label>
                  <p className="text-sm text-muted-foreground">
                    Comentarios adicionales sobre el diagnóstico
                  </p>
                </div>
                <Textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Escribe aquí cualquier observación relevante..."
                  rows={6}
                />
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-between gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (paso > 1) {
                setPaso(paso - 1);
              } else {
                navigate("/taller/mis-asignaciones");
              }
            }}
          >
            {paso === 1 ? "Cancelar" : "Anterior"}
          </Button>
          <Button 
            onClick={() => {
              if (paso === 1) {
                handleContinuarAPaso2();
              } else if (paso === 2) {
                if (estadoSolicitud === 'entregado') {
                  setPaso(3);
                } else if (!solicitudRepuestosId) {
                  handleEnviarSolicitudRepuestos();
                }
              } else {
                handleFinalizarDiagnostico();
              }
            }}
            disabled={saving || (paso === 2 && solicitudRepuestosId && estadoSolicitud !== 'entregado')}
          >
            {paso === 2 
              ? (estadoSolicitud === 'entregado' 
                  ? "Continuar" 
                  : (solicitudRepuestosId 
                      ? "Esperando Despacho..." 
                      : "Enviar Solicitud a Bodega"))
              : (paso === 3 
                  ? (saving ? "Guardando..." : "Finalizar Diagnóstico") 
                  : "Continuar")}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
