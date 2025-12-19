import { useState, useEffect } from "react";
import { Package, Upload, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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

export default function Importacion() {
  const [importaciones, setImportaciones] = useState<Importacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetchImportaciones();
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet) as any[];

      if (rows.length === 0) {
        toast.error("El archivo está vacío");
        setImporting(false);
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
        return;
      }

      let imported = 0;
      let errors = 0;

      for (const row of rows) {
        const sku = row.SKU || row.sku || row.codigo || "";
        const descripcion = row.DESCRIPCION || row.descripcion || "";
        const cantidad = parseInt(row.CANTIDAD || row.cantidad || 0);
        const ubicacion = row.UBICACION || row.ubicacion || "";

        if (!sku) {
          errors++;
          continue;
        }

        // Upsert a inventario
        const { error } = await supabase.from("inventario").upsert({
          centro_servicio_id: centroCentral.id,
          codigo_repuesto: sku,
          descripcion: descripcion || null,
          cantidad: cantidad,
          ubicacion: ubicacion || "PUERTA-ENTRADA",
          bodega: "Central"
        }, { onConflict: "centro_servicio_id,codigo_repuesto" });

        if (error) {
          errors++;
        } else {
          imported++;
        }
      }

      toast.success(`Importación completada: ${imported} registros, ${errors} errores`);
      setShowDialog(false);
      fetchImportaciones();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al procesar archivo");
    }
    setImporting(false);
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

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Inventario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              El archivo debe contener las columnas: SKU, DESCRIPCION, CANTIDAD, UBICACION
            </p>
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={importing}
            />
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
