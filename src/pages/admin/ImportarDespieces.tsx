import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, FileText, Package, Check, Loader2, AlertCircle, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RepuestoExtraido {
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
}

export default function ImportarDespieces() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [codigoProductoManual, setCodigoProductoManual] = useState("");
  const [productoEncontrado, setProductoEncontrado] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setExtractedData(null);
    } else {
      toast.error("Por favor selecciona un archivo PDF");
    }
  };

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

  const processPDF = async () => {
    if (!file) {
      toast.error("Selecciona un archivo PDF primero");
      return;
    }

    setIsProcessing(true);

    try {
      // Read file as text (for simple PDFs) or base64
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      
      // Try to extract text from PDF
      let textContent = "";
      try {
        // Simple text extraction - look for text streams
        const decoder = new TextDecoder("latin1");
        const pdfString = decoder.decode(bytes);
        
        // Extract text between BT and ET markers (basic PDF text extraction)
        const textMatches = pdfString.match(/\((.*?)\)/g);
        if (textMatches) {
          textContent = textMatches
            .map(m => m.slice(1, -1))
            .filter(t => t.length > 1 && !/^[\\\/\d]+$/.test(t))
            .join(" ");
        }
        
        // If minimal text extracted, convert to base64 for AI vision
        if (textContent.length < 100) {
          // For image-based PDFs, we'll send base64
          const base64 = btoa(String.fromCharCode(...bytes));
          textContent = `[PDF Base64 - First 50000 chars]: ${base64.substring(0, 50000)}`;
        }
      } catch (e) {
        console.error("Error extracting text:", e);
        // Fallback to base64
        const base64 = btoa(String.fromCharCode(...bytes));
        textContent = `[PDF Base64]: ${base64.substring(0, 50000)}`;
      }

      // Call edge function to process with AI
      const { data, error } = await supabase.functions.invoke("extract-despiece-pdf", {
        body: {
          pdfContent: textContent,
          codigoProducto: productoEncontrado?.codigo || codigoProductoManual || null,
          claveProducto: productoEncontrado?.clave || null
        }
      });

      if (error) throw error;

      if (data.success && data.data) {
        // Add selected property to each repuesto
        const repuestosConSeleccion = data.data.repuestos.map((r: any) => ({
          ...r,
          selected: true
        }));
        
        setExtractedData({
          producto: data.data.producto,
          repuestos: repuestosConSeleccion
        });
        toast.success(`Se extrajeron ${repuestosConSeleccion.length} repuestos`);
      } else {
        toast.error(data.error || "Error procesando el PDF");
      }
    } catch (error) {
      console.error("Error processing PDF:", error);
      toast.error("Error al procesar el PDF");
    } finally {
      setIsProcessing(false);
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

    const repuestosAGuardar = extractedData.repuestos.filter(r => r.selected);
    
    if (repuestosAGuardar.length === 0) {
      toast.error("Selecciona al menos un repuesto para guardar");
      return;
    }

    const codigoProductoFinal = productoEncontrado?.codigo || extractedData.producto.codigo;
    
    if (!codigoProductoFinal) {
      toast.error("Se requiere un código de producto válido");
      return;
    }

    setIsSaving(true);

    try {
      // First, update product clave if it doesn't have one
      if (productoEncontrado && !productoEncontrado.clave && extractedData.producto.clave) {
        const { error: updateError } = await supabase
          .from("productos")
          .update({ clave: extractedData.producto.clave })
          .eq("codigo", codigoProductoFinal);

        if (updateError) {
          console.error("Error updating product clave:", updateError);
        } else {
          toast.success("Clave del producto actualizada");
        }
      }

      // Prepare repuestos for upsert
      const repuestosParaInsertar = repuestosAGuardar.map(r => ({
        codigo: r.codigo,
        clave: r.clave,
        descripcion: r.descripcion,
        codigo_producto: codigoProductoFinal
      }));

      // Use upsert to handle duplicates
      let insertados = 0;
      let actualizados = 0;
      let errores = 0;

      for (const repuesto of repuestosParaInsertar) {
        // Check if repuesto exists
        const { data: existing } = await supabase
          .from("repuestos")
          .select("id")
          .eq("codigo", repuesto.codigo)
          .maybeSingle();

        if (existing) {
          // Update
          const { error } = await supabase
            .from("repuestos")
            .update({
              clave: repuesto.clave,
              descripcion: repuesto.descripcion,
              codigo_producto: repuesto.codigo_producto
            })
            .eq("codigo", repuesto.codigo);

          if (error) {
            console.error("Error updating repuesto:", error);
            errores++;
          } else {
            actualizados++;
          }
        } else {
          // Insert
          const { error } = await supabase
            .from("repuestos")
            .insert(repuesto);

          if (error) {
            console.error("Error inserting repuesto:", error);
            errores++;
          } else {
            insertados++;
          }
        }
      }

      if (errores === 0) {
        toast.success(`Guardados: ${insertados} nuevos, ${actualizados} actualizados`);
        // Reset form
        setExtractedData(null);
        setFile(null);
        setCodigoProductoManual("");
        setProductoEncontrado(null);
      } else {
        toast.warning(`Completado con ${errores} errores. ${insertados} nuevos, ${actualizados} actualizados`);
      }
    } catch (error) {
      console.error("Error saving repuestos:", error);
      toast.error("Error al guardar los repuestos");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCount = extractedData?.repuestos.filter(r => r.selected).length || 0;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Volver
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">Importar Despieces</h1>
        <p className="text-muted-foreground">
          Sube un PDF de despiece para extraer automáticamente los repuestos
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel Izquierdo: Carga de PDF */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Cargar PDF
            </CardTitle>
            <CardDescription>
              Selecciona el PDF del despiece de la máquina
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Búsqueda de producto */}
            <div className="space-y-2">
              <Label>Código de Producto (Opcional)</Label>
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

            {/* Input de archivo */}
            <div className="space-y-2">
              <Label>Archivo PDF</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="pdf-upload"
                />
                <label htmlFor="pdf-upload" className="cursor-pointer">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                  {file ? (
                    <p className="text-sm font-medium">{file.name}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Haz clic para seleccionar un PDF
                    </p>
                  )}
                </label>
              </div>
            </div>

            <Button 
              onClick={processPDF} 
              className="w-full" 
              disabled={!file || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando con IA...
                </>
              ) : (
                <>
                  <Package className="w-4 h-4 mr-2" />
                  Extraer Repuestos
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Panel Derecho: Resultados */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="w-5 h-5" />
              Repuestos Extraídos
            </CardTitle>
            {extractedData && (
              <CardDescription>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline">
                    Producto: {extractedData.producto.codigo}
                  </Badge>
                  <Badge variant="secondary">
                    Clave: {extractedData.producto.clave}
                  </Badge>
                </div>
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {!extractedData ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>Sube un PDF y haz clic en "Extraer Repuestos"</p>
                <p className="text-sm mt-2">
                  La IA analizará el documento y extraerá la información
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Controles de selección */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => toggleAllSelection(true)}
                    >
                      Seleccionar todos
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => toggleAllSelection(false)}
                    >
                      Deseleccionar todos
                    </Button>
                  </div>
                  <Badge>
                    {selectedCount} de {extractedData.repuestos.length} seleccionados
                  </Badge>
                </div>

                {/* Tabla de repuestos */}
                <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead>Clave</TableHead>
                        <TableHead>Descripción</TableHead>
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
                          <TableCell className="font-medium">{repuesto.codigo}</TableCell>
                          <TableCell className="text-xs">
                            {repuesto.clave}
                          </TableCell>
                          <TableCell>{repuesto.descripcion}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Botón guardar */}
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setExtractedData(null);
                      setFile(null);
                    }}
                  >
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
    </div>
  );
}
