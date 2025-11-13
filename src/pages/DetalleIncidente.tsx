import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit, Calendar, User, Package, AlertTriangle, CheckCircle, Clock, Truck, DollarSign, FileText, Wrench, Plus, X, Stethoscope, Info, Search, ShoppingCart, Minus, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { DiagnosticoTecnico } from "@/components/DiagnosticoTecnico";
import { incidentes, clientes, productos, tecnicos } from "@/data/mockData";
import { Incidente } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type IncidenteDB = Database['public']['Tables']['incidentes']['Row'];

export default function DetalleIncidente() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [incidente, setIncidente] = useState<Incidente | null>(null);
  const [incidenteDB, setIncidenteDB] = useState<IncidenteDB | null>(null);
  const [productoInfo, setProductoInfo] = useState<any>(null);
  const [guiasEnvio, setGuiasEnvio] = useState<any[]>([]);
  const [repuestosDisponibles, setRepuestosDisponibles] = useState<any[]>([]);
  const [searchRepuesto, setSearchRepuesto] = useState("");
  
  // Estado del formulario de diagnóstico con pasos
  const [diagnosticoStarted, setDiagnosticoStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1: Info básica, 2: Repuestos, 3: Documentación
  const [falla, setFalla] = useState("");
  const [causa, setCausa] = useState("");
  const [recomendacion, setRecomendacion] = useState("");
  const [resolucion, setResolucion] = useState("");
  const [aplicaGarantia, setAplicaGarantia] = useState(false);
  const [requiereRepuestos, setRequiereRepuestos] = useState(false);
  const [descripcionProblema, setDescripcionProblema] = useState("");
  const [lugarIngreso, setLugarIngreso] = useState<"Mostrador" | "Logistica">("Mostrador");
  const [tecnicoAsignado, setTecnicoAsignado] = useState("");
  const [tipoDiagnostico, setTipoDiagnostico] = useState<"reparacion" | "servicio" | "">("");
  
  // Campos del formulario general
  const [motivoIngreso, setMotivoIngreso] = useState("");
  const [observacionesCliente, setObservacionesCliente] = useState("");
  const [estadoVisual, setEstadoVisual] = useState("");
  const [accesoriosIncluidos, setAccesoriosIncluidos] = useState("");
  
  // Estado del dialog de confirmación
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // Estado para editar código de producto
  const [isEditingProductCode, setIsEditingProductCode] = useState(false);
  const [editedProductCode, setEditedProductCode] = useState("");

  type RepuestoItem = { repuestoCodigo: string; cantidad: number };
  const [repuestosList, setRepuestosList] = useState<RepuestoItem[]>([]);

  // Generar estado consistente para repuestos basado en su código
  const getRepuestoStatus = (repuestoCodigo: string) => {
    const statuses = [
      { status: 'en-stock', label: 'En stock', color: 'bg-green-500 text-white' },
      { status: 'otra-bodega', label: 'Otra bodega', color: 'bg-yellow-500 text-white' },
      { status: 'no-disponible', label: 'No disponible', color: 'bg-red-500 text-white' }
    ];
    // Use a consistent hash based on the spare part code to determine status
    const hash = repuestoCodigo.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return statuses[hash % statuses.length];
  };

  useEffect(() => {
    if (id) {
      fetchIncidente();
    }
  }, [id]);

  const fetchIncidente = async () => {
    try {
      // Intentar obtener de la base de datos primero
      const { data: dbIncidente, error } = await supabase
        .from('incidentes')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (dbIncidente && !error) {
        setIncidenteDB(dbIncidente);
        
        // Buscar información del producto
        const { data: producto } = await supabase
          .from('productos')
          .select('*')
          .eq('codigo', dbIncidente.codigo_producto)
          .maybeSingle();
        
        if (producto) setProductoInfo(producto);

        // Buscar repuestos
        const { data: repuestos } = await supabase
          .from('repuestos')
          .select('*')
          .eq('codigo_producto', dbIncidente.codigo_producto);
        
        if (repuestos) setRepuestosDisponibles(repuestos);
        
        // Buscar guías de envío asociadas al incidente
        const { data: guias } = await supabase
          .from('guias_envio')
          .select('*')
          .contains('incidentes_codigos', [dbIncidente.codigo])
          .order('fecha_guia', { ascending: false });
        
        if (guias) setGuiasEnvio(guias);
      } else {
        // Fallback a mock data
        const incidenteEncontrado = incidentes.find(i => i.id === id);
        setIncidente(incidenteEncontrado || null);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (!incidente) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate("/incidentes")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Incidentes
          </Button>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">Incidente no encontrado</h2>
            <p className="text-muted-foreground">El incidente con ID "{id}" no existe en el sistema.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getClienteName = (codigo: string) => {
    const cliente = clientes.find(c => c.codigo === codigo);
    return cliente ? cliente.nombre : "Cliente no encontrado";
  };

  const getTecnicoName = (codigo: string) => {
    const tecnico = tecnicos.find(t => t.codigo === codigo);
    return tecnico ? `${tecnico.nombre} ${tecnico.apellido}` : "Técnico no encontrado";
  };

  const getTecnicoEmail = (codigo: string) => {
    const tecnico = tecnicos.find(t => t.codigo === codigo);
    return tecnico ? tecnico.email : "";
  };


  const addRepuestoFromAvailable = (repuesto: any) => {
    const existing = repuestosList.find(r => r.repuestoCodigo === repuesto.codigo);
    if (existing) {
      setRepuestosList(prev => prev.map(r => 
        r.repuestoCodigo === repuesto.codigo 
          ? { ...r, cantidad: r.cantidad + 1 }
          : r
      ));
    } else {
      setRepuestosList(prev => [...prev, { repuestoCodigo: repuesto.codigo, cantidad: 1 }]);
    }
    toast({ title: "Repuesto agregado", description: `${repuesto.descripcion} añadido a la lista.` });
  };

  const updateRepuestoCantidad = (codigo: string, cantidad: number) => {
    if (cantidad <= 0) {
      setRepuestosList(prev => prev.filter(r => r.repuestoCodigo !== codigo));
    } else {
      setRepuestosList(prev => prev.map(r => 
        r.repuestoCodigo === codigo 
          ? { ...r, cantidad }
          : r
      ));
    }
  };

  const removeRepuesto = (codigo: string) => {
    setRepuestosList(prev => prev.filter(r => r.repuestoCodigo !== codigo));
  };

  const iniciarDiagnostico = () => {
    setDiagnosticoStarted(true);
    setCurrentStep(1);
    setDescripcionProblema(incidente?.descripcionProblema || "");
    setLugarIngreso(incidente?.lugarIngreso || "Mostrador");
    setTecnicoAsignado(incidente?.codigoTecnico || "");
    toast({
      title: "Diagnóstico iniciado",
      description: "Completa la información paso a paso.",
    });
  };

  const handleGuardarDiagnostico = () => {
    setShowConfirmDialog(true);
  };

  const onGuardarDiagnostico = () => {
    if (!incidente) return;
    
    // Generar documentación automática basada en repuestos
    const fallasGeneradas = repuestosList.length > 0 
      ? repuestosList.map(r => `Falla en componente que requiere: ${r.repuestoCodigo} (Cantidad: ${r.cantidad})`)
      : ["No se requieren repuestos - Falla menor o de mantenimiento"];
    
    const causaGenerada = aplicaGarantia 
      ? "Desgaste normal de componentes cubierto por garantía"
      : repuestosList.length > 0 
        ? "Desgaste por uso normal o sobrecarga del equipo"
        : "Problema menor que no requiere reemplazo de componentes";
    
    const recomendacionGenerada = productoInfo 
      ? `Para equipos ${productoInfo.categoria}: ${
          repuestosList.length > 0 
            ? "Reemplazar componentes defectuosos y realizar mantenimiento preventivo" 
            : "Realizar mantenimiento preventivo y verificación general"
        }`
      : repuestosList.length > 0 
        ? "Reemplazar los componentes identificados según especificaciones técnicas"
        : "Continuar con mantenimiento preventivo regular";
    
    const resolucionGenerada = aplicaGarantia 
      ? `Reparación bajo garantía. ${
          repuestosList.length > 0 
            ? `Se procederá al reemplazo de ${repuestosList.length} componente(s) sin costo.` 
            : "Ajustes y calibración sin costo."
        }`
      : repuestosList.length > 0 
        ? `Reparación comercial. Cotización por repuestos y mano de obra. Tiempo estimado: 2-3 días hábiles.`
        : "Mantenimiento completado. Equipo funcional y listo para uso.";
    
    const descripcionCompleta = `Falla: ${fallasGeneradas.join('; ')}\n\nCausa: ${causaGenerada}\n\nRecomendación: ${recomendacionGenerada}\n\nResolución: ${resolucionGenerada}`;
    
    const idx = incidentes.findIndex(i => i.id === incidente.id);
    if (idx === -1) return;

    const today = new Date().toISOString().slice(0, 10);
    const requiere = requiereRepuestos || repuestosList.length > 0;
    const estadoAnterior = incidentes[idx].status;
    const estadoNuevo = requiere ? "Pendiente por repuestos" : "En diagnostico" as const;

    incidentes[idx] = {
      ...incidentes[idx],
      status: estadoNuevo,
      coberturaGarantia: aplicaGarantia,
      diagnostico: {
        fecha: today,
        tecnicoCodigo: tecnicoAsignado,
        descripcion: descripcionCompleta,
        fallasEncontradas: fallasGeneradas,
        recomendaciones: recomendacionGenerada,
        requiereRepuestos: requiere,
        tiempoEstimadoReparacion: requiere ? "Pendiente de repuestos" : "2-3 días hábiles",
        costoEstimado: aplicaGarantia ? 0 : undefined,
        aplicaGarantia: aplicaGarantia,
        lugarIngreso: lugarIngreso,
        tecnicoAsignado: tecnicoAsignado
      },
      repuestosSolicitados: requiere
        ? repuestosList.map(r => ({
            repuestoCodigo: r.repuestoCodigo,
            cantidad: r.cantidad,
            fechaSolicitud: today,
            estado: 'pendiente' as const,
          }))
        : undefined,
      historialEstados: [
        ...(incidentes[idx].historialEstados ?? []),
        {
          fecha: today,
          estadoAnterior,
          estadoNuevo,
          tecnicoCodigo: incidentes[idx].codigoTecnico,
          observaciones: "Diagnóstico registrado",
        },
      ],
    };

    setIncidente(incidentes[idx]);
    setDiagnosticoStarted(false);
    setCurrentStep(1);
    // Reset form
    setFalla("");
    setCausa("");
    setRecomendacion("");
    setResolucion("");
    setAplicaGarantia(false);
    setRequiereRepuestos(false);
    setRepuestosList([]);
    setDescripcionProblema("");
    setLugarIngreso("Mostrador");
    setTecnicoAsignado("");
    setTipoDiagnostico("");
    setMotivoIngreso("");
    setObservacionesCliente("");
    setEstadoVisual("");
    setAccesoriosIncluidos("");
    
    toast({ title: "Diagnóstico guardado", description: `Incidente ${incidente.id} actualizado.` });
  };

  // Filtrar repuestos disponibles por búsqueda
  const filteredRepuestos = repuestosDisponibles.filter(repuesto =>
    repuesto.descripcion.toLowerCase().includes(searchRepuesto.toLowerCase()) ||
    repuesto.codigo.toLowerCase().includes(searchRepuesto.toLowerCase()) ||
    repuesto.clave.toLowerCase().includes(searchRepuesto.toLowerCase())
  );

  // Funciones para editar código de producto
  const handleEditProductCode = () => {
    setEditedProductCode(incidenteDB?.codigo_producto || "");
    setIsEditingProductCode(true);
  };

  const handleSaveProductCode = async () => {
    // Validación
    const codePattern = /^[a-zA-Z0-9-_]+$/;
    if (!editedProductCode.trim()) {
      toast({
        title: "Error de validación",
        description: "El código de producto no puede estar vacío",
        variant: "destructive"
      });
      return;
    }

    if (!codePattern.test(editedProductCode)) {
      toast({
        title: "Error de validación",
        description: "El código de producto solo puede contener letras, números, guiones y guiones bajos (sin espacios)",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('incidentes')
        .update({ codigo_producto: editedProductCode })
        .eq('id', id);

      if (error) throw error;

      // Actualizar estado local y recargar información del producto
      setIncidenteDB(prev => prev ? { ...prev, codigo_producto: editedProductCode } : null);
      
      // Buscar nueva información del producto
      const { data: nuevoProducto } = await supabase
        .from('productos')
        .select('*')
        .eq('codigo', editedProductCode)
        .maybeSingle();
      
      if (nuevoProducto) setProductoInfo(nuevoProducto);

      // Buscar repuestos del nuevo producto
      const { data: nuevosRepuestos } = await supabase
        .from('repuestos')
        .select('*')
        .eq('codigo_producto', editedProductCode);
      
      if (nuevosRepuestos) setRepuestosDisponibles(nuevosRepuestos);

      setIsEditingProductCode(false);

      toast({
        title: "Código de producto actualizado correctamente",
        description: `El código se ha actualizado a: ${editedProductCode}`,
      });
    } catch (error) {
      console.error('Error updating product code:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el código de producto. Inténtalo de nuevo.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/incidentes")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Incidentes
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Incidente {incidente.id}</h1>
            <p className="text-muted-foreground">Detalles del servicio técnico</p>
          </div>
        </div>
        <Button variant="outline">
          <Edit className="w-4 h-4 mr-2" />
          Editar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="w-4 h-4" />
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{getClienteName(incidente.codigoCliente)}</p>
            <p className="text-sm text-muted-foreground">Código: {incidente.codigoCliente}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="w-4 h-4" />
              Producto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">
              {productoInfo ? productoInfo.descripcion : `Código: ${incidente.codigoProducto}`}
            </p>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-medium">Código de Producto (SKU):</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEditProductCode}
                  className="h-7 text-xs"
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Editar
                </Button>
              </div>
              <div className="bg-muted/50 px-3 py-2 rounded-md">
                <p className="text-sm font-mono">{incidenteDB?.codigo_producto || incidente.codigoProducto}</p>
              </div>
            </div>
            {productoInfo?.clave && (
              <p className="text-xs text-muted-foreground mt-2">
                Clave: {productoInfo.clave}
              </p>
            )}
            {incidenteDB?.sku_maquina && (
              <p className="text-xs text-muted-foreground mt-1">
                SKU Máquina: {incidenteDB.sku_maquina}
              </p>
            )}
            {productoInfo?.descontinuado && (
              <Badge variant="destructive" className="mt-2">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Descontinuado
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Estado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBadge status={incidente.status} />
            <p className="text-sm text-muted-foreground mt-2">
              Ingresado: {incidente.fechaIngreso}
            </p>
            <div className="flex items-center gap-2 mt-2">
              {incidente.coberturaGarantia ? (
                <Badge className="bg-success text-success-foreground">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Con Garantía
                </Badge>
              ) : (
                <Badge variant="outline">
                  <Clock className="w-3 h-3 mr-1" />
                  Sin Garantía
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="detalles" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="detalles">Detalles</TabsTrigger>
          <TabsTrigger value="diagnostico">Diagnóstico</TabsTrigger>
          <TabsTrigger value="repuestos">Repuestos</TabsTrigger>
          <TabsTrigger value="documentacion">Documentación</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="detalles" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Descripción del Problema</CardTitle>
              <CardDescription>Problema reportado por el cliente</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{incidente.descripcionProblema}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Técnico Asignado</CardTitle>
              <CardDescription>Responsable del servicio</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{getTecnicoName(incidente.codigoTecnico)}</p>
                  <p className="text-sm text-muted-foreground">{getTecnicoEmail(incidente.codigoTecnico)}</p>
                  <p className="text-xs text-muted-foreground">Código: {incidente.codigoTecnico}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Mostrar guías de envío solo si existen */}
          {guiasEnvio.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Guías de Envío
                </CardTitle>
                <CardDescription>
                  {guiasEnvio.length} {guiasEnvio.length === 1 ? 'guía registrada' : 'guías registradas'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {guiasEnvio.map((guia) => (
                    <div key={guia.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" />
                          <span className="font-semibold">{guia.numero_guia}</span>
                        </div>
                        <Badge variant={
                          guia.estado === 'entregado' ? 'default' :
                          guia.estado === 'en_transito' ? 'secondary' :
                          guia.estado === 'pendiente' ? 'outline' : 'destructive'
                        }>
                          {guia.estado}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Destinatario</p>
                          <p className="font-medium">{guia.destinatario}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Ciudad</p>
                          <p className="font-medium">{guia.ciudad_destino}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Fecha Guía</p>
                          <p className="font-medium">
                            {new Date(guia.fecha_guia).toLocaleDateString('es-GT')}
                          </p>
                        </div>
                        {guia.fecha_entrega && (
                          <div>
                            <p className="text-muted-foreground">Fecha Entrega</p>
                            <p className="font-medium">
                              {new Date(guia.fecha_entrega).toLocaleDateString('es-GT')}
                            </p>
                          </div>
                        )}
                      </div>
                      {guia.direccion_destinatario && (
                        <div className="text-sm pt-2 border-t">
                          <p className="text-muted-foreground">Dirección</p>
                          <p className="font-medium">{guia.direccion_destinatario}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="diagnostico" className="space-y-6">
          {/* Nuevo flujo para técnicos cuando está en diagnóstico */}
          {incidenteDB && incidenteDB.status === 'En diagnostico' ? (
            <DiagnosticoTecnico 
              incidente={incidenteDB} 
              onDiagnosticoCompleto={fetchIncidente}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="w-5 h-5" />
                  Diagnóstico Técnico
                </CardTitle>
                <CardDescription>
                  {incidente && incidente.status === "Pendiente de diagnostico" 
                    ? "Inicia el proceso de diagnóstico técnico"
                    : "Análisis y evaluación del problema"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
              {incidente && incidente.status === "Pendiente de diagnostico" ? (
                diagnosticoStarted ? (
                  <div className="space-y-6">
                    {/* Progress indicator */}
                    <div className="flex items-center justify-center space-x-2 mb-6">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        1
                      </div>
                      <div className={`w-16 h-0.5 ${currentStep > 1 ? 'bg-primary' : 'bg-muted'}`}></div>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        2
                      </div>
                      <div className={`w-16 h-0.5 ${currentStep > 2 ? 'bg-primary' : 'bg-muted'}`}></div>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        3
                      </div>
                    </div>

                    {/* Step 1: Información Básica */}
                    {currentStep === 1 && (
                      <div className="space-y-6">
                        <div className="text-center">
                          <h3 className="text-lg font-medium">Paso 1: Información Básica</h3>
                          <p className="text-sm text-muted-foreground">Registra la información inicial del diagnóstico</p>
                        </div>

                        <div className="space-y-4">
                          {/* Información General */}
                          <div className="border rounded-lg p-4 space-y-4">
                            <h4 className="font-medium text-sm">Información General</h4>
                            
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Motivo de Ingreso</label>
                              <Textarea
                                placeholder="Motivo por el cual ingresa el equipo..."
                                value={motivoIngreso}
                                onChange={(e) => setMotivoIngreso(e.target.value)}
                                className="min-h-[80px]"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Observaciones del Cliente</label>
                              <Textarea
                                placeholder="Observaciones adicionales del cliente..."
                                value={observacionesCliente}
                                onChange={(e) => setObservacionesCliente(e.target.value)}
                                className="min-h-[80px]"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Estado Visual del Equipo</label>
                              <Textarea
                                placeholder="Descripción del estado físico y visual del equipo..."
                                value={estadoVisual}
                                onChange={(e) => setEstadoVisual(e.target.value)}
                                className="min-h-[80px]"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Accesorios Incluidos</label>
                              <Textarea
                                placeholder="Lista de accesorios que acompañan al equipo..."
                                value={accesoriosIncluidos}
                                onChange={(e) => setAccesoriosIncluidos(e.target.value)}
                                className="min-h-[60px]"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">Descripción del Problema</label>
                            <Textarea
                              placeholder="Describe el problema reportado por el cliente..."
                              value={descripcionProblema}
                              onChange={(e) => setDescripcionProblema(e.target.value)}
                              className="min-h-[100px]"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Lugar de Ingreso</label>
                              <Select value={lugarIngreso} onValueChange={(value: "Mostrador" | "Logistica") => setLugarIngreso(value)}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Mostrador">Mostrador</SelectItem>
                                  <SelectItem value="Logistica">Logística</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <label className="text-sm font-medium">Técnico Asignado</label>
                              <Select value={tecnicoAsignado} onValueChange={setTecnicoAsignado}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar técnico" />
                                </SelectTrigger>
                                <SelectContent>
                                  {tecnicos.map((tecnico) => (
                                    <SelectItem key={tecnico.codigo} value={tecnico.codigo}>
                                      {tecnico.nombre} {tecnico.apellido}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <label className="text-sm font-medium">Tipo de Trabajo <span className="text-red-500">*</span></label>
                            <div className="flex gap-4">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="tipoDiagnostico"
                                  value="reparacion"
                                  checked={tipoDiagnostico === "reparacion"}
                                  onChange={(e) => setTipoDiagnostico(e.target.value as "reparacion" | "servicio")}
                                  className="w-4 h-4"
                                />
                                <span className="text-sm">Reparación</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="tipoDiagnostico"
                                  value="servicio"
                                  checked={tipoDiagnostico === "servicio"}
                                  onChange={(e) => setTipoDiagnostico(e.target.value as "reparacion" | "servicio")}
                                  className="w-4 h-4"
                                />
                                <span className="text-sm">Mantenimiento/Servicio</span>
                              </label>
                            </div>
                            {!tipoDiagnostico && (
                              <p className="text-xs text-red-500">Debes seleccionar un tipo de trabajo</p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={aplicaGarantia}
                                onChange={(e) => setAplicaGarantia(e.target.checked)}
                                className="rounded"
                              />
                              ¿Aplica garantía?
                            </label>
                            <p className="text-xs text-muted-foreground">
                              Marca esta opción si el problema está cubierto por la garantía del producto
                            </p>
                          </div>

                          {/* Mostrar reingresos si existen */}
                          {incidente.incidentesAnteriores && incidente.incidentesAnteriores.length > 0 && (
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Historial de Reingresos</label>
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                                  <span className="text-sm font-medium text-yellow-800">Equipo con reingresos anteriores</span>
                                </div>
                                <div className="space-y-1">
                                  {incidente.incidentesAnteriores.map((incidenteId, index) => (
                                    <div key={index} className="text-xs text-yellow-700">
                                      • Incidente anterior: {incidenteId}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between">
                          <Button variant="outline" onClick={() => setDiagnosticoStarted(false)}>
                            Cancelar
                          </Button>
                          <Button 
                            onClick={() => setCurrentStep(2)}
                            disabled={!descripcionProblema.trim() || !tecnicoAsignado || !tipoDiagnostico}
                          >
                            Siguiente: Repuestos
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Step 2: Repuestos con lógica original */}
                    {currentStep === 2 && (
                      <div className="space-y-6">
                        <div className="text-center">
                          <h3 className="text-lg font-medium">Paso 2: Solicitud de Repuestos</h3>
                          <p className="text-sm text-muted-foreground">Selecciona los repuestos necesarios para la reparación</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Switch checked={requiereRepuestos} onCheckedChange={setRequiereRepuestos} id="req-repuestos" />
                          <label htmlFor="req-repuestos" className="text-sm font-medium">¿Requiere repuestos?</label>
                        </div>

                        {requiereRepuestos && (
                          <ResizablePanelGroup direction="horizontal" className="min-h-[500px] rounded-lg border">
                            {/* Panel izquierdo: Repuestos disponibles */}
                            <ResizablePanel defaultSize={60} className="p-4">
                              <div className="space-y-4 h-full">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium">Repuestos Disponibles</h4>
                                  <Badge variant="outline">
                                    {filteredRepuestos.length} disponibles
                                  </Badge>
                                </div>
                                
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    placeholder="Buscar repuesto..."
                                    value={searchRepuesto}
                                    onChange={(e) => setSearchRepuesto(e.target.value)}
                                    className="pl-10"
                                  />
                                </div>

                                <div className="flex-1 overflow-auto space-y-2">
                                  {filteredRepuestos.map((repuesto) => (
                                    <div key={repuesto.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                                         onClick={() => addRepuestoFromAvailable(repuesto)}>
                                      <div className="w-10 h-10 bg-muted rounded flex items-center justify-center flex-shrink-0">
                                        <Package className="w-5 h-5" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm">{repuesto.descripcion}</div>
                                        <div className="text-xs text-muted-foreground">{repuesto.codigo}</div>
                                        <div className="text-xs text-muted-foreground">{repuesto.clave}</div>
                                      </div>
                                      <Button size="sm" variant="outline">
                                        <Plus className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  ))}
                                  
                                  {filteredRepuestos.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                      <Search className="w-12 h-12 mb-2 opacity-50" />
                                      <p>No se encontraron repuestos</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </ResizablePanel>

                            <ResizableHandle />

                            {/* Panel derecho: Repuestos seleccionados */}
                            <ResizablePanel defaultSize={40} className="p-4">
                              <Card className="h-full">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                  <CardTitle className="flex items-center gap-2">
                                    <ShoppingCart className="w-4 h-4" />
                                    Repuestos Solicitados
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => {
                                        if (repuestosList.length === 0) {
                                          toast({ 
                                            title: "Sin repuestos seleccionados", 
                                            description: "Debe seleccionar al menos un repuesto para realizar el pedido.",
                                            variant: "destructive"
                                          });
                                          return;
                                        }
                                        
                                        // Si aplica garantía, despachar automáticamente los repuestos
                                        if (aplicaGarantia) {
                                          const selectedRepuestos = repuestosList.map(r => ({
                                            repuestoCodigo: r.repuestoCodigo,
                                            cantidad: r.cantidad,
                                            fechaSolicitud: new Date().toISOString().split('T')[0],
                                            estado: 'recibido' as const
                                          }));

                                          const updatedIncidente = {
                                            ...incidente,
                                            repuestosSolicitados: [...(incidente.repuestosSolicitados || []), ...selectedRepuestos]
                                          };
                                          setIncidente(updatedIncidente);
                                          
                                          toast({ 
                                            title: "Repuestos despachados", 
                                            description: `Se han despachado ${repuestosList.length} repuesto(s) automáticamente por garantía.`
                                          });
                                        } else {
                                          toast({ 
                                            title: "Pedido realizado", 
                                            description: `Se ha solicitado el pedido de ${repuestosList.length} repuesto(s) para el incidente ${incidente.id}.`
                                          });
                                        }
                                      }}
                                    >
                                      <ShoppingCart className="w-4 h-4" />
                                      Realizar Pedido
                                    </Button>
                                  </CardTitle>
                                  <CardDescription>Lista de repuestos requeridos para la reparación</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[calc(100%-120px)] overflow-auto">
                                  {repuestosList.length > 0 ? (
                                    <div className="space-y-3">
                                      <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground border-b pb-2">
                                        <div className="col-span-1"></div>
                                        <div className="col-span-6">Repuesto</div>
                                        <div className="col-span-2 text-center">Cant.</div>
                                        <div className="col-span-2 text-center">Estado</div>
                                        <div className="col-span-1"></div>
                                      </div>
                                      
                                      {repuestosList.map((item, index) => {
                                        const status = getRepuestoStatus(item.repuestoCodigo);
                                        return (
                                          <div key={index} className="grid grid-cols-12 gap-2 items-center py-2 text-sm border-b border-muted/30">
                                            <div className="col-span-1">
                                              <div className="w-6 h-6 bg-muted rounded flex items-center justify-center">
                                                <Package className="w-3 h-3" />
                                              </div>
                                            </div>
                                            <div className="col-span-6">
                                              <div className="font-medium text-xs">{item.repuestoCodigo}</div>
                                            </div>
                                            <div className="col-span-2 text-center">
                                              <div className="flex items-center justify-center gap-1">
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  className="h-6 w-6 p-0"
                                                  onClick={() => updateRepuestoCantidad(item.repuestoCodigo, item.cantidad - 1)}
                                                >
                                                  <Minus className="w-3 h-3" />
                                                </Button>
                                                <span className="w-6 text-center text-xs">{item.cantidad}</span>
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  className="h-6 w-6 p-0"
                                                  onClick={() => updateRepuestoCantidad(item.repuestoCodigo, item.cantidad + 1)}
                                                >
                                                  <Plus className="w-3 h-3" />
                                                </Button>
                                              </div>
                                            </div>
                                            <div className="col-span-2 text-center">
                                              <Badge className={`text-xs px-1 py-0 ${status.color}`}>
                                                {status.label}
                                              </Badge>
                                            </div>
                                            <div className="col-span-1 text-center">
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                                onClick={() => removeRepuesto(item.repuestoCodigo)}
                                              >
                                                <X className="w-3 h-3" />
                                              </Button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                      <ShoppingCart className="w-12 h-12 mb-2 opacity-50" />
                                      <p className="text-sm">No hay repuestos seleccionados</p>
                                      <p className="text-xs">Haz clic en los repuestos disponibles para agregarlos</p>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            </ResizablePanel>
                          </ResizablePanelGroup>
                        )}

                        <div className="flex justify-between">
                          <Button variant="outline" onClick={() => setCurrentStep(1)}>
                            Anterior
                          </Button>
                          <Button onClick={() => setCurrentStep(3)}>
                            Finalizar: Revisión del Diagnóstico
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Documentación Automática */}
                    {currentStep === 3 && (
                      <div className="space-y-6">
                        <div className="text-center">
                          <h3 className="text-lg font-medium">Paso 3: Revisión Final del Diagnóstico</h3>
                          <p className="text-sm text-muted-foreground">Revisión del análisis técnico generado automáticamente</p>
                        </div>

                        <div className="space-y-6 bg-muted/30 rounded-lg p-6">
                          <div className="space-y-3">
                            <h4 className="font-medium text-sm text-primary">FALLA:</h4>
                            <div className="bg-background rounded-lg p-4 border">
                              {repuestosList.length > 0 ? (
                                <div className="space-y-2">
                                  {repuestosList.map((item, index) => (
                                    <div key={index} className="text-sm">
                                      • Falla en componente que requiere: {item.repuestoCodigo} (Cantidad: {item.cantidad})
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">No se requieren repuestos - Falla menor o de mantenimiento</p>
                              )}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h4 className="font-medium text-sm text-primary">CAUSA:</h4>
                            <div className="bg-background rounded-lg p-4 border">
                              <p className="text-sm">
                                {aplicaGarantia 
                                  ? "Desgaste normal de componentes cubierto por garantía"
                                  : repuestosList.length > 0 
                                    ? "Desgaste por uso normal o sobrecarga del equipo"
                                    : "Problema menor que no requiere reemplazo de componentes"
                                }
                              </p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h4 className="font-medium text-sm text-primary">RECOMENDACIÓN:</h4>
                            <div className="bg-background rounded-lg p-4 border">
                              <p className="text-sm">
                                {productoInfo 
                                  ? `Para equipos ${productoInfo.categoria}: ${
                                      repuestosList.length > 0 
                                        ? "Reemplazar componentes defectuosos y realizar mantenimiento preventivo" 
                                        : "Realizar mantenimiento preventivo y verificación general"
                                    }`
                                  : repuestosList.length > 0 
                                    ? "Reemplazar los componentes identificados según especificaciones técnicas"
                                    : "Continuar con mantenimiento preventivo regular"
                                }
                              </p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h4 className="font-medium text-sm text-primary">RESOLUCIÓN:</h4>
                            <div className="bg-background rounded-lg p-4 border">
                              <p className="text-sm">
                                {aplicaGarantia 
                                  ? `Reparación bajo garantía. ${
                                      repuestosList.length > 0 
                                        ? `Se procederá al reemplazo de ${repuestosList.length} componente(s) sin costo.` 
                                        : "Ajustes y calibración sin costo."
                                    }`
                                  : repuestosList.length > 0 
                                    ? `Reparación comercial. Cotización por repuestos y mano de obra. Tiempo estimado: 2-3 días hábiles.`
                                    : "Mantenimiento completado. Equipo funcional y listo para uso."
                                }
                              </p>
                            </div>
                          </div>

                          <div className="bg-info/10 border border-info/20 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <Info className="w-5 h-5 text-info mt-0.5" />
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-info">Información del diagnóstico:</p>
                                <div className="text-xs space-y-1">
                                  <p>• Técnico: {getTecnicoName(tecnicoAsignado)}</p>
                                  <p>• Lugar de ingreso: {lugarIngreso}</p>
                                  <p>• Garantía: {aplicaGarantia ? "Aplica" : "No aplica"}</p>
                                  <p>• Repuestos requeridos: {repuestosList.length > 0 ? `${repuestosList.length} componente(s)` : "Ninguno"}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between">
                          <Button variant="outline" onClick={() => setCurrentStep(2)}>
                            Anterior
                          </Button>
                          <Button 
                            onClick={handleGuardarDiagnostico}
                            disabled={!tipoDiagnostico}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            Confirmar y Guardar Diagnóstico
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Info className="w-4 h-4" />
                      Al continuar, podrás registrar el diagnóstico técnico.
                    </div>
                    <Button onClick={iniciarDiagnostico} className="bg-primary text-primary-foreground hover:bg-primary/90">
                      Iniciar Diagnóstico
                    </Button>
                  </div>
                )
              ) : incidente.diagnostico ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Fecha de Diagnóstico:</p>
                      <p className="text-sm text-muted-foreground">{incidente.diagnostico.fecha}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Técnico:</p>
                      <p className="text-sm text-muted-foreground">{getTecnicoName(incidente.diagnostico.tecnicoCodigo)}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Tiempo Estimado:</p>
                      <p className="text-sm text-muted-foreground">{incidente.diagnostico.tiempoEstimadoReparacion}</p>
                    </div>
                    {incidente.diagnostico.costoEstimado !== undefined && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Costo Estimado:</p>
                        <p className="text-sm text-muted-foreground">
                          {incidente.diagnostico.costoEstimado === 0 
                            ? "Sin costo (Garantía)" 
                            : `Q${incidente.diagnostico.costoEstimado.toFixed(2)}`}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Descripción del Diagnóstico:</h4>
                      <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                        {incidente.diagnostico.descripcion}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Fallas Encontradas:</h4>
                      <div className="space-y-2">
                        {incidente.diagnostico.fallasEncontradas.map((falla, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-warning" />
                            <span className="text-sm">{falla}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Recomendaciones:</h4>
                      <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                        {incidente.diagnostico.recomendaciones}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {incidente.diagnostico.requiereRepuestos ? (
                        <Badge className="bg-warning text-warning-foreground">
                          <Package className="w-3 h-3 mr-1" />
                          Requiere Repuestos
                        </Badge>
                      ) : (
                        <Badge className="bg-success text-success-foreground">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          No Requiere Repuestos
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Wrench className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Diagnóstico en proceso</p>
                </div>
              )}
            </CardContent>
          </Card>
          )}
        </TabsContent>

        <TabsContent value="repuestos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Repuestos Requeridos</CardTitle>
              <CardDescription>Lista de componentes necesarios para la reparación</CardDescription>
            </CardHeader>
            <CardContent>
              {incidente.status === "Pendiente de diagnostico" && diagnosticoStarted && requiereRepuestos ? (
                <ResizablePanelGroup direction="horizontal" className="min-h-[600px] rounded-lg border">
                  {/* Panel de Repuestos Seleccionados */}
                  <ResizablePanel defaultSize={50} minSize={30}>
                    <Card className="h-full border-0 rounded-none">
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">Repuestos Seleccionados</CardTitle>
                          <Button 
                            size="sm" 
                            className="gap-2"
                            onClick={() => {
                              if (repuestosList.length === 0) {
                                toast({ 
                                  title: "Sin repuestos", 
                                  description: "Debe seleccionar al menos un repuesto para realizar el pedido.",
                                  variant: "destructive"
                                });
                                return;
                              }
                              toast({ 
                                title: "Pedido realizado", 
                                description: `Se ha solicitado el pedido de ${repuestosList.length} repuesto(s) para el incidente ${incidente.id}.`
                              });
                            }}
                          >
                            <ShoppingCart className="w-4 h-4" />
                            Realizar Pedido
                          </Button>
                        </div>
                        <CardDescription>Lista de repuestos requeridos para la reparación</CardDescription>
                      </CardHeader>
                      <CardContent className="h-[calc(100%-120px)] overflow-auto">
                        {repuestosList.length > 0 ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground border-b pb-2">
                              <div className="col-span-1"></div>
                              <div className="col-span-4">Repuesto</div>
                              <div className="col-span-2">Código</div>
                              <div className="col-span-2">Disponibilidad</div>
                              <div className="col-span-2">Cantidad</div>
                              <div className="col-span-1">Acciones</div>
                            </div>
                            
                            {repuestosList.map((repuestoSelec) => {
                              const repuestoInfo = repuestosDisponibles.find(r => r.codigo === repuestoSelec.repuestoCodigo);
                              return (
                                <div key={repuestoSelec.repuestoCodigo} className="grid grid-cols-12 gap-2 items-center py-2 border-b border-muted/50">
                                  <div className="col-span-1">
                                    <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                                      <Package className="w-4 h-4" />
                                    </div>
                                  </div>
                                  <div className="col-span-4">
                                    <div className="font-medium text-sm">{repuestoInfo?.descripcion || repuestoSelec.repuestoCodigo}</div>
                                  </div>
                                  <div className="col-span-2">
                                    <div className="text-sm text-muted-foreground">{repuestoSelec.repuestoCodigo}</div>
                                  </div>
                                  <div className="col-span-2">
                                    {(() => {
                                      const status = getRepuestoStatus(repuestoSelec.repuestoCodigo);
                                      return (
                                        <Badge className={status.color}>
                                          {status.status === 'en-stock' && <CheckCircle className="w-3 h-3 mr-1" />}
                                          {status.status === 'otra-bodega' && <Clock className="w-3 h-3 mr-1" />}
                                          {status.status === 'no-disponible' && <X className="w-3 h-3 mr-1" />}
                                          {status.label}
                                        </Badge>
                                      );
                                    })()}
                                  </div>
                                  <div className="col-span-2">
                                    <div className="flex items-center gap-1">
                                      <Button 
                                        size="icon" 
                                        variant="outline" 
                                        className="h-6 w-6"
                                        onClick={() => updateRepuestoCantidad(repuestoSelec.repuestoCodigo, repuestoSelec.cantidad - 1)}
                                      >
                                        <Minus className="w-3 h-3" />
                                      </Button>
                                      <span className="text-sm w-8 text-center">{repuestoSelec.cantidad}</span>
                                      <Button 
                                        size="icon" 
                                        variant="outline" 
                                        className="h-6 w-6"
                                        onClick={() => updateRepuestoCantidad(repuestoSelec.repuestoCodigo, repuestoSelec.cantidad + 1)}
                                      >
                                        <Plus className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="col-span-1">
                                    <Button 
                                      size="sm" 
                                      variant="destructive"
                                      className="text-xs px-2"
                                      onClick={() => removeRepuesto(repuestoSelec.repuestoCodigo)}
                                    >
                                      Eliminar
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <Package className="w-12 h-12 mb-2 opacity-50" />
                            <p>No hay repuestos seleccionados</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </ResizablePanel>
                  
                  <ResizableHandle />
                  
                  {/* Panel de Repuestos Disponibles */}
                  <ResizablePanel defaultSize={50} minSize={30}>
                    <Card className="h-full border-0 rounded-none">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg">Repuestos Disponibles</CardTitle>
                        <CardDescription>Para {productoInfo?.descripcion || 'este producto'}</CardDescription>
                      </CardHeader>
                      <CardContent className="h-[calc(100%-120px)]">
                        <div className="space-y-4 h-full flex flex-col">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Buscar repuesto..."
                              value={searchRepuesto}
                              onChange={(e) => setSearchRepuesto(e.target.value)}
                              className="pl-10"
                            />
                          </div>

                          <div className="flex-1 overflow-auto space-y-2">
                            {filteredRepuestos.map((repuesto) => (
                              <div key={repuesto.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                                   onClick={() => addRepuestoFromAvailable(repuesto)}>
                                <div className="w-10 h-10 bg-muted rounded flex items-center justify-center flex-shrink-0">
                                  <Package className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm">{repuesto.descripcion}</div>
                                  <div className="text-xs text-muted-foreground">{repuesto.codigo}</div>
                                  <div className="text-xs text-muted-foreground">{repuesto.clave}</div>
                                </div>
                                <Button size="sm" variant="outline">
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                            
                            {filteredRepuestos.length === 0 && (
                              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                <Search className="w-12 h-12 mb-2 opacity-50" />
                                <p>No se encontraron repuestos</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </ResizablePanel>
                </ResizablePanelGroup>
              ) : incidente.repuestosSolicitados && incidente.repuestosSolicitados.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="font-medium">Repuestos solicitados para esta reparación:</h4>
                  {incidente.repuestosSolicitados.map((repuesto, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-medium">{repuesto.repuestoCodigo}</p>
                          <p className="text-sm text-muted-foreground">Cantidad: {repuesto.cantidad}</p>
                        </div>
                        <div className="text-right">
                          {repuesto.estado === 'recibido' && (
                            <Badge className="bg-success text-success-foreground">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Recibido
                            </Badge>
                          )}
                          {repuesto.estado === 'en-transito' && (
                            <Badge className="bg-warning text-warning-foreground">
                              <Truck className="w-3 h-3 mr-1" />
                              En Tránsito
                            </Badge>
                          )}
                          {repuesto.estado === 'pendiente' && (
                            <Badge variant="outline">
                              <Clock className="w-3 h-3 mr-1" />
                              Pendiente
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-muted-foreground">
                        <div>Solicitado: {repuesto.fechaSolicitud}</div>
                        {repuesto.bodegaOrigen && (
                          <div>Bodega: {repuesto.bodegaOrigen}</div>
                        )}
                        {repuesto.fechaEstimadaLlegada && (
                          <div>Estimado: {repuesto.fechaEstimadaLlegada}</div>
                        )}
                      </div>
                    </div>
                  ))}

                  {repuestosDisponibles.length > 0 && (
                    <div className="space-y-4 mt-6">
                      <h4 className="font-medium">Otros repuestos disponibles para este producto:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {repuestosDisponibles.map((repuesto) => (
                          <div key={repuesto.id} className="border rounded-lg p-4 space-y-2">
                            <div className="aspect-square bg-muted rounded-lg mb-2 flex items-center justify-center">
                              {repuesto.url_foto ? (
                                <img 
                                  src={repuesto.url_foto} 
                                  alt={repuesto.descripcion}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <Package className="w-12 h-12 text-muted-foreground" />
                              )}
                            </div>
                            <h5 className="font-medium text-sm">{repuesto.descripcion}</h5>
                            <p className="text-xs text-muted-foreground">Código: {repuesto.codigo}</p>
                            <p className="text-xs text-muted-foreground">Clave: {repuesto.clave}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {repuestosDisponibles.length > 0 ? (
                    <>
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Repuestos disponibles para este producto</h4>
                        {incidente.status === "Pendiente de diagnostico" && (
                          <p className="text-sm text-muted-foreground">
                            Para solicitar repuestos, inicia el diagnóstico
                          </p>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {repuestosDisponibles.map((repuesto) => (
                          <div key={repuesto.id} className="border rounded-lg p-4 space-y-2">
                            <div className="aspect-square bg-muted rounded-lg mb-2 flex items-center justify-center">
                              {repuesto.url_foto ? (
                                <img 
                                  src={repuesto.url_foto} 
                                  alt={repuesto.descripcion}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <Package className="w-12 h-12 text-muted-foreground" />
                              )}
                            </div>
                            <h5 className="font-medium text-sm">{repuesto.descripcion}</h5>
                            <p className="text-xs text-muted-foreground">Código: {repuesto.codigo}</p>
                            <p className="text-xs text-muted-foreground">Clave: {repuesto.clave}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No hay repuestos disponibles para este producto</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentacion" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Documentación</CardTitle>
              <CardDescription>Archivos multimedia y documentos relacionados con el incidente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Diagnóstico realizado */}
                {incidente.diagnostico && (
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Diagnóstico Técnico
                    </h4>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                      <div>
                        <p className="text-sm font-medium">Fecha: {incidente.diagnostico.fecha}</p>
                        <p className="text-sm font-medium">Técnico: {getTecnicoName(incidente.diagnostico.tecnicoCodigo)}</p>
                        <p className="text-sm font-medium">Garantía: {incidente.coberturaGarantia ? 'Sí aplica' : 'No aplica'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">Descripción:</p>
                        <p className="text-sm text-muted-foreground">{incidente.diagnostico.descripcion}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Fallas de repuestos solicitados */}
                {incidente.repuestosSolicitados && incidente.repuestosSolicitados.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Fallas y Repuestos Solicitados
                    </h4>
                    <div className="space-y-2">
                      {incidente.repuestosSolicitados.map((repuesto, index) => (
                        <div key={index} className="bg-muted/50 rounded-lg p-3">
                          <p className="text-sm font-medium">Repuesto: {repuesto.repuestoCodigo}</p>
                          <p className="text-sm text-muted-foreground">Cantidad: {repuesto.cantidad}</p>
                          <p className="text-sm text-muted-foreground">Estado: {repuesto.estado}</p>
                          <p className="text-sm text-muted-foreground">Fecha solicitud: {repuesto.fechaSolicitud}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Subir archivos multimedia */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Archivos Multimedia
                  </h4>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                    <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">Arrastra archivos aquí o haz clic para seleccionar</p>
                    <p className="text-sm text-muted-foreground mb-4">Formatos soportados: JPG, PNG, PDF, MP4, DOC</p>
                    <Button variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Seleccionar archivos
                    </Button>
                  </div>
                  
                  {/* Lista de archivos subidos (placeholder) */}
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">No hay archivos subidos aún</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historial" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Actividades</CardTitle>
              <CardDescription>Cronología de eventos del incidente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 border-l-2 border-primary/20 bg-muted/30 rounded-r">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Incidente creado</p>
                    <p className="text-xs text-muted-foreground">{incidente.fechaIngreso}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Problema reportado: {incidente.descripcionProblema}
                    </p>
                  </div>
                </div>
                
                {incidente.historialEstados && incidente.historialEstados.map((historial, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 border-l-2 border-muted/40 bg-muted/30 rounded-r">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        Cambio de estado: {historial.estadoAnterior} → {historial.estadoNuevo}
                      </p>
                      <p className="text-xs text-muted-foreground">{historial.fecha}</p>
                      <p className="text-xs text-muted-foreground">
                        Técnico: {getTecnicoName(historial.tecnicoCodigo)}
                      </p>
                      {historial.observaciones && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          {historial.observaciones}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {incidente.diagnostico && (
                  <div className="flex items-start gap-3 p-3 border-l-2 border-info/20 bg-muted/30 rounded-r">
                    <div className="w-2 h-2 bg-info rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Diagnóstico completado</p>
                      <p className="text-xs text-muted-foreground">{incidente.diagnostico.fecha}</p>
                      <p className="text-xs text-muted-foreground">
                        Técnico: {getTecnicoName(incidente.diagnostico.tecnicoCodigo)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {incidente.diagnostico.fallasEncontradas.length} falla(s) identificada(s)
                      </p>
                    </div>
                  </div>
                )}

                {incidente.repuestosSolicitados && incidente.repuestosSolicitados.length > 0 && (
                  <div className="flex items-start gap-3 p-3 border-l-2 border-warning/20 bg-muted/30 rounded-r">
                    <div className="w-2 h-2 bg-warning rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Repuestos solicitados</p>
                      <p className="text-xs text-muted-foreground">
                        {incidente.repuestosSolicitados[0].fechaSolicitud}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {incidente.repuestosSolicitados.length} repuesto(s) solicitado(s)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de confirmación */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Diagnóstico</DialogTitle>
            <DialogDescription>
              Revisa y confirma la información del diagnóstico antes de guardar.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <label className="text-sm font-medium">Tipo de Trabajo <span className="text-red-500">*</span></label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tipoDiagnosticoDialog"
                    value="reparacion"
                    checked={tipoDiagnostico === "reparacion"}
                    onChange={(e) => setTipoDiagnostico(e.target.value as "reparacion" | "servicio")}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Reparación</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tipoDiagnosticoDialog"
                    value="servicio"
                    checked={tipoDiagnostico === "servicio"}
                    onChange={(e) => setTipoDiagnostico(e.target.value as "reparacion" | "servicio")}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Mantenimiento/Servicio</span>
                </label>
              </div>
              {!tipoDiagnostico && (
                <p className="text-xs text-red-500">Debes seleccionar un tipo de trabajo</p>
              )}
            </div>
            
            <div className="text-sm space-y-1">
              <p><strong>Técnico:</strong> {getTecnicoName(tecnicoAsignado)}</p>
              <p><strong>Aplica garantía:</strong> {aplicaGarantia ? "Sí" : "No"}</p>
              <p><strong>Requiere repuestos:</strong> {(requiereRepuestos || repuestosList.length > 0) ? "Sí" : "No"}</p>
              {repuestosList.length > 0 && (
                <p><strong>Repuestos:</strong> {repuestosList.length} item(s)</p>
              )}
            </div>
          </div>
          
          <DialogFooter className="flex-col-reverse sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                onGuardarDiagnostico();
                setShowConfirmDialog(false);
              }}
              disabled={!tipoDiagnostico}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Confirmar y Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para editar código de producto */}
      <Dialog open={isEditingProductCode} onOpenChange={setIsEditingProductCode}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Código de Producto (SKU)</DialogTitle>
            <DialogDescription>
              Modifica el código del producto. Solo se permiten letras, números, guiones y guiones bajos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="product-code-input" className="text-sm font-medium">
                Código de Producto
              </label>
              <Input
                id="product-code-input"
                type="text"
                value={editedProductCode}
                onChange={(e) => setEditedProductCode(e.target.value.replace(/\s/g, ''))}
                placeholder="Ej: PROD-12345"
                className="font-mono"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Formato: Solo alfanuméricos, guiones y guiones bajos (sin espacios)
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setIsEditingProductCode(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveProductCode}
              className="bg-success hover:bg-success/90 text-success-foreground"
            >
              <Save className="w-4 h-4 mr-2" />
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}