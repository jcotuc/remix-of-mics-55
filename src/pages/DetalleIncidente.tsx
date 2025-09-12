import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit, Calendar, User, Package, AlertTriangle, CheckCircle, Clock, Truck, DollarSign, FileText, Wrench, Plus, X, Stethoscope, Info, Search, ShoppingCart, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/StatusBadge";
import { incidentes, clientes, productos, tecnicos } from "@/data/mockData";
import { Incidente } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function DetalleIncidente() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [incidente, setIncidente] = useState<Incidente | null>(null);
  const [productoInfo, setProductoInfo] = useState<any>(null);
  const [repuestosDisponibles, setRepuestosDisponibles] = useState<any[]>([]);
  const [searchRepuesto, setSearchRepuesto] = useState("");
  
  // Estado del formulario de diagnóstico
  const [diagnosticoStarted, setDiagnosticoStarted] = useState(false);
  const [descripcion, setDescripcion] = useState("");
  const [fallaInput, setFallaInput] = useState("");
  const [fallas, setFallas] = useState<string[]>([]);
  const [recomendaciones, setRecomendaciones] = useState("");
  const [requiereRepuestos, setRequiereRepuestos] = useState(false);
  const [tiempoEstimado, setTiempoEstimado] = useState("");
  const [costoEstimado, setCostoEstimado] = useState<string>("");

  type RepuestoItem = { repuestoCodigo: string; cantidad: number };
  const [repuestosList, setRepuestosList] = useState<RepuestoItem[]>([]);

  useEffect(() => {
    if (id) {
      const incidenteEncontrado = incidentes.find(i => i.id === id);
      setIncidente(incidenteEncontrado || null);
      
      if (incidenteEncontrado) {
        // Buscar información del producto en la base de datos
        const fetchProducto = async () => {
          try {
            const { data, error } = await supabase
              .from('productos')
              .select('*')
              .eq('codigo', incidenteEncontrado.codigoProducto)
              .single();
            
            if (data && !error) {
              setProductoInfo(data);
            }
          } catch (error) {
            console.error('Error fetching producto:', error);
          }
        };

        // Buscar repuestos relacionados con el producto
        const fetchRepuestos = async () => {
          try {
            const { data, error } = await supabase
              .from('repuestos')
              .select('*')
              .eq('codigo_producto', incidenteEncontrado.codigoProducto);
            
            if (data && !error) {
              setRepuestosDisponibles(data);
            }
          } catch (error) {
            console.error('Error fetching repuestos:', error);
          }
        };
        
        fetchProducto();
        fetchRepuestos();
      }
    }
  }, [id]);

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

  const addFalla = () => {
    const v = fallaInput.trim();
    if (!v) return;
    setFallas(prev => [...prev, v]);
    setFallaInput("");
  };
  const removeFalla = (idx: number) => setFallas(prev => prev.filter((_, i) => i !== idx));

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
    toast({
      title: "Diagnóstico iniciado",
      description: `Puedes registrar hallazgos y repuestos para el incidente ${incidente?.id}.`,
    });
  };

  const onGuardarDiagnostico = () => {
    if (!incidente) return;
    if (!descripcion.trim()) {
      toast({ title: "Falta descripción", description: "Escribe la descripción del diagnóstico.", variant: "destructive" });
      return;
    }
    const idx = incidentes.findIndex(i => i.id === incidente.id);
    if (idx === -1) return;

    const today = new Date().toISOString().slice(0, 10);
    const requiere = requiereRepuestos || repuestosList.length > 0;
    const estadoAnterior = incidentes[idx].status;
    const estadoNuevo = requiere ? "Pendiente por repuestos" : "En diagnostico" as const;

    incidentes[idx] = {
      ...incidentes[idx],
      status: estadoNuevo,
      diagnostico: {
        fecha: today,
        tecnicoCodigo: incidentes[idx].codigoTecnico,
        descripcion: descripcion.trim(),
        fallasEncontradas: fallas,
        recomendaciones: recomendaciones.trim(),
        requiereRepuestos: requiere,
        tiempoEstimadoReparacion: tiempoEstimado.trim() || "",
        costoEstimado: costoEstimado ? Number(costoEstimado) : undefined,
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
    // Reset form
    setDescripcion("");
    setFallas([]);
    setRecomendaciones("");
    setRequiereRepuestos(false);
    setTiempoEstimado("");
    setCostoEstimado("");
    setRepuestosList([]);
    
    toast({ title: "Diagnóstico guardado", description: `Incidente ${incidente.id} actualizado.` });
  };

  // Filtrar repuestos disponibles por búsqueda
  const filteredRepuestos = repuestosDisponibles.filter(repuesto =>
    repuesto.descripcion.toLowerCase().includes(searchRepuesto.toLowerCase()) ||
    repuesto.codigo.toLowerCase().includes(searchRepuesto.toLowerCase()) ||
    repuesto.clave.toLowerCase().includes(searchRepuesto.toLowerCase())
  );

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
            <p className="text-sm text-muted-foreground">
              Código: {incidente.codigoProducto}
              {productoInfo && ` | Clave: ${productoInfo.clave}`}
            </p>
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
        </TabsContent>

        <TabsContent value="diagnostico" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5" />
                Diagnóstico Técnico
              </CardTitle>
              <CardDescription>
                {incidente.status === "Pendiente de diagnostico" 
                  ? "Inicia el proceso de diagnóstico técnico"
                  : "Análisis y evaluación del problema"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {incidente.status === "Pendiente de diagnostico" ? (
                diagnosticoStarted ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Descripción del diagnóstico</label>
                      <Textarea
                        placeholder="Escribe el análisis técnico y observaciones..."
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Fallas encontradas</label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Ej. Rodamientos desgastados"
                          value={fallaInput}
                          onChange={(e) => setFallaInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFalla(); } }}
                        />
                        <Button type="button" variant="secondary" onClick={addFalla} aria-label="Agregar falla">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      {fallas.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {fallas.map((f, i) => (
                            <Badge key={i} variant="outline" className="flex items-center gap-1">
                              {f}
                              <button type="button" onClick={() => removeFalla(i)} aria-label="Quitar falla">
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Recomendaciones</label>
                        <Textarea
                          placeholder="Acciones sugeridas, piezas a revisar/reemplazar..."
                          value={recomendaciones}
                          onChange={(e) => setRecomendaciones(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Tiempo estimado de reparación</label>
                        <Input
                          placeholder="Ej. 2-3 días hábiles"
                          value={tiempoEstimado}
                          onChange={(e) => setTiempoEstimado(e.target.value)}
                        />
                        <label className="text-sm font-medium mt-2">Costo estimado (opcional)</label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Ej. 0 (en garantía)"
                          value={costoEstimado}
                          onChange={(e) => setCostoEstimado(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Switch checked={requiereRepuestos} onCheckedChange={setRequiereRepuestos} id="req-repuestos" />
                        <label htmlFor="req-repuestos" className="text-sm">Requiere repuestos</label>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setDiagnosticoStarted(false)}>Cancelar</Button>
                      <Button onClick={onGuardarDiagnostico} className="bg-primary text-primary-foreground hover:bg-primary/90">Guardar diagnóstico</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Info className="w-4 h-4" />
                      Al continuar, podrás registrar hallazgos y repuestos.
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
        </TabsContent>

        <TabsContent value="repuestos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Repuestos Requeridos</CardTitle>
              <CardDescription>Lista de componentes necesarios para la reparación</CardDescription>
            </CardHeader>
            <CardContent>
              {incidente.status === "Pendiente de diagnostico" && diagnosticoStarted && requiereRepuestos ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Repuestos Seleccionados */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Repuestos Seleccionados</h4>
                      <Button size="sm" className="gap-2">
                        <ShoppingCart className="w-4 h-4" />
                        Realizar Pedido
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">Lista de repuestos requeridos para la reparación</p>
                    
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
                                <Badge variant="outline" className="text-xs">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  En stock
                                </Badge>
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
                      <div className="text-center py-8 text-muted-foreground">
                        <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No hay repuestos seleccionados</p>
                      </div>
                    )}
                  </div>

                  {/* Repuestos Disponibles */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Repuestos Disponibles</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">Para {productoInfo?.descripcion || 'este producto'}</p>
                    
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar repuesto..."
                        value={searchRepuesto}
                        onChange={(e) => setSearchRepuesto(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    <div className="space-y-2 max-h-96 overflow-y-auto">
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
                        <div className="text-center py-8 text-muted-foreground">
                          <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>No se encontraron repuestos</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
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
              <CardDescription>Archivos multimedia relacionados con el incidente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">Arrastra archivos aquí o haz clic para seleccionar</p>
                  <p className="text-sm text-muted-foreground mb-4">Formatos soportados: JPG, PNG, PDF, MP4, DOC</p>
                  <Button variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Seleccionar archivos
                  </Button>
                </div>
                
                {/* Aquí se mostrarían los archivos subidos */}
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">No hay archivos subidos aún</p>
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
    </div>
  );
}