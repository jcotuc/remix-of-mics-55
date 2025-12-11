import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, AlertTriangle, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProductoExtended {
  codigo: string;
  clave: string;
  descripcion: string;
  descontinuado: boolean;
  urlFoto: string;
  familia_abuelo_id: number | null;
  familia_padre_id: number | null;
}

interface Familia {
  id: number;
  Categoria: string | null;
  Padre: number | null;
}

export default function Productos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [productosList, setProductosList] = useState<ProductoExtended[]>([]);
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProducto, setEditingProducto] = useState<ProductoExtended | null>(null);
  const [selectedAbuelo, setSelectedAbuelo] = useState<string>("");
  const [selectedPadre, setSelectedPadre] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Familias "abuelo" (top-level, sin padre)
  const familiasAbuelo = familias.filter(f => f.Padre === null);
  
  // Familias "padre" (subcategorías del abuelo seleccionado)
  const familiasPadre = familias.filter(f => 
    selectedAbuelo && f.Padre === parseInt(selectedAbuelo)
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productosRes, familiasRes] = await Promise.all([
        supabase.from('productos').select('*').order('codigo'),
        supabase.from('CDS_Familias').select('id, Categoria, Padre').order('Categoria')
      ]);
      
      if (productosRes.error) throw productosRes.error;
      if (familiasRes.error) throw familiasRes.error;

      const transformedData: ProductoExtended[] = (productosRes.data || []).map(item => ({
        codigo: item.codigo,
        clave: item.clave,
        descripcion: item.descripcion,
        descontinuado: item.descontinuado,
        urlFoto: item.url_foto || "/placeholder.svg",
        familia_abuelo_id: item.familia_abuelo_id,
        familia_padre_id: item.familia_padre_id
      }));

      setProductosList(transformedData);
      setFamilias(familiasRes.data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const getFamiliaName = (id: number | null) => {
    if (!id) return "-";
    return familias.find(f => f.id === id)?.Categoria || "-";
  };

  const handleEditClick = (producto: ProductoExtended) => {
    setEditingProducto(producto);
    setSelectedAbuelo(producto.familia_abuelo_id?.toString() || "");
    setSelectedPadre(producto.familia_padre_id?.toString() || "");
  };

  const handleSave = async () => {
    if (!editingProducto) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('productos')
        .update({
          familia_abuelo_id: selectedAbuelo ? parseInt(selectedAbuelo) : null,
          familia_padre_id: selectedPadre ? parseInt(selectedPadre) : null
        })
        .eq('codigo', editingProducto.codigo);

      if (error) throw error;

      // Actualizar lista local
      setProductosList(prev => prev.map(p => 
        p.codigo === editingProducto.codigo 
          ? { ...p, familia_abuelo_id: selectedAbuelo ? parseInt(selectedAbuelo) : null, familia_padre_id: selectedPadre ? parseInt(selectedPadre) : null }
          : p
      ));

      toast.success("Familias actualizadas correctamente");
      setEditingProducto(null);
    } catch (error) {
      console.error('Error:', error);
      toast.error("Error al actualizar familias");
    } finally {
      setSaving(false);
    }
  };

  const filteredProductos = productosList.filter(producto =>
    producto.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    producto.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    producto.clave.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Catálogo de Productos</h1>
          <p className="text-muted-foreground">
            Gestiona el inventario de herramientas eléctricas
          </p>
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Producto
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Productos</CardTitle>
          <CardDescription>
            {filteredProductos.length} productos en catálogo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por descripción, código o clave..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Foto</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Clave</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Familia (Abuelo)</TableHead>
                  <TableHead>Subfamilia (Padre)</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProductos.map((producto) => (
                  <TableRow key={producto.codigo}>
                    <TableCell>
                      <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                        <img 
                          src={producto.urlFoto} 
                          alt={producto.descripcion}
                          className="w-10 h-10 object-cover rounded"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.svg";
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{producto.codigo}</TableCell>
                    <TableCell>{producto.clave}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{producto.descripcion}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="whitespace-nowrap">
                        {getFamiliaName(producto.familia_abuelo_id)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="whitespace-nowrap">
                        {getFamiliaName(producto.familia_padre_id)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {producto.descontinuado ? (
                        <Badge variant="destructive">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Descontinuado
                        </Badge>
                      ) : (
                        <Badge className="bg-green-600 text-white">
                          Activo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleEditClick(producto)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog para editar familias */}
      <Dialog open={!!editingProducto} onOpenChange={() => setEditingProducto(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Familias del Producto</DialogTitle>
          </DialogHeader>
          
          {editingProducto && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">{editingProducto.codigo}</p>
                <p className="text-sm text-muted-foreground">{editingProducto.descripcion}</p>
              </div>

              <div className="space-y-2">
                <Label>Familia (Abuelo) - Categoría General</Label>
                <Select value={selectedAbuelo} onValueChange={(val) => {
                  setSelectedAbuelo(val);
                  setSelectedPadre(""); // Reset padre when abuelo changes
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar familia..." />
                  </SelectTrigger>
                  <SelectContent>
                    {familiasAbuelo.map(f => (
                      <SelectItem key={f.id} value={f.id.toString()}>
                        {f.Categoria}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Subfamilia (Padre) - Subcategoría</Label>
                <Select 
                  value={selectedPadre} 
                  onValueChange={setSelectedPadre}
                  disabled={!selectedAbuelo}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedAbuelo ? "Seleccionar subfamilia..." : "Primero selecciona familia"} />
                  </SelectTrigger>
                  <SelectContent>
                    {familiasPadre.map(f => (
                      <SelectItem key={f.id} value={f.id.toString()}>
                        {f.Categoria}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedAbuelo && familiasPadre.length === 0 && (
                  <p className="text-xs text-muted-foreground">No hay subcategorías para esta familia</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProducto(null)}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}