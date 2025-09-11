import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, Upload, Plus, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Producto, Repuesto } from "@/types";

interface RepuestoSeleccionado extends Repuesto {
  cantidad: number;
}

export default function NuevoIncidente() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("general");
  
  // Tab 1: General
  const [codigoProducto, setCodigoProducto] = useState("");
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [productosEncontrados, setProductosEncontrados] = useState<Producto[]>([]);
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [descripcionFalla, setDescripcionFalla] = useState("");
  const [archivos, setArchivos] = useState<File[]>([]);
  
  // Tab 2: Diagnóstico
  const [diagnostico, setDiagnostico] = useState("");
  const [garantia, setGarantia] = useState<"si" | "no" | "">("");
  
  // Tab 3: Repuestos
  const [repuestosSeleccionados, setRepuestosSeleccionados] = useState<RepuestoSeleccionado[]>([]);
  const [busquedaRepuesto, setBusquedaRepuesto] = useState("");
  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  
  // Tab 4: Documentación
  const [comentarios, setComentarios] = useState("");

  // Load repuestos on component mount
  useEffect(() => {
    const fetchRepuestos = async () => {
      try {
        const { data, error } = await supabase
          .from('repuestos')
          .select('*');
        
        if (error) {
          console.error('Error fetching repuestos:', error);
          return;
        }

        // Transform Supabase data to match Repuesto type
        const transformedData: Repuesto[] = data.map(item => ({
          numero: item.numero,
          codigo: item.codigo,
          clave: item.clave,
          descripcion: item.descripcion,
          urlFoto: item.url_foto || "/api/placeholder/150/150",
          codigoProducto: item.codigo_producto
        }));

        setRepuestos(transformedData);
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchRepuestos();
  }, []);

  // Búsqueda automática de producto cuando se escribe
  useEffect(() => {
    if (codigoProducto.length >= 3) {
      const fetchProductos = async () => {
        try {
          const { data, error } = await supabase
            .from('productos')
            .select('*')
            .or(`codigo.ilike.%${codigoProducto}%,clave.ilike.%${codigoProducto}%`);
          
          if (error) {
            console.error('Error fetching productos:', error);
            return;
          }

          // Transform Supabase data to match Producto type
          const transformedData: Producto[] = data.map(item => ({
            codigo: item.codigo.trim(),
            clave: item.clave.trim(),
            descripcion: item.descripcion.trim(),
            descontinuado: item.descontinuado,
            urlFoto: item.url_foto || "/api/placeholder/200/200"
          }));

          setProductosEncontrados(transformedData);
          setMostrarResultados(transformedData.length > 1);
          
          // Si solo hay un producto, seleccionarlo automáticamente
          if (transformedData.length === 1) {
            setProductoSeleccionado(transformedData[0]);
          } else if (transformedData.length === 0) {
            setProductoSeleccionado(null);
          } else {
            // Si hay múltiples productos, limpiar la selección para que el usuario elija
            setProductoSeleccionado(null);
          }
        } catch (error) {
          console.error('Error:', error);
          setProductosEncontrados([]);
          setMostrarResultados(false);
          setProductoSeleccionado(null);
        }
      };

      fetchProductos();
    } else {
      setProductosEncontrados([]);
      setMostrarResultados(false);
      setProductoSeleccionado(null);
    }
  }, [codigoProducto]);

  const seleccionarProducto = (producto: Producto) => {
    setProductoSeleccionado(producto);
    setCodigoProducto(producto.codigo);
    setMostrarResultados(false);
  };

  const agregarRepuesto = (repuesto: Repuesto) => {
    const existente = repuestosSeleccionados.find(r => r.numero === repuesto.numero);
    if (existente) {
      setRepuestosSeleccionados(prev => 
        prev.map(r => r.numero === repuesto.numero ? { ...r, cantidad: r.cantidad + 1 } : r)
      );
    } else {
      setRepuestosSeleccionados(prev => [...prev, { ...repuesto, cantidad: 1 }]);
    }
  };

  const actualizarCantidadRepuesto = (numero: string, nuevaCantidad: number) => {
    if (nuevaCantidad <= 0) {
      setRepuestosSeleccionados(prev => prev.filter(r => r.numero !== numero));
    } else {
      setRepuestosSeleccionados(prev => 
        prev.map(r => r.numero === numero ? { ...r, cantidad: nuevaCantidad } : r)
      );
    }
  };

  const repuestosFiltrados = repuestos.filter(r => 
    r.descripcion.toLowerCase().includes(busquedaRepuesto.toLowerCase()) ||
    r.codigo.toLowerCase().includes(busquedaRepuesto.toLowerCase()) ||
    r.clave.toLowerCase().includes(busquedaRepuesto.toLowerCase())
  );

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setArchivos(prev => [...prev, ...files]);
  };

  const guardarIncidente = () => {
    // Aquí implementarías la lógica para guardar el incidente
    console.log("Guardando incidente:", {
      productoSeleccionado,
      descripcionFalla,
      archivos,
      diagnostico,
      garantia,
      repuestosSeleccionados,
      comentarios
    });
    navigate("/incidentes");
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate("/incidentes")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Incidentes
        </Button>
        <h1 className="text-2xl font-bold">Nuevo Incidente</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="diagnostico">Diagnóstico</TabsTrigger>
          <TabsTrigger value="repuestos">Repuestos</TabsTrigger>
          <TabsTrigger value="documentacion">Documentación</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información General</CardTitle>
              <CardDescription>Selecciona el producto y describe la falla</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="codigoProducto">Código del Producto</Label>
                <Input
                  id="codigoProducto"
                  value={codigoProducto}
                  onChange={(e) => setCodigoProducto(e.target.value)}
                  placeholder="Ingrese código o clave del producto (mín. 3 caracteres)"
                />
                {codigoProducto.length > 0 && codigoProducto.length < 3 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Escriba al menos 3 caracteres para buscar
                  </p>
                )}
                
                {/* Mostrar resultados de búsqueda cuando hay múltiples productos */}
                {mostrarResultados && (
                  <div className="mt-2 border rounded-lg max-h-60 overflow-y-auto bg-background">
                    <div className="p-2 border-b bg-muted/50">
                      <p className="text-sm font-medium">
                        {productosEncontrados.length} producto{productosEncontrados.length !== 1 ? 's' : ''} encontrado{productosEncontrados.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {productosEncontrados.map((producto) => (
                      <div 
                        key={producto.codigo}
                        className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0 transition-colors"
                        onClick={() => seleccionarProducto(producto)}
                      >
                        <div className="flex items-center gap-3">
                          <img 
                            src={producto.urlFoto} 
                            alt={producto.descripcion}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{producto.descripcion}</h4>
                            <p className="text-xs text-muted-foreground">
                              Código: {producto.codigo} | Clave: {producto.clave}
                            </p>
                            {producto.descontinuado && (
                              <Badge variant="destructive" className="mt-1 text-xs">
                                Descontinuado
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Mostrar mensaje cuando no se encuentren productos */}
                {codigoProducto.length >= 3 && productosEncontrados.length === 0 && (
                  <div className="mt-2 p-3 border rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">
                      No se encontraron productos que coincidan con "{codigoProducto}"
                    </p>
                  </div>
                )}
              </div>

              {productoSeleccionado && (
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <img 
                        src={productoSeleccionado.urlFoto} 
                        alt={productoSeleccionado.descripcion}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold">{productoSeleccionado.descripcion}</h3>
                        <p className="text-sm text-muted-foreground">
                          Código: {productoSeleccionado.codigo} | Clave: {productoSeleccionado.clave}
                        </p>
                        {productoSeleccionado.descontinuado && (
                          <Badge variant="destructive" className="mt-1">
                            Producto Descontinuado
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div>
                <Label htmlFor="descripcionFalla">Descripción de la Falla</Label>
                <Textarea
                  id="descripcionFalla"
                  value={descripcionFalla}
                  onChange={(e) => setDescripcionFalla(e.target.value)}
                  placeholder="Describe detalladamente el problema reportado por el cliente"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="archivos">Fotos y Videos</Label>
                <div className="border-2 border-dashed border-muted rounded-lg p-4 text-center">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Arrastra archivos aquí o haz clic para seleccionar
                  </p>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button variant="outline" asChild>
                    <label htmlFor="file-upload" className="cursor-pointer">
                      Seleccionar Archivos
                    </label>
                  </Button>
                </div>
                
                {archivos.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {archivos.map((archivo, index) => (
                      <div key={index} className="text-sm bg-muted p-2 rounded">
                        {archivo.name} ({(archivo.size / 1024 / 1024).toFixed(2)} MB)
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diagnostico" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Diagnóstico Técnico</CardTitle>
              <CardDescription>Resultados del análisis técnico</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="diagnostico">Descripción del Diagnóstico</Label>
                <Textarea
                  id="diagnostico"
                  value={diagnostico}
                  onChange={(e) => setDiagnostico(e.target.value)}
                  placeholder="Describe el diagnóstico técnico del problema"
                  rows={6}
                />
              </div>

              <div>
                <Label>Cobertura de Garantía</Label>
                <RadioGroup 
                  value={garantia} 
                  onValueChange={(value) => setGarantia(value as "si" | "no")}
                  className="flex gap-6 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="si" id="garantia-si" />
                    <Label htmlFor="garantia-si">Sí</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="garantia-no" />
                    <Label htmlFor="garantia-no">No</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="repuestos" className="space-y-6">
          <div className="grid grid-cols-4 gap-6 h-full">
            {/* Columna izquierda - 75% del ancho (3/4) */}
            <div className="col-span-3">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Repuestos Seleccionados</CardTitle>
                  <CardDescription>Lista de repuestos requeridos para la reparación</CardDescription>
                </CardHeader>
                <CardContent>
                  {repuestosSeleccionados.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Repuesto</TableHead>
                          <TableHead>Código</TableHead>
                          <TableHead>Cantidad</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {repuestosSeleccionados.map((repuesto) => (
                          <TableRow key={repuesto.numero}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <img 
                                  src={repuesto.urlFoto} 
                                  alt={repuesto.descripcion}
                                  className="w-8 h-8 object-cover rounded"
                                />
                                {repuesto.descripcion}
                              </div>
                            </TableCell>
                            <TableCell>{repuesto.codigo}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button 
                                  variant="outline" 
                                  size="icon"
                                  onClick={() => actualizarCantidadRepuesto(repuesto.numero, repuesto.cantidad - 1)}
                                >
                                  <Minus className="w-4 h-4" />
                                </Button>
                                <span className="w-8 text-center">{repuesto.cantidad}</span>
                                <Button 
                                  variant="outline" 
                                  size="icon"
                                  onClick={() => actualizarCantidadRepuesto(repuesto.numero, repuesto.cantidad + 1)}
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => actualizarCantidadRepuesto(repuesto.numero, 0)}
                              >
                                Eliminar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No hay repuestos seleccionados</p>
                      <p className="text-sm">Haz clic en los repuestos de la derecha para agregarlos</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Columna derecha - 25% del ancho (1/4) */}
            <div className="col-span-1">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Repuestos Disponibles</CardTitle>
                  <CardDescription>
                    {productoSeleccionado ? 
                      `Para ${productoSeleccionado.descripcion}` : 
                      'Selecciona un producto primero'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {productoSeleccionado ? (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {repuestos
                        .filter(repuesto => repuesto.codigoProducto === productoSeleccionado.codigo)
                        .map((repuesto) => (
                          <div 
                            key={repuesto.numero}
                            className="p-3 border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                            onClick={() => agregarRepuesto(repuesto)}
                          >
                            <div className="flex items-center gap-2">
                              <img 
                                src={repuesto.urlFoto} 
                                alt={repuesto.descripcion}
                                className="w-10 h-10 object-cover rounded"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{repuesto.descripcion}</p>
                                <p className="text-xs text-muted-foreground">
                                  {repuesto.codigo}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {repuesto.clave}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      }
                      {repuestos.filter(repuesto => repuesto.codigoProducto === productoSeleccionado.codigo).length === 0 && (
                        <div className="text-center py-4 text-muted-foreground">
                          <p className="text-sm">No hay repuestos disponibles para este producto</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">Selecciona un producto en la pestaña "General" para ver los repuestos disponibles</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="documentacion" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Documentación</CardTitle>
              <CardDescription>Comentarios adicionales y notas del técnico</CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="comentarios">Comentarios</Label>
                <Textarea
                  id="comentarios"
                  value={comentarios}
                  onChange={(e) => setComentarios(e.target.value)}
                  placeholder="Agrega comentarios adicionales, observaciones o notas importantes"
                  rows={8}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-4 mt-6">
        <Button variant="outline" onClick={() => navigate("/incidentes")}>
          Cancelar
        </Button>
        <Button onClick={guardarIncidente}>
          Crear Incidente
        </Button>
      </div>
    </div>
  );
}