import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, FileText, Package, Loader2, Save, Trash2, FileSpreadsheet, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import * as XLSX from "xlsx";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface RepuestoExtraido {
  no: string;
  codigo: string;
  clave: string;
  descripcion: string;
  selected: boolean;
}

interface ProductoExtraido {
  codigo: string;
  clave: string;
  descripcion: string;
}

interface ExtractedData {
  producto: ProductoExtraido;
  repuestos: RepuestoExtraido[];
  fileName?: string;
}

interface ColumnSelection {
  no: boolean;
  codigo: boolean;
  clave: boolean;
  descripcion: boolean;
}

interface FileQueueItem {
  file: File;
  status: 'pending' | 'processing' | 'done' | 'error';
  extractedData?: ExtractedData;
  error?: string;
}

export default function ImportarDespieces() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"pdf" | "excel">("pdf");
  
  // PDF state
  const [pdfFiles, setPdfFiles] = useState<FileQueueItem[]>([]);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [currentPdfIndex, setCurrentPdfIndex] = useState<number | null>(null);
  
  // Excel state
  const [excelFiles, setExcelFiles] = useState<FileQueueItem[]>([]);
  const [excelData, setExcelData] = useState<RepuestoExtraido[]>([]);
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<{
    no: string;
    codigo: string;
    clave: string;
    descripcion: string;
  }>({ no: "", codigo: "", clave: "", descripcion: "" });
  
  // Common state
  const [isSaving, setIsSaving] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [codigoProductoManual, setCodigoProductoManual] = useState("");
  const [productoEncontrado, setProductoEncontrado] = useState<any>(null);
  const [columnSelection, setColumnSelection] = useState<ColumnSelection>({
    no: true,
    codigo: true,
    clave: true,
    descripcion: true
  });

  // ============ PDF Functions ============
  const handlePdfFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const pdfFilesOnly = files.filter(f => f.type === "application/pdf");
    
    if (pdfFilesOnly.length !== files.length) {
      toast.warning("Algunos archivos no son PDF y fueron ignorados");
    }
    
    const newItems: FileQueueItem[] = pdfFilesOnly.map(file => ({
      file,
      status: 'pending'
    }));
    
    setPdfFiles(prev => [...prev, ...newItems]);
  };

  const removePdfFile = (index: number) => {
    setPdfFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processPdfFile = async (fileItem: FileQueueItem, index: number) => {
    try {
      const arrayBuffer = await fileItem.file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      let textContent = "";
      try {
        const pdf = await getDocument({ data: bytes }).promise;
        const pages: string[] = [];

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const text = await page.getTextContent();
          const pageText = (text.items as any[])
            .map((it) => (typeof it?.str === "string" ? it.str : ""))
            .filter(Boolean)
            .join(" ");

          if (pageText.trim()) pages.push(pageText);
        }

        textContent = pages.join("\n\n");
      } catch (e) {
        console.error("Error extracting PDF text:", e);
      }

      if (textContent.trim().length < 100) {
        try {
          const decoder = new TextDecoder("latin1");
          const pdfString = decoder.decode(bytes);
          const textMatches = pdfString.match(/\((.*?)\)/g);
          if (textMatches) {
            textContent = textMatches
              .map((m) => m.slice(1, -1))
              .filter((t) => t.length > 1 && !/^[\\\/\d]+$/.test(t))
              .join(" ");
          }
        } catch (e) {
          console.error("Fallback extraction failed:", e);
        }
      }

      if (textContent.trim().length < 50) {
        throw new Error("No se pudo extraer texto del PDF");
      }

      const { data, error } = await supabase.functions.invoke("extract-despiece-pdf", {
        body: {
          pdfContent: textContent,
          codigoProducto: productoEncontrado?.codigo || codigoProductoManual || null,
          claveProducto: productoEncontrado?.clave || null
        }
      });

      if (error) throw error;

      if (data.success && data.data) {
        const repuestosConSeleccion = data.data.repuestos.map((r: any) => ({
          ...r,
          selected: true
        }));
        
        return {
          producto: data.data.producto,
          repuestos: repuestosConSeleccion,
          fileName: fileItem.file.name
        };
      } else {
        throw new Error(data.error || "Error procesando el PDF");
      }
    } catch (error) {
      throw error;
    }
  };

  const processAllPdfs = async () => {
    setIsProcessingPdf(true);
    
    for (let i = 0; i < pdfFiles.length; i++) {
      if (pdfFiles[i].status !== 'pending') continue;
      
      setCurrentPdfIndex(i);
      setPdfFiles(prev => prev.map((f, idx) => 
        idx === i ? { ...f, status: 'processing' } : f
      ));

      try {
        const result = await processPdfFile(pdfFiles[i], i);
        setPdfFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'done', extractedData: result } : f
        ));
      } catch (error: any) {
        setPdfFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'error', error: error.message } : f
        ));
      }
    }
    
    setCurrentPdfIndex(null);
    setIsProcessingPdf(false);
    toast.success("Procesamiento completado");
  };

  const selectPdfResult = (index: number) => {
    const item = pdfFiles[index];
    if (item.extractedData) {
      setExtractedData(item.extractedData);
    }
  };

  // ============ Excel Functions ============
  const handleExcelFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const excelFilesOnly = files.filter(f => 
      f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.name.endsWith('.csv')
    );
    
    if (excelFilesOnly.length !== files.length) {
      toast.warning("Algunos archivos no son Excel/CSV y fueron ignorados");
    }
    
    const newItems: FileQueueItem[] = excelFilesOnly.map(file => ({
      file,
      status: 'pending'
    }));
    
    setExcelFiles(prev => [...prev, ...newItems]);
    
    // Process first file to get columns
    if (excelFilesOnly.length > 0) {
      processExcelForColumns(excelFilesOnly[0]);
    }
  };

  const processExcelForColumns = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      if (jsonData.length > 0) {
        const headers = jsonData[0].map((h: any) => String(h || ''));
        setExcelColumns(headers);
        
        // Auto-detect column mapping
        const autoMapping = { no: "", codigo: "", clave: "", descripcion: "" };
        headers.forEach(h => {
          const lower = h.toLowerCase();
          if (lower.includes('no') || lower === '#') autoMapping.no = h;
          if (lower.includes('codigo') || lower.includes('código') || lower.includes('code')) autoMapping.codigo = h;
          if (lower.includes('clave') || lower.includes('key') || lower.includes('sku')) autoMapping.clave = h;
          if (lower.includes('desc') || lower.includes('nombre') || lower.includes('name')) autoMapping.descripcion = h;
        });
        setColumnMapping(autoMapping);
      }
    } catch (error) {
      console.error("Error reading Excel:", error);
      toast.error("Error al leer el archivo Excel");
    }
  };

  const processAllExcel = async () => {
    const allRepuestos: RepuestoExtraido[] = [];
    
    for (const item of excelFiles) {
      try {
        const arrayBuffer = await item.file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
        
        jsonData.forEach((row, idx) => {
          allRepuestos.push({
            no: columnMapping.no ? String(row[columnMapping.no] || idx + 1) : String(idx + 1),
            codigo: columnMapping.codigo ? String(row[columnMapping.codigo] || '') : '',
            clave: columnMapping.clave ? String(row[columnMapping.clave] || '') : '',
            descripcion: columnMapping.descripcion ? String(row[columnMapping.descripcion] || '') : '',
            selected: true
          });
        });
      } catch (error) {
        console.error("Error processing Excel file:", error);
      }
    }
    
    setExcelData(allRepuestos);
    setExtractedData({
      producto: { 
        codigo: productoEncontrado?.codigo || codigoProductoManual || '', 
        clave: productoEncontrado?.clave || '', 
        descripcion: productoEncontrado?.descripcion || '' 
      },
      repuestos: allRepuestos
    });
    
    toast.success(`Se cargaron ${allRepuestos.length} repuestos de ${excelFiles.length} archivo(s)`);
  };

  const removeExcelFile = (index: number) => {
    setExcelFiles(prev => prev.filter((_, i) => i !== index));
  };

  // ============ Common Functions ============
  const buscarProducto = async () => {
    if (!codigoProductoManual.trim()) {
      toast.error("Ingresa un código de producto");
      return;
    }

    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .eq("codigo", codigoProductoManual.trim())
      .maybeSingle();

    if (error) {
      toast.error("Error buscando producto");
      return;
    }

    if (data) {
      setProductoEncontrado(data);
      toast.success(`Producto encontrado: ${data.descripcion}`);
    } else {
      toast.error("Producto no encontrado");
      setProductoEncontrado(null);
    }
  };

  const toggleRepuestoSelection = (index: number) => {
    if (!extractedData) return;
    
    const updated = [...extractedData.repuestos];
    updated[index].selected = !updated[index].selected;
    setExtractedData({ ...extractedData, repuestos: updated });
  };

  const toggleAllSelection = (selected: boolean) => {
    if (!extractedData) return;
    
    const updated = extractedData.repuestos.map(r => ({ ...r, selected }));
    setExtractedData({ ...extractedData, repuestos: updated });
  };

  const guardarRepuestos = async () => {
    if (!extractedData) return;

    const repuestosAGuardar = extractedData.repuestos.filter(r => r.selected && r.codigo);
    
    if (repuestosAGuardar.length === 0) {
      toast.error("Selecciona al menos un repuesto con código para guardar");
      return;
    }

    let productoId = productoEncontrado?.id;
    const codigoProductoFinal = productoEncontrado?.codigo || extractedData.producto.codigo;
    
    if (!productoId && codigoProductoFinal) {
      const { data: prod } = await supabase
        .from("productos")
        .select("id")
        .eq("codigo", codigoProductoFinal)
        .maybeSingle();
      productoId = prod?.id;
    }
    
    if (!productoId) {
      toast.error("Se requiere un producto válido");
      return;
    }

    setIsSaving(true);

    try {
      if (productoEncontrado && !productoEncontrado.clave && extractedData.producto.clave) {
        await supabase
          .from("productos")
          .update({ clave: extractedData.producto.clave })
          .eq("id", productoId);
      }

      const codigosRepuestos = repuestosAGuardar.map(r => r.codigo);
      const { data: relacionesData } = await supabase
        .from("repuestos_relaciones")
        .select('id, Código, Padre')
        .filter('Código', 'in', `(${codigosRepuestos.join(',')})`);

      const relacionesMap = new Map<string, { id: number; padreId: number | null }>();
      (relacionesData as any[] || []).forEach((r) => {
        const codigo = r["Código"] || r.Código;
        if (codigo) {
          relacionesMap.set(codigo, { id: r.id, padreId: r.Padre });
        }
      });

      const padreIds = [...new Set(
        (relacionesData as any[] || [])
          .filter((r) => r.Padre != null)
          .map((r) => r.Padre as number)
      )];
      
      let padreCodigoMap = new Map<number, string>();
      if (padreIds.length > 0) {
        const { data: padresData } = await supabase
          .from("repuestos_relaciones")
          .select('id, Código')
          .in("id", padreIds);
        
        (padresData as any[] || []).forEach((p) => {
          const codigo = p["Código"] || p.Código;
          if (codigo) {
            padreCodigoMap.set(p.id, codigo);
          }
        });
      }

      let insertados = 0;
      let actualizados = 0;
      let errores = 0;

      for (const repuesto of repuestosAGuardar) {
        const relacion = relacionesMap.get(repuesto.codigo);
        const codigoPadre = relacion?.padreId ? padreCodigoMap.get(relacion.padreId) : null;
        const esCodigoPadre = relacion && !relacion.padreId;

        const { data: existing } = await supabase
          .from("repuestos")
          .select("id")
          .eq("codigo", repuesto.codigo)
          .maybeSingle();

        const repuestoData = {
          codigo: repuesto.codigo,
          clave: repuesto.clave,
          descripcion: repuesto.descripcion,
          producto_id: productoId,
          codigo_padre: codigoPadre || null,
          es_codigo_padre: esCodigoPadre || false
        };

        if (existing) {
          const { error } = await supabase
            .from("repuestos")
            .update(repuestoData)
            .eq("codigo", repuesto.codigo);

          if (error) {
            errores++;
          } else {
            actualizados++;
          }
        } else {
          const { error } = await supabase
            .from("repuestos")
            .insert(repuestoData);

          if (error) {
            errores++;
          } else {
            insertados++;
          }
        }
      }

      if (errores === 0) {
        toast.success(`Guardados: ${insertados} nuevos, ${actualizados} actualizados`);
        setExtractedData(null);
      } else {
        toast.warning(`Completado con ${errores} errores. ${insertados} nuevos, ${actualizados} actualizados`);
      }
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Error al guardar los repuestos");
    } finally {
      setIsSaving(false);
    }
  };

  const clearAll = () => {
    setExtractedData(null);
    setPdfFiles([]);
    setExcelFiles([]);
    setExcelData([]);
    setCodigoProductoManual("");
    setProductoEncontrado(null);
  };

  const selectedCount = extractedData?.repuestos.filter(r => r.selected).length || 0;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Volver
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">Importar Despieces</h1>
        <p className="text-muted-foreground">
          Importa repuestos desde archivos PDF o Excel
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "pdf" | "excel")}>
        <TabsList className="mb-4">
          <TabsTrigger value="pdf" className="gap-2">
            <FileText className="w-4 h-4" />
            Desde PDF
          </TabsTrigger>
          <TabsTrigger value="excel" className="gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Desde Excel
          </TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Cargar Archivos
              </CardTitle>
              <CardDescription>
                {activeTab === "pdf" 
                  ? "Sube uno o más PDFs de despiece"
                  : "Sube archivos Excel o CSV"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Product search - common */}
              <div className="space-y-2">
                <Label>Código de Producto</Label>
                <div className="flex gap-2">
                  <Input
                    value={codigoProductoManual}
                    onChange={(e) => setCodigoProductoManual(e.target.value)}
                    placeholder="Ej: 16441"
                  />
                  <Button variant="outline" onClick={buscarProducto}>
                    Buscar
                  </Button>
                </div>
                {productoEncontrado && (
                  <div className="p-2 bg-green-500/10 rounded-md border border-green-500/30">
                    <p className="text-sm font-medium">{productoEncontrado.descripcion}</p>
                    <p className="text-xs text-muted-foreground">
                      Clave: {productoEncontrado.clave || "Sin clave"}
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              <TabsContent value="pdf" className="mt-0 space-y-4">
                {/* PDF file input */}
                <div className="space-y-2">
                  <Label>Archivos PDF</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                    <input
                      type="file"
                      accept="application/pdf"
                      multiple
                      onChange={handlePdfFilesChange}
                      className="hidden"
                      id="pdf-upload"
                    />
                    <label htmlFor="pdf-upload" className="cursor-pointer">
                      <FileText className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Haz clic para seleccionar PDFs
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Puedes seleccionar múltiples archivos
                      </p>
                    </label>
                  </div>
                </div>

                {/* PDF file list */}
                {pdfFiles.length > 0 && (
                  <ScrollArea className="h-[200px] border rounded-lg p-2">
                    <div className="space-y-2">
                      {pdfFiles.map((item, index) => (
                        <div 
                          key={index} 
                          className={`flex items-center justify-between p-2 rounded-lg text-sm cursor-pointer hover:bg-muted/50 ${
                            item.status === 'done' ? 'bg-green-500/10' : 
                            item.status === 'error' ? 'bg-destructive/10' : 
                            item.status === 'processing' ? 'bg-primary/10' : 'bg-muted/30'
                          }`}
                          onClick={() => item.status === 'done' && selectPdfResult(index)}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {item.status === 'processing' && <Loader2 className="w-4 h-4 animate-spin" />}
                            {item.status === 'done' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                            {item.status === 'error' && <X className="w-4 h-4 text-destructive" />}
                            {item.status === 'pending' && <FileText className="w-4 h-4 text-muted-foreground" />}
                            <span className="truncate">{item.file.name}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              removePdfFile(index);
                            }}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                <Button 
                  onClick={processAllPdfs} 
                  className="w-full" 
                  disabled={pdfFiles.length === 0 || isProcessingPdf}
                >
                  {isProcessingPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Procesando {currentPdfIndex !== null ? `(${currentPdfIndex + 1}/${pdfFiles.length})` : '...'}
                    </>
                  ) : (
                    <>
                      <Package className="w-4 h-4 mr-2" />
                      Procesar {pdfFiles.length} PDF{pdfFiles.length !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </TabsContent>

              <TabsContent value="excel" className="mt-0 space-y-4">
                {/* Excel file input */}
                <div className="space-y-2">
                  <Label>Archivos Excel/CSV</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      multiple
                      onChange={handleExcelFilesChange}
                      className="hidden"
                      id="excel-upload"
                    />
                    <label htmlFor="excel-upload" className="cursor-pointer">
                      <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Haz clic para seleccionar archivos
                      </p>
                    </label>
                  </div>
                </div>

                {/* Excel file list */}
                {excelFiles.length > 0 && (
                  <ScrollArea className="h-[120px] border rounded-lg p-2">
                    <div className="space-y-2">
                      {excelFiles.map((item, index) => (
                        <div 
                          key={index} 
                          className="flex items-center justify-between p-2 rounded-lg text-sm bg-muted/30"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
                            <span className="truncate">{item.file.name}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeExcelFile(index)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                {/* Column mapping */}
                {excelColumns.length > 0 && (
                  <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm font-medium">Mapeo de columnas:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(['no', 'codigo', 'clave', 'descripcion'] as const).map((field) => (
                        <div key={field} className="space-y-1">
                          <Label className="text-xs capitalize">{field}</Label>
                          <select
                            className="w-full text-xs p-1.5 border rounded bg-background"
                            value={columnMapping[field]}
                            onChange={(e) => setColumnMapping(prev => ({ ...prev, [field]: e.target.value }))}
                          >
                            <option value="">-- Seleccionar --</option>
                            {excelColumns.map(col => (
                              <option key={col} value={col}>{col}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button 
                  onClick={processAllExcel} 
                  className="w-full" 
                  disabled={excelFiles.length === 0 || !columnMapping.codigo}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Cargar {excelFiles.length} archivo{excelFiles.length !== 1 ? 's' : ''}
                </Button>
              </TabsContent>
            </CardContent>
          </Card>

          {/* Right Panel: Results */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5" />
                Repuestos Extraídos
              </CardTitle>
              {extractedData && (
                <CardDescription>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {extractedData.fileName && (
                      <Badge variant="outline">{extractedData.fileName}</Badge>
                    )}
                    <Badge variant="outline">
                      Producto: {extractedData.producto.codigo || productoEncontrado?.codigo || '-'}
                    </Badge>
                    {extractedData.producto.clave && (
                      <Badge variant="secondary">
                        Clave: {extractedData.producto.clave}
                      </Badge>
                    )}
                  </div>
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {!extractedData ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>Sube archivos y procésalos para ver los repuestos</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Column selection */}
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium mb-2">Columnas visibles:</p>
                    <div className="flex items-center gap-4 flex-wrap">
                      {(['no', 'codigo', 'clave', 'descripcion'] as const).map((col) => (
                        <label key={col} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={columnSelection[col]}
                            onCheckedChange={(checked) => 
                              setColumnSelection(prev => ({ ...prev, [col]: !!checked }))
                            }
                          />
                          {col === 'no' ? 'NO.' : col.charAt(0).toUpperCase() + col.slice(1)}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Row selection controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Button variant="outline" size="sm" onClick={() => toggleAllSelection(true)}>
                        Seleccionar todos
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => toggleAllSelection(false)}>
                        Deseleccionar todos
                      </Button>
                    </div>
                    <Badge>{selectedCount} de {extractedData.repuestos.length} seleccionados</Badge>
                  </div>

                  {/* Table */}
                  <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background">
                        <TableRow>
                          <TableHead className="w-10"></TableHead>
                          {columnSelection.no && <TableHead className="w-16">NO.</TableHead>}
                          {columnSelection.codigo && <TableHead>Código</TableHead>}
                          {columnSelection.clave && <TableHead>Clave</TableHead>}
                          {columnSelection.descripcion && <TableHead>Descripción</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {extractedData.repuestos.map((repuesto, index) => (
                          <TableRow 
                            key={index}
                            className={repuesto.selected ? "" : "opacity-50"}
                          >
                            <TableCell>
                              <Checkbox
                                checked={repuesto.selected}
                                onCheckedChange={() => toggleRepuestoSelection(index)}
                              />
                            </TableCell>
                            {columnSelection.no && (
                              <TableCell className="text-muted-foreground">{repuesto.no}</TableCell>
                            )}
                            {columnSelection.codigo && (
                              <TableCell className={`font-medium ${!repuesto.codigo ? "text-destructive" : ""}`}>
                                {repuesto.codigo || "-"}
                              </TableCell>
                            )}
                            {columnSelection.clave && (
                              <TableCell className={`text-xs ${!repuesto.clave ? "text-destructive" : ""}`}>
                                {repuesto.clave || "-"}
                              </TableCell>
                            )}
                            {columnSelection.descripcion && (
                              <TableCell className={!repuesto.descripcion ? "text-destructive" : ""}>
                                {repuesto.descripcion || "-"}
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={clearAll}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Descartar
                    </Button>
                    <Button 
                      onClick={guardarRepuestos}
                      disabled={isSaving || selectedCount === 0}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Guardar {selectedCount} Repuestos
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Tabs>
    </div>
  );
}
