import { useState, useEffect, useRef } from "react";
import { Plus, Search, Edit, AlertTriangle, Save, X, Upload, FileSpreadsheet, CheckCircle, XCircle, SkipForward } from "lucide-react";
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
  asignacion_info?: string;
  isValid: boolean;
  errorMsg?: string;
  skipped?: boolean;
  skipReason?: string;
}

// Mapeo de palabras clave por familia abuelo → familia padre (subcategoría)
// IMPORTANTE: Las reglas más específicas van PRIMERO en cada array
const SUBCATEGORIA_KEYWORDS: Record<number, { keywords: string[], padreId: number, nombre: string }[]> = {
  // 2 tiempos (27)
  27: [
    { keywords: ['motosierra'], padreId: 88, nombre: 'Motosierra' },
    { keywords: ['desbrozadora', 'desmalezadora'], padreId: 87, nombre: 'Desbrozadora' },
    { keywords: ['cortasetos', 'corta setos'], padreId: 91, nombre: 'Cortasetos' },
    { keywords: ['sopladora'], padreId: 89, nombre: 'Sopladora' },
  ],
  // 4 tiempos (23)
  23: [
    { keywords: ['generador'], padreId: 83, nombre: 'Generadores' },
    { keywords: ['podadora'], padreId: 84, nombre: 'Podadoras' },
    { keywords: ['fumigadora'], padreId: 85, nombre: 'Fumigadoras' },
    { keywords: ['revolvedora'], padreId: 86, nombre: 'Revolvedora' },
  ],
  // Bomba (33)
  33: [
    { keywords: ['motobomba'], padreId: 99, nombre: 'Motobombas' },
    { keywords: ['sumergible'], padreId: 92, nombre: 'Sumergible' },
    { keywords: ['periférica', 'periferica'], padreId: 98, nombre: 'Periférica' },
    { keywords: ['centrifuga', 'centrífuga'], padreId: 93, nombre: 'Centrífuga' },
    { keywords: ['hidroneumática', 'hidroneumatica'], padreId: 97, nombre: 'Hidroneumática' },
    { keywords: ['presurizada'], padreId: 96, nombre: 'Presurizada' },
    { keywords: ['bala'], padreId: 94, nombre: 'Bala' },
  ],
  // Compresor (1)
  1: [
    { keywords: ['libre de aceite', 'oil free'], padreId: 63, nombre: 'Libre de aceite' },
    { keywords: ['banda', '120l', '240l', '120 l', '240 l'], padreId: 62, nombre: 'Lubricado de banda' },
    { keywords: ['lubricado'], padreId: 61, nombre: 'Lubricado' },
  ],
  // Eléctrica (4) - REGLAS ESPECÍFICAS PRIMERO
  4: [
    // ⚡ REGLA ESPECÍFICA: Rotomartillo SDS → Electroneumáticos/Demoledores
    { keywords: ['rotomartillo sds', 'roto martillo sds', 'sds plus', 'sds max', 'sds-plus', 'sds-max'], padreId: 69, nombre: 'Electroneumático/Demoledor' },
    // Rotomartillos normales (después de la regla SDS)
    { keywords: ['rotomartillo', 'roto martillo'], padreId: 64, nombre: 'Rotomartillos' },
    { keywords: ['demoledor', 'electroneumático', 'electroneumatico'], padreId: 69, nombre: 'Electroneumático/Demoledor' },
    { keywords: ['esmeril', 'pulidora', 'amoladora'], padreId: 65, nombre: 'Esmeriladora' },
    { keywords: ['inalámbrico', 'inalambrico', 'batería', 'bateria', '20v', '18v', '12v'], padreId: 79, nombre: 'Inalámbrica' },
    { keywords: ['caladora'], padreId: 70, nombre: 'Caladora' },
    { keywords: ['sierra circular', 'circular'], padreId: 68, nombre: 'Circular' },
    { keywords: ['lijadora orbital', 'orbital'], padreId: 72, nombre: 'Lijadora orbital' },
    { keywords: ['lijadora de banda', 'lijadora banda'], padreId: 71, nombre: 'Lijadora de banda' },
    { keywords: ['taladro'], padreId: 78, nombre: 'Taladro' },
    { keywords: ['router', 'fresadora', 'rebajadora'], padreId: 67, nombre: 'Router' },
    { keywords: ['aspiradora'], padreId: 74, nombre: 'Aspiradora' },
    { keywords: ['cepillo'], padreId: 77, nombre: 'Cepillo' },
    { keywords: ['pistola de calor', 'pistola calor'], padreId: 66, nombre: 'Pistola de calor' },
    { keywords: ['desbrozadora'], padreId: 73, nombre: 'Desbrozadora eléctrica' },
    { keywords: ['cargador'], padreId: 75, nombre: 'Cargador' },
    { keywords: ['inversor'], padreId: 76, nombre: 'Inversor' },
  ],
  // Estacionaria (41)
  41: [
    { keywords: ['inglete'], padreId: 101, nombre: 'Inglete' },
    { keywords: ['cortadora de metales', 'cortadora metales'], padreId: 103, nombre: 'Cortadora de metales' },
    { keywords: ['taladro de piso', 'taladro piso'], padreId: 102, nombre: 'Taladro de piso' },
    { keywords: ['cepillo de piso', 'cepillo piso'], padreId: 100, nombre: 'Cepillo de piso' },
    { keywords: ['polipasto'], padreId: 105, nombre: 'Polipasto' },
    { keywords: ['calentador'], padreId: 106, nombre: 'Calentador' },
    { keywords: ['duplicadora', 'llaves'], padreId: 104, nombre: 'Duplicadora' },
  ],
  // Hidráulica (49)
  49: [
    { keywords: ['gato'], padreId: 107, nombre: 'Gato' },
    { keywords: ['pallet', 'patín', 'patin'], padreId: 110, nombre: 'Pallet/Patín' },
    { keywords: ['porto power', 'portopower'], padreId: 109, nombre: 'Porto Power' },
    { keywords: ['prensa', 'pluma'], padreId: 108, nombre: 'Prensa/Pluma' },
  ],
  // Hidrolavadoras (20)
  20: [
    { keywords: ['4000', '4,000', '4000 psi'], padreId: 81, nombre: 'Hidrolavadora 4000 PSI' },
    { keywords: ['eléctrica', 'electrica'], padreId: 82, nombre: 'Hidrolavadora eléctrica' },
    { keywords: ['2800', '3300', '2,800', '3,300'], padreId: 80, nombre: 'Hidrolavadora 2800-3300' },
  ],
  // Neumática (53)
  53: [
    { keywords: ['engrapadora', 'clavadora'], padreId: 111, nombre: 'Engrapadora/Clavadora' },
    { keywords: ['impacto', 'llave de impacto'], padreId: 112, nombre: 'Llave de impacto' },
    { keywords: ['matraca'], padreId: 115, nombre: 'Matraca' },
    { keywords: ['rectificador'], padreId: 114, nombre: 'Rectificador' },
    { keywords: ['lijadora'], padreId: 117, nombre: 'Lijadora neumática' },
    { keywords: ['remachadora'], padreId: 116, nombre: 'Remachadora' },
    { keywords: ['taladro'], padreId: 113, nombre: 'Taladro neumático' },
  ],
  // Soldadoras (60)
  60: [
    { keywords: ['plasma'], padreId: 120, nombre: 'Plasma' },
    { keywords: ['arco'], padreId: 119, nombre: 'Arco' },
    { keywords: ['mig', 'mag', 'microalambre'], padreId: 121, nombre: 'MIG/MAG' },
  ],
};

