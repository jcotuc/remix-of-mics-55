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
import { productos, repuestos } from "@/data/mockData";
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
  const [descripcionFalla, setDescripcionFalla] = useState("");
  const [archivos, setArchivos] = useState<File[]>([]);
  
  // Tab 2: Diagnóstico
  const [diagnostico, setDiagnostico] = useState("");
  const [garantia, setGarantia] = useState<"si" | "no" | "">("");
  
  // Tab 3: Repuestos
  const [repuestosSeleccionados, setRepuestosSeleccionados] = useState<RepuestoSeleccionado[]>([]);
  const [busquedaRepuesto, setBusquedaRepuesto] = useState("");
  
  // Tab 4: Documentación
  const [comentarios, setComentarios] = useState("");

  // Búsqueda automática de producto cuando se escribe
  useEffect(() => {
    if (codigoProducto.length >= 3) {
      const producto = productos.find(p => 
        p.codigo.toLowerCase().includes(codigoProducto.toLowerCase()) || 
        p.clave.toLowerCase().includes(codigoProducto.toLowerCase())
      );
      setProductoSeleccionado(producto || null);
    } else {
      setProductoSeleccionado(null);
    }
  }, [codigoProducto]);

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
          <Card>
            <CardHeader>
              <CardTitle>Repuestos Requeridos</CardTitle>
              <CardDescription>Selecciona los repuestos necesarios para la reparación</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="busquedaRepuesto">Buscar Repuesto</Label>
                <Input
                  id="busquedaRepuesto"
                  value={busquedaRepuesto}
                  onChange={(e) => setBusquedaRepuesto(e.target.value)}
                  placeholder="Buscar por código, clave o descripción"
                />
              </div>

              {busquedaRepuesto && (
                <div className="border rounded-lg max-h-40 overflow-y-auto">
                  {repuestosFiltrados.map((repuesto) => (
                    <div 
                      key={repuesto.numero}
                      className="p-2 hover:bg-muted cursor-pointer border-b last:border-b-0"
                      onClick={() => agregarRepuesto(repuesto)}
                    >
                      <div className="flex items-center gap-2">
                        <img 
                          src={repuesto.urlFoto} 
                          alt={repuesto.descripcion}
                          className="w-8 h-8 object-cover rounded"
                        />
                        <div>
                          <p className="text-sm font-medium">{repuesto.descripcion}</p>
                          <p className="text-xs text-muted-foreground">
                            {repuesto.codigo} | {repuesto.clave}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {repuestosSeleccionados.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Repuestos Seleccionados</h3>
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
                </div>
              )}
            </CardContent>
          </Card>
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