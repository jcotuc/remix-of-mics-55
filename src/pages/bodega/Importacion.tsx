import { useState, useEffect, useRef } from "react";
import { Package, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";

type Importacion = {
  id: string;
  numero_embarque: string;
  origen: string;
  fecha_llegada: string;
  estado: string;
};

type ImportProgress = {
  processed: number;
  total: number;
  startTime: number;
};

export default function Importacion() {
  const [importaciones, setImportaciones] = useState<Importacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const keepAliveRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchImportaciones();
    return () => {
      if (keepAliveRef.current) {
        clearInterval(keepAliveRef.current);
      }
    };
  }, []);

  const fetchImportaciones = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("importaciones")
        .select("*")
        .order("fecha_llegada", { ascending: false });

      if (error) throw error;
      setImportaciones(data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar importaciones");
    } finally {
      setLoading(false);
    }
  };

  const startKeepAlive = () => {
    // Refrescar sesión cada 30 segundos para evitar timeout
    keepAliveRef.current = setInterval(async () => {
      try {
        await supabase.auth.refreshSession();
        console.log("Session refreshed during import");
      } catch (e) {
        console.warn("Error refreshing session:", e);
      }
    }, 30000);
  };

  const stopKeepAlive = () => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
  };

  const formatTimeRemaining = (progress: ImportProgress): string => {
    if (progress.processed === 0) return "Calculando...";
    
    const elapsed = Date.now() - progress.startTime;
    const rate = progress.processed / elapsed;
    const remaining = progress.total - progress.processed;
    const msRemaining = remaining / rate;
    
    const seconds = Math.ceil(msRemaining / 1000);
    if (seconds < 60) return `~${seconds}s restantes`;
    const minutes = Math.ceil(seconds / 60);
    return `~${minutes}min restantes`;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    startKeepAlive();
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet) as any[];

      if (rows.length === 0) {
        toast.error("El archivo está vacío");
        setImporting(false);
        stopKeepAlive();
        return;
      }

      // Obtener centro central
      const { data: centroCentral } = await supabase
        .from("centros_servicio")
        .select("id")
        .eq("es_central", true)
        .single();

      if (!centroCentral) {
        toast.error("No se encontró centro central");
        setImporting(false);
        stopKeepAlive();
        return;
      }

      // Preparar todos los registros primero
      type InventarioRecord = {
        centro_servicio_id: string;
        codigo_repuesto: string;
        descripcion: string | null;
        cantidad: number;
        ubicacion: string;
        bodega: string;
      };

      const recordsToUpsert: InventarioRecord[] = [];
      let skippedNoSku = 0;

      for (const row of rows) {
        const sku = row.SKU || row.sku || row.codigo || "";
        const descripcion = row.DESCRIPCION || row.descripcion || "";
        const cantidad = parseInt(row.CANTIDAD || row.cantidad || 0);
        const ubicacion = row.UBICACION || row.ubicacion || "";

        if (!sku) {
          skippedNoSku++;
          continue;
        }

        recordsToUpsert.push({
          centro_servicio_id: centroCentral.id,
          codigo_repuesto: sku.toString().trim(),
          descripcion: descripcion || null,
          cantidad: cantidad,
          ubicacion: ubicacion || "PUERTA-ENTRADA",
          bodega: "Central"
        });
      }

      if (recordsToUpsert.length === 0) {
        toast.error("No se encontraron registros válidos para importar");
        setImporting(false);
        stopKeepAlive();
        return;
      }

      // Iniciar progreso
      const startTime = Date.now();
      setProgress({ processed: 0, total: recordsToUpsert.length, startTime });

      // Procesar en batches grandes
      const BATCH_SIZE = 500;
      let imported = 0;
      let errors = 0;

      for (let i = 0; i < recordsToUpsert.length; i += BATCH_SIZE) {
        const batch = recordsToUpsert.slice(i, i + BATCH_SIZE);

        const { error } = await supabase.from("inventario").upsert(batch, {
          onConflict: "centro_servicio_id,codigo_repuesto"
        });

        if (error) {
          console.error("Error en batch:", error);
          // Intentar con batch más pequeño si falla
          const SMALL_BATCH = 50;
          for (let j = 0; j < batch.length; j += SMALL_BATCH) {
            const smallBatch = batch.slice(j, j + SMALL_BATCH);
            const { error: smallError } = await supabase.from("inventario").upsert(smallBatch, {
              onConflict: "centro_servicio_id,codigo_repuesto"
            });
            if (smallError) {
              errors += smallBatch.length;
              console.error("Error en small batch:", smallError);
            } else {
              imported += smallBatch.length;
            }
          }
        } else {
          imported += batch.length;
        }

        setProgress({
          processed: Math.min(i + batch.length, recordsToUpsert.length),
          total: recordsToUpsert.length,
          startTime
        });
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      toast.success(
        `Importación completada en ${elapsed}s: ${imported} registros importados` + 
        (errors > 0 ? `, ${errors} errores` : "") +
        (skippedNoSku > 0 ? `, ${skippedNoSku} omitidos sin SKU` : "")
      );
      setShowDialog(false);
      fetchImportaciones();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al procesar archivo");
    } finally {
      setImporting(false);
      setProgress(null);
      stopKeepAlive();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Package className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Upload className="h-8 w-8 text-primary" />
            Importaciones
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestión de ingresos de mercadería
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Nueva Importación
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Importaciones</CardTitle>
          <CardDescription>
            {importaciones.length} importaciones registradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {importaciones.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay importaciones registradas
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importaciones.map((imp) => (
                  <TableRow key={imp.id}>
                    <TableCell className="font-mono">{imp.numero_embarque}</TableCell>
                    <TableCell>{imp.origen}</TableCell>
                    <TableCell>{new Date(imp.fecha_llegada).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={imp.estado === "completado" ? "default" : "secondary"}>
                        {imp.estado}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={(open) => !importing && setShowDialog(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Importar Inventario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!importing ? (
              <>
                <p className="text-sm text-muted-foreground">
                  El archivo debe contener las columnas: SKU, DESCRIPCION, CANTIDAD, UBICACION
                </p>
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={importing}
                />
              </>
            ) : (
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="font-medium">Importando inventario...</span>
                </div>
                {progress && (
                  <div className="space-y-2">
                    <Progress value={(progress.processed / progress.total) * 100} />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{progress.processed.toLocaleString()} / {progress.total.toLocaleString()} registros</span>
                      <span>{formatTimeRemaining(progress)}</span>
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground text-center">
                  Por favor no cierre esta ventana durante la importación
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={importing}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