// Función para encontrar subcategoría basada en descripción
const findSubcategoriaByDescription = (
  abueloId: number, 
  descripcion: string
): { padreId: number; nombre: string } | undefined => {
  const rules = SUBCATEGORIA_KEYWORDS[abueloId];
  if (!rules) return undefined;
  
  const descLower = descripcion.toLowerCase();
  
  // Buscar en orden (las reglas más específicas están primero)
  for (const rule of rules) {
    if (rule.keywords.some(kw => descLower.includes(kw.toLowerCase()))) {
      return { padreId: rule.padreId, nombre: rule.nombre };
    }
  }
  
  return undefined;
};

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
        // Buscar columnas con nombres flexibles (incluyendo SKU y Producto)
        const codigo = String(
          row['Codigo'] || row['codigo'] || row['CODIGO'] || row['Código'] || 
          row['SKU'] || row['sku'] || row['Sku'] || ''
        ).trim();
        const clave = String(row['Clave'] || row['clave'] || row['CLAVE'] || codigo || '').trim();
        const descripcion = String(
          row['Descripcion'] || row['descripcion'] || row['DESCRIPCION'] || row['Descripción'] || 
          row['Producto'] || row['producto'] || row['PRODUCTO'] || ''
        ).trim();
        const urlFoto = String(row['URL_Foto'] || row['url_foto'] || row['URL'] || row['Foto'] || '').trim();
        const descontinuadoRaw = row['Descontinuado'] || row['descontinuado'] || row['DESCONTINUADO'] || false;
        const familiaNombre = String(
          row['Categoria'] || row['categoria'] || row['CATEGORIA'] || 
          row['Familia'] || row['familia'] || row['FAMILIA'] || 
          row['Subcategoria'] || ''
        ).trim();

        // Convertir descontinuado a boolean
        const descontinuado = descontinuadoRaw === true || 
          descontinuadoRaw === 'true' || 
          descontinuadoRaw === 'TRUE' || 
          descontinuadoRaw === '1' || 
          descontinuadoRaw === 1;

        // Verificar si ya existe en BD (marcar como skipped, no error)
        const yaExisteEnBD = existingCodes.has(codigo.toLowerCase());
        
        // Validaciones reales (errores)
        const errors: string[] = [];
        if (!codigo) errors.push("Código requerido");
        if (!descripcion) errors.push("Descripción requerida");
        if (seenCodes.has(codigo.toLowerCase())) errors.push("Código duplicado en archivo");

        seenCodes.add(codigo.toLowerCase());
        
        // Si ya existe en BD, marcarlo como skipped (no como error)
        if (yaExisteEnBD && errors.length === 0) {
          return {
            codigo,
            clave: clave || codigo,
            descripcion,
            url_foto: urlFoto || undefined,
            descontinuado,
            familia_nombre: familiaNombre || undefined,
            isValid: false,
            skipped: true,
            skipReason: "Ya existe en BD"
          };
        }

        // Buscar familia por nombre (case-insensitive) y auto-asignar subcategoría
        let familiaId: number | undefined;
        let asignacionInfo: string | undefined;
        
        if (familiaNombre) {
          const familiaMatch = familias.find(f => 
            f.Categoria?.toLowerCase() === familiaNombre.toLowerCase()
          );
          
          if (familiaMatch) {
            // Verificar si es un "abuelo" (categoría principal, Padre = NULL)
            if (familiaMatch.Padre === null) {
              // Es una categoría principal → buscar subcategoría por descripción
              const subcategoria = findSubcategoriaByDescription(familiaMatch.id, descripcion);
              
              if (subcategoria) {
                familiaId = subcategoria.padreId;
                asignacionInfo = `✅ Auto: ${familiaMatch.Categoria} → ${subcategoria.nombre}`;
              } else {
                // No se encontró subcategoría, dejar sin asignar
                asignacionInfo = `⚠️ ${familiaMatch.Categoria} (sin subcategoría detectada)`;
              }
            } else {
              // Ya es una subcategoría, asignar directamente
              familiaId = familiaMatch.id;
              asignacionInfo = `📌 Directa: ${familiaMatch.Categoria}`;
            }
          } else {
            asignacionInfo = `❌ "${familiaNombre}" no encontrada`;
          }
        }

        return {
          codigo,
          clave: clave || codigo,
          descripcion,
          url_foto: urlFoto || undefined,
          descontinuado,
          familia_nombre: familiaNombre || undefined,
          familia_padre_id: familiaId,
          asignacion_info: asignacionInfo,
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
  const skippedCount = importData.filter(p => p.skipped).length;
  const errorCount = importData.filter(p => !p.isValid && !p.skipped).length;

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
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-green-600 font-medium">{validCount} para importar</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <SkipForward className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground font-medium">{skippedCount} ya existen (ignorados)</span>
              </div>
              {errorCount > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="text-destructive font-medium">{errorCount} con errores</span>
                </div>
              )}
            </div>

            {/* Tabla de preview */}
            <ScrollArea className="h-[400px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Estado</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Familia (Excel)</TableHead>
                    <TableHead>Asignación Automática</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importData.map((item, idx) => (
                    <TableRow 
                      key={idx} 
                      className={
                        item.skipped ? "bg-muted/50 opacity-60" : 
                        !item.isValid ? "bg-destructive/10" : ""
                      }
                    >
                      <TableCell>
                        {item.isValid ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : item.skipped ? (
                          <SkipForward className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{item.codigo || "-"}</TableCell>
                      <TableCell className="max-w-[250px] truncate" title={item.descripcion}>
                        {item.descripcion || "-"}
                      </TableCell>
                      <TableCell>
                        {item.familia_nombre ? (
                          <Badge variant="outline">{item.familia_nombre}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.asignacion_info ? (
                          <span className={`text-xs ${
                            item.asignacion_info.startsWith('✅') ? 'text-green-600' :
                            item.asignacion_info.startsWith('📌') ? 'text-blue-600' :
                            item.asignacion_info.startsWith('⚠️') ? 'text-amber-600' :
                            'text-destructive'
                          }`}>
                            {item.asignacion_info}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className={item.skipped ? "text-muted-foreground text-sm" : "text-destructive text-sm"}>
                        {item.skipped ? item.skipReason : item.errorMsg || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {/* Ayuda de formato */}
            <div className="text-xs text-muted-foreground p-3 bg-muted rounded-md space-y-1">
              <p className="font-medium">Formato esperado del archivo:</p>
              <p>Columnas: <span className="font-mono">SKU/Codigo*</span>, <span className="font-mono">Producto/Descripcion*</span>, <span className="font-mono">Familia</span>, <span className="font-mono">Descontinuado</span></p>
              <p className="text-green-600">✅ Si la Familia es una categoría principal (ej: "Eléctrica"), la subcategoría se asigna automáticamente según la descripción.</p>
              <p className="text-blue-600">📌 Si la Familia ya es una subcategoría (ej: "Rotomartillos"), se asigna directamente.</p>
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