import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, X, ArrowRight, Link as LinkIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Repuesto {
  codigo: string;
  descripcion: string;
  codigo_padre: string | null;
  es_codigo_padre: boolean;
  prefijo_clasificacion: string | null;
}

interface Relacion {
  id: number;
  Padre: number | null;
  Código: string | null;
  Descripción: string | null;
}

interface Producto {
  codigo: string;
  descripcion: string;
}

export default function GestionRelacionesRepuestos() {
  const { toast } = useToast();
  
  // Tab 1: Padre-Hijo
  const [busquedaPadre, setBusquedaPadre] = useState("");
  const [repuestoPadre, setRepuestoPadre] = useState<Repuesto | null>(null);
  const [hijos, setHijos] = useState<Repuesto[]>([]);
  const [nuevoHijo, setNuevoHijo] = useState("");
  
  // Tab 2: Equivalencias
  const [codigoPrincipal, setCodigoPrincipal] = useState("");
  const [codigoEquivalente, setCodigoEquivalente] = useState("");
  const [prioridad, setPrioridad] = useState("1");
  const [bidireccional, setBidireccional] = useState(true);
  const [equivalencias, setEquivalencias] = useState<Relacion[]>([]);
  const [loadingEquivalencias, setLoadingEquivalencias] = useState(false);
  
  // Tab 3: Productos
  const [repuestoSeleccionado, setRepuestoSeleccionado] = useState("");
  const [productoSeleccionado, setProductoSeleccionado] = useState("");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [compatibilidades, setCompatibilidades] = useState<any[]>([]);
  const [loadingCompatibilidades, setLoadingCompatibilidades] = useState(false);

  useEffect(() => {
    cargarEquivalencias();
  }, []);

  const buscarRepuestoPadre = async () => {
    if (!busquedaPadre.trim()) return;
    
    const { data, error } = await supabase
      .from('repuestos')
      .select('*')
      .eq('codigo', busquedaPadre.trim())
      .maybeSingle();
    
    if (error) {
      toast({ title: "Error", description: "Error al buscar repuesto", variant: "destructive" });
      return;
    }
    
    if (!data) {
      toast({ title: "No encontrado", description: "Repuesto no existe", variant: "destructive" });
      return;
    }
    
    setRepuestoPadre(data);
    await cargarHijos(data.codigo);
  };

  const cargarHijos = async (codigoPadre: string) => {
    const { data, error } = await supabase
      .from('repuestos')
      .select('*')
      .eq('codigo_padre', codigoPadre);
    
    if (!error && data) {
      setHijos(data);
    }
  };

  const agregarHijo = async () => {
    if (!repuestoPadre || !nuevoHijo.trim()) return;
    
    // Verificar que el hijo existe
    const { data: hijoData, error: hijoError } = await supabase
      .from('repuestos')
      .select('*')
      .eq('codigo', nuevoHijo.trim())
      .maybeSingle();
    
    if (hijoError || !hijoData) {
      toast({ title: "Error", description: "El código hijo no existe", variant: "destructive" });
      return;
    }
    
    // Actualizar el hijo
    const { error } = await supabase
      .from('repuestos')
      .update({ 
        codigo_padre: repuestoPadre.codigo 
      })
      .eq('codigo', nuevoHijo.trim());
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    
    // Marcar el padre como es_codigo_padre
    await supabase
      .from('repuestos')
      .update({ es_codigo_padre: true })
      .eq('codigo', repuestoPadre.codigo);
    
    toast({ title: "Éxito", description: "Relación padre-hijo creada" });
    await cargarHijos(repuestoPadre.codigo);
    setNuevoHijo("");
  };

  const quitarHijo = async (codigoHijo: string) => {
    const { error } = await supabase
      .from('repuestos')
      .update({ codigo_padre: null })
      .eq('codigo', codigoHijo);
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    
    toast({ title: "Éxito", description: "Relación eliminada" });
    if (repuestoPadre) {
      await cargarHijos(repuestoPadre.codigo);
    }
  };

  const crearEquivalencia = async () => {
    if (!codigoPrincipal.trim() || !codigoEquivalente.trim()) return;
    
    // Obtener descripción del código padre
    const { data: repuestoData } = await supabase
      .from('repuestos')
      .select('descripcion')
      .eq('codigo', codigoPrincipal.trim())
      .maybeSingle();
    
    // Get max ID
    const { data: maxIdData } = await supabase
      .from('repuestos_relaciones')
      .select('id')
      .order('id', { ascending: false })
      .limit(1);
    
    const nextId = (maxIdData?.[0]?.id || 0) + 1;
    
    const { error } = await supabase
      .from('repuestos_relaciones')
      .insert({
        id: nextId,
        Código: codigoEquivalente.trim(),
        Descripción: repuestoData?.descripcion || null,
        Padre: null // Will need parent ID lookup if relating
      });
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    
    toast({ title: "Éxito", description: "Relación creada" });
    setCodigoPrincipal("");
    setCodigoEquivalente("");
    await cargarEquivalencias();
  };

  const cargarEquivalencias = async () => {
    setLoadingEquivalencias(true);
    const { data, error } = await supabase
      .from('repuestos_relaciones')
      .select('*')
      .order('Padre');
    
    if (!error && data) {
      setEquivalencias(data);
    }
    setLoadingEquivalencias(false);
  };

  const eliminarRelacion = async (id: number) => {
    const { error } = await supabase
      .from('repuestos_relaciones')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    
    toast({ title: "Éxito", description: "Relación eliminada" });
    await cargarEquivalencias();
  };

  const asociarProducto = async () => {
    if (!repuestoSeleccionado.trim() || !productoSeleccionado.trim()) return;
    
    const { error } = await supabase
      .from('repuestos_productos')
      .insert({
        codigo_repuesto: repuestoSeleccionado.trim(),
        codigo_producto: productoSeleccionado.trim(),
        es_original: true
      });
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    
    toast({ title: "Éxito", description: "Compatibilidad creada" });
    setRepuestoSeleccionado("");
    setProductoSeleccionado("");
    await cargarCompatibilidades();
  };

  const cargarProductos = async () => {
    const { data, error } = await supabase
      .from('productos')
      .select('codigo, descripcion')
      .order('descripcion')
      .limit(100);
    
    if (!error && data) {
      setProductos(data);
    }
  };

  const cargarCompatibilidades = async () => {
    setLoadingCompatibilidades(true);
    const { data, error } = await supabase
      .from('repuestos_productos')
      .select(`
        id,
        codigo_repuesto,
        codigo_producto,
        repuestos(descripcion),
        productos(descripcion)
      `)
      .order('codigo_repuesto');
    
    if (!error && data) {
      setCompatibilidades(data);
    }
    setLoadingCompatibilidades(false);
  };

  return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Relaciones de Repuestos</h1>
          <p className="text-muted-foreground">
            Administra relaciones padre-hijo, equivalencias y compatibilidad con productos
          </p>
        </div>

        <Tabs defaultValue="padre-hijo" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="padre-hijo">Padre-Hijo</TabsTrigger>
            <TabsTrigger value="equivalencias" onClick={() => cargarEquivalencias()}>
              Equivalencias
            </TabsTrigger>
            <TabsTrigger value="productos" onClick={() => { cargarProductos(); cargarCompatibilidades(); }}>
              Productos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="padre-hijo">
            <Card>
              <CardHeader>
                <CardTitle>Relaciones Padre-Hijo</CardTitle>
                <CardDescription>
                  Asocia códigos hijos a un código padre. Los hijos comparten la ubicación del padre.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label>Buscar código padre</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Ej: 1-ABC-123"
                        value={busquedaPadre}
                        onChange={(e) => setBusquedaPadre(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && buscarRepuestoPadre()}
                      />
                      <Button onClick={buscarRepuestoPadre}>
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {repuestoPadre && (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                    <div>
                      <Label>Código Padre</Label>
                      <div className="text-lg font-semibold">{repuestoPadre.codigo}</div>
                    </div>
                    <div>
                      <Label>Descripción</Label>
                      <div>{repuestoPadre.descripcion}</div>
                    </div>
                    {repuestoPadre.prefijo_clasificacion && (
                      <Badge variant="outline">
                        Código {repuestoPadre.prefijo_clasificacion}
                      </Badge>
                    )}

                    <div className="space-y-2">
                      <Label>Hijos asociados ({hijos.length})</Label>
                      {hijos.length > 0 ? (
                        <div className="space-y-2">
                          {hijos.map((hijo) => (
                            <div key={hijo.codigo} className="flex items-center justify-between p-2 border rounded">
                              <div>
                                <div className="font-medium">{hijo.codigo}</div>
                                <div className="text-sm text-muted-foreground">{hijo.descripcion}</div>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => quitarHijo(hijo.codigo)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No hay hijos asociados</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Agregar nuevo hijo</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Código del hijo"
                          value={nuevoHijo}
                          onChange={(e) => setNuevoHijo(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && agregarHijo()}
                        />
                        <Button onClick={agregarHijo}>
                          <Plus className="h-4 w-4 mr-1" />
                          Agregar
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="equivalencias">
            <Card>
              <CardHeader>
                <CardTitle>Equivalencias de Repuestos</CardTitle>
                <CardDescription>
                  Define repuestos equivalentes o sustituibles entre sí
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Código Principal</Label>
                    <Input
                      placeholder="Código"
                      value={codigoPrincipal}
                      onChange={(e) => setCodigoPrincipal(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Código Equivalente</Label>
                    <Input
                      placeholder="Código"
                      value={codigoEquivalente}
                      onChange={(e) => setCodigoEquivalente(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Prioridad</Label>
                    <Select value={prioridad} onValueChange={setPrioridad}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 (Primera opción)</SelectItem>
                        <SelectItem value="2">2 (Segunda opción)</SelectItem>
                        <SelectItem value="3">3 (Tercera opción)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={crearEquivalencia} className="w-full">
                      <LinkIcon className="h-4 w-4 mr-1" />
                      Crear Equivalencia
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-lg">Equivalencias Activas</Label>
                  {loadingEquivalencias ? (
                    <p className="text-center py-8 text-muted-foreground">Cargando...</p>
                  ) : equivalencias.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">No hay equivalencias registradas</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código Padre</TableHead>
                          <TableHead></TableHead>
                          <TableHead>Código Hijo</TableHead>
                          <TableHead>Descripción</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {equivalencias.map((eq) => (
                          <TableRow key={eq.id}>
                            <TableCell className="font-mono">{eq.Padre || '-'}</TableCell>
                            <TableCell>
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </TableCell>
                            <TableCell className="font-mono">{eq.Código}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {eq.Descripción || '-'}
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => eliminarRelacion(eq.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="productos">
            <Card>
              <CardHeader>
                <CardTitle>Compatibilidad con Productos</CardTitle>
                <CardDescription>
                  Asocia repuestos con los productos/máquinas compatibles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Código Repuesto</Label>
                    <Input
                      placeholder="Código"
                      value={repuestoSeleccionado}
                      onChange={(e) => setRepuestoSeleccionado(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Código Producto</Label>
                    <Input
                      placeholder="Código"
                      value={productoSeleccionado}
                      onChange={(e) => setProductoSeleccionado(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={asociarProducto} className="w-full">
                      <Plus className="h-4 w-4 mr-1" />
                      Asociar
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-lg">Compatibilidades</Label>
                  {loadingCompatibilidades ? (
                    <p className="text-center py-8 text-muted-foreground">Cargando...</p>
                  ) : compatibilidades.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">No hay compatibilidades registradas</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Repuesto</TableHead>
                          <TableHead>Producto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {compatibilidades.map((comp: any) => (
                          <TableRow key={comp.id}>
                            <TableCell>
                              <div className="font-mono">{comp.codigo_repuesto}</div>
                              <div className="text-sm text-muted-foreground">
                                {comp.repuestos?.descripcion}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-mono">{comp.codigo_producto}</div>
                              <div className="text-sm text-muted-foreground">
                                {comp.productos?.descripcion}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
