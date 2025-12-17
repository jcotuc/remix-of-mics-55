import { useState, useEffect, useRef } from "react";
import { Plus, Search, Edit, AlertTriangle, Save, X, Upload, FileSpreadsheet, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface ProductoExtended {
  codigo: string;
  clave: string;
  descripcion: string;
  descontinuado: boolean;
  urlFoto: string;
  familia_padre_id: number | null;
}

interface Familia {
  id: number;
  Categoria: string | null;
  Padre: number | null;
}

interface NewProducto {
  codigo: string;
  clave: string;
  descripcion: string;
  url_foto: string;
  descontinuado: boolean;
}

interface ImportProducto {
  codigo: string;
  clave: string;
  descripcion: string;
  url_foto?: string;
  descontinuado: boolean;
  familia_nombre?: string;
  familia_padre_id?: number;
  isValid: boolean;
  errorMsg?: string;
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

  // Estados para crear nuevo producto
  const [isCreating, setIsCreating] = useState(false);
  const [newProducto, setNewProducto] = useState<NewProducto>({
    codigo: "",
    clave: "",
    descripcion: "",
    url_foto: "",
    descontinuado: false
  });
  const [createAbuelo, setCreateAbuelo] = useState<string>("");
  const [createPadre, setCreatePadre] = useState<string>("");
  const [creating, setCreating] = useState(false);

  // Estados para importar
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importData, setImportData] = useState<ImportProducto[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Familias "abuelo" (top-level, sin padre)
  const familiasAbuelo = familias.filter(f => f.Padre === null);
  
  // Familias "padre" para edición
  const familiasPadre = familias.filter(f => 
    selectedAbuelo && f.Padre === parseInt(selectedAbuelo)
  );

  // Familias "padre" para creación
  const familiasPadreCreate = familias.filter(f => 
    createAbuelo && f.Padre === parseInt(createAbuelo)
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

  const getAbueloName = (familiaPadreId: number | null) => {
    if (!familiaPadreId) return "-";
    const familia = familias.find(f => f.id === familiaPadreId);
    if (!familia?.Padre) return "-";
    return getFamiliaName(familia.Padre);
  };

  const handleEditClick = (producto: ProductoExtended) => {
    setEditingProducto(producto);
    const familiaPadre = familias.find(f => f.id === producto.familia_padre_id);
    setSelectedAbuelo(familiaPadre?.Padre?.toString() || "");
    setSelectedPadre(producto.familia_padre_id?.toString() || "");
  };

  const handleSave = async () => {
    if (!editingProducto) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('productos')
        .update({
          familia_padre_id: selectedPadre ? parseInt(selectedPadre) : null
        })
        .eq('codigo', editingProducto.codigo);

      if (error) throw error;

      setProductosList(prev => prev.map(p => 
        p.codigo === editingProducto.codigo 
          ? { ...p, familia_padre_id: selectedPadre ? parseInt(selectedPadre) : null }
          : p
      ));

      toast.success("Familia actualizada correctamente");
      setEditingProducto(null);
    } catch (error) {
      console.error('Error:', error);
      toast.error("Error al actualizar familia");
    } finally {
      setSaving(false);
    }
  };

  const resetCreateForm = () => {
    setNewProducto({
      codigo: "",
      clave: "",
      descripcion: "",
      url_foto: "",
      descontinuado: false
    });
    setCreateAbuelo("");
    setCreatePadre("");
  };

  const handleOpenCreate = () => {
    resetCreateForm();
    setIsCreating(true);
  };

  const handleCreate = async () => {
    // Validar campos requeridos
    if (!newProducto.codigo.trim()) {
      toast.error("El código es requerido");
      return;
    }
    if (!newProducto.clave.trim()) {
      toast.error("La clave es requerida");
      return;
    }
    if (!newProducto.descripcion.trim()) {
      toast.error("La descripción es requerida");
      return;
    }

    setCreating(true);

    try {
      // Verificar código único
      const { data: existing } = await supabase
        .from('productos')
        .select('codigo')
        .eq('codigo', newProducto.codigo.trim())
        .maybeSingle();

      if (existing) {
        toast.error("Ya existe un producto con este código");
        setCreating(false);
        return;
      }

      // Insertar producto
      const { error } = await supabase
        .from('productos')
        .insert({
          codigo: newProducto.codigo.trim(),
          clave: newProducto.clave.trim(),
          descripcion: newProducto.descripcion.trim(),
          url_foto: newProducto.url_foto.trim() || null,
          descontinuado: newProducto.descontinuado,
          familia_padre_id: createPadre ? parseInt(createPadre) : null
        });

      if (error) throw error;

      // Agregar a lista local
      setProductosList(prev => [...prev, {
        codigo: newProducto.codigo.trim(),
        clave: newProducto.clave.trim(),
        descripcion: newProducto.descripcion.trim(),
        urlFoto: newProducto.url_foto.trim() || "/placeholder.svg",
        descontinuado: newProducto.descontinuado,
        familia_padre_id: createPadre ? parseInt(createPadre) : null
      }]);

      toast.success("Producto creado correctamente");
      setIsCreating(false);
      resetCreateForm();
    } catch (error) {
      console.error('Error:', error);
      toast.error("Error al crear producto");
    } finally {
      setCreating(false);
    }
  };

  // Función para manejar carga de archivo Excel
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

      if (jsonData.length === 0) {
        toast.error("El archivo está vacío");
        return;
      }

      // Obtener códigos existentes
      const existingCodes = new Set(productosList.map(p => p.codigo.toLowerCase()));
      const seenCodes = new Set<string>();

      // Procesar cada fila
      const processedData: ImportProducto[] = jsonData.map((row) => {
        // Buscar columnas con nombres flexibles
        const codigo = String(row['Codigo'] || row['codigo'] || row['CODIGO'] || row['Código'] || '').trim();
        const clave = String(row['Clave'] || row['clave'] || row['CLAVE'] || codigo || '').trim();
        const descripcion = String(row['Descripcion'] || row['descripcion'] || row['DESCRIPCION'] || row['Descripción'] || '').trim();
        const urlFoto = String(row['URL_Foto'] || row['url_foto'] || row['URL'] || row['Foto'] || '').trim();
        const descontinuadoRaw = row['Descontinuado'] || row['descontinuado'] || row['DESCONTINUADO'] || false;
        const familiaNombre = String(row['Categoria'] || row['categoria'] || row['Familia'] || row['familia'] || row['Subcategoria'] || '').trim();

        // Convertir descontinuado a boolean
        const descontinuado = descontinuadoRaw === true || 
          descontinuadoRaw === 'true' || 
          descontinuadoRaw === 'TRUE' || 
          descontinuadoRaw === '1' || 
          descontinuadoRaw === 1;

        // Validaciones
        const errors: string[] = [];
        if (!codigo) errors.push("Código requerido");
        if (!descripcion) errors.push("Descripción requerida");
        if (existingCodes.has(codigo.toLowerCase())) errors.push("Código ya existe");
        if (seenCodes.has(codigo.toLowerCase())) errors.push("Código duplicado en archivo");

        seenCodes.add(codigo.toLowerCase());

        // Buscar familia por nombre (case-insensitive)
        let familiaId: number | undefined;
        if (familiaNombre) {
          const familiaMatch = familias.find(f => 
            f.Categoria?.toLowerCase() === familiaNombre.toLowerCase()
          );
          familiaId = familiaMatch?.id;
        }

        return {
          codigo,
          clave: clave || codigo,
          descripcion,
          url_foto: urlFoto || undefined,
          descontinuado,
          familia_nombre: familiaNombre || undefined,
          familia_padre_id: familiaId,
          isValid: errors.length === 0,
          errorMsg: errors.length > 0 ? errors.join(", ") : undefined
        };
      });

      setImportData(processedData);
      setShowImportDialog(true);
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error("Error al leer el archivo");
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Función para importar productos válidos
  const handleImport = async () => {
    const validProducts = importData.filter(p => p.isValid);
    if (validProducts.length === 0) {
      toast.error("No hay productos válidos para importar");
      return;
    }

    setImporting(true);
    try {
      // Insertar en lotes de 100
      const batchSize = 100;
      let imported = 0;

      for (let i = 0; i < validProducts.length; i += batchSize) {
        const batch = validProducts.slice(i, i + batchSize);
        const insertData = batch.map(p => ({
          codigo: p.codigo,
          clave: p.clave,
          descripcion: p.descripcion,
          url_foto: p.url_foto || null,
          descontinuado: p.descontinuado,
          familia_padre_id: p.familia_padre_id || null
        }));

        const { error } = await supabase
          .from('productos')
          .upsert(insertData, { onConflict: 'codigo' });

        if (error) throw error;
        imported += batch.length;
      }

      toast.success(`${imported} productos importados correctamente`);
      setShowImportDialog(false);
      setImportData([]);
      fetchData(); // Recargar lista
    } catch (error) {
      console.error('Error importing:', error);
      toast.error("Error al importar productos");
    } finally {
      setImporting(false);
    }
  };

  const validCount = importData.filter(p => p.isValid).length;
  const invalidCount = importData.filter(p => !p.isValid).length;

  const filteredProductos = productosList.filter(producto =>
    producto.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    producto.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    producto.clave.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Catálogo de Productos</h1>
          <p className="text-muted-foreground">
            Gestiona el inventario de herramientas eléctricas
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Importar Excel
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />
          <Button onClick={handleOpenCreate} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Producto
          </Button>
        </div>
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
                  <TableHead>Categoría</TableHead>
                  <TableHead>Subcategoría</TableHead>
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
                        {getAbueloName(producto.familia_padre_id)}
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

      {/* Dialog para editar familia */}
      <Dialog open={!!editingProducto} onOpenChange={() => setEditingProducto(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Familia del Producto</DialogTitle>
          </DialogHeader>
          
          {editingProducto && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">{editingProducto.codigo}</p>
                <p className="text-sm text-muted-foreground">{editingProducto.descripcion}</p>
              </div>

              <div className="space-y-2">
                <Label>Categoría General</Label>
                <Select value={selectedAbuelo} onValueChange={(val) => {
                  setSelectedAbuelo(val);
                  setSelectedPadre("");
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría..." />
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
                <Label>Subcategoría (se guarda en producto)</Label>
                <Select 
                  value={selectedPadre} 
                  onValueChange={setSelectedPadre}
                  disabled={!selectedAbuelo}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedAbuelo ? "Seleccionar subcategoría..." : "Primero selecciona categoría"} />
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
                  <p className="text-xs text-muted-foreground">No hay subcategorías para esta categoría</p>
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

      {/* Dialog para crear producto */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo Producto</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código *</Label>
                <Input
                  id="codigo"
                  value={newProducto.codigo}
                  onChange={(e) => setNewProducto(prev => ({ ...prev, codigo: e.target.value }))}
                  placeholder="Ej: 12345"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clave">Clave *</Label>
                <Input
                  id="clave"
                  value={newProducto.clave}
                  onChange={(e) => setNewProducto(prev => ({ ...prev, clave: e.target.value }))}
                  placeholder="Ej: COMP-001"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción *</Label>
              <Input
                id="descripcion"
                value={newProducto.descripcion}
                onChange={(e) => setNewProducto(prev => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Descripción del producto"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url_foto">URL de Foto (opcional)</Label>
              <Input
                id="url_foto"
                value={newProducto.url_foto}
                onChange={(e) => setNewProducto(prev => ({ ...prev, url_foto: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoría General</Label>
                <Select value={createAbuelo} onValueChange={(val) => {
                  setCreateAbuelo(val);
                  setCreatePadre("");
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
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
                <Label>Subcategoría</Label>
                <Select 
                  value={createPadre} 
                  onValueChange={setCreatePadre}
                  disabled={!createAbuelo}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={createAbuelo ? "Seleccionar..." : "Primero categoría"} />
                  </SelectTrigger>
                  <SelectContent>
                    {familiasPadreCreate.map(f => (
                      <SelectItem key={f.id} value={f.id.toString()}>
                        {f.Categoria}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="descontinuado"
                checked={newProducto.descontinuado}
                onCheckedChange={(checked) => setNewProducto(prev => ({ ...prev, descontinuado: checked }))}
              />
              <Label htmlFor="descontinuado">Marcar como descontinuado</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              <Save className="h-4 w-4 mr-2" />
              {creating ? "Creando..." : "Crear Producto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para importar productos */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Importar Productos desde Excel
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Resumen */}
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-green-600 font-medium">{validCount} válidos</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <XCircle className="h-4 w-4 text-destructive" />
                <span className="text-destructive font-medium">{invalidCount} con errores</span>
              </div>
            </div>

            {/* Tabla de preview */}
            <ScrollArea className="h-[400px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Estado</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Clave</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Familia</TableHead>
                    <TableHead>Descontinuado</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importData.map((item, idx) => (
                    <TableRow key={idx} className={!item.isValid ? "bg-destructive/10" : ""}>
                      <TableCell>
                        {item.isValid ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{item.codigo || "-"}</TableCell>
                      <TableCell>{item.clave || "-"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{item.descripcion || "-"}</TableCell>
                      <TableCell>
                        {item.familia_padre_id ? (
                          <Badge variant="secondary">{item.familia_nombre}</Badge>
                        ) : item.familia_nombre ? (
                          <Badge variant="outline" className="text-amber-600">{item.familia_nombre} (no encontrada)</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.descontinuado ? (
                          <Badge variant="destructive">Sí</Badge>
                        ) : (
                          <Badge variant="outline">No</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-destructive text-sm">{item.errorMsg || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {/* Ayuda de formato */}
            <div className="text-xs text-muted-foreground p-3 bg-muted rounded-md">
              <p className="font-medium mb-1">Formato esperado del archivo:</p>
              <p>Columnas: Codigo*, Clave, Descripcion*, URL_Foto, Descontinuado, Categoria/Familia</p>
              <p>* Campos requeridos. La columna Categoria/Familia debe coincidir con una subcategoría existente.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={importing || validCount === 0}
            >
              {importing ? "Importando..." : `Importar ${validCount} productos`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}