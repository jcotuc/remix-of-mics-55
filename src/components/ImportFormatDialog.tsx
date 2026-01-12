import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileSpreadsheet, Download, Upload } from "lucide-react";

interface ColumnInfo {
  nombre: string;
  descripcion: string;
  requerido?: boolean;
  ejemplo?: string;
}

interface ImportFormatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  columns: ColumnInfo[];
  onImport: () => void;
  exampleFileName?: string;
}

export default function ImportFormatDialog({
  open,
  onOpenChange,
  title,
  description,
  columns,
  onImport,
  exampleFileName,
}: ImportFormatDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <h4 className="font-medium mb-3">Formato del archivo Excel/CSV</h4>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead className="font-semibold">Columna</TableHead>
                    <TableHead className="font-semibold">Descripción</TableHead>
                    <TableHead className="font-semibold text-center w-24">Requerido</TableHead>
                    <TableHead className="font-semibold">Ejemplo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {columns.map((col, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm bg-background">
                        {col.nombre}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {col.descripcion}
                      </TableCell>
                      <TableCell className="text-center">
                        {col.requerido !== false ? (
                          <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded">
                            Sí
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            No
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {col.ejemplo || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-200">
            <FileSpreadsheet className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Nota importante:</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-xs">
                <li>La primera fila debe contener los nombres de las columnas</li>
                <li>Se aceptan archivos .xlsx, .xls o .csv</li>
                <li>Los nombres de columna no distinguen mayúsculas/minúsculas</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onImport}>
            <Upload className="h-4 w-4 mr-2" />
            Seleccionar Archivo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
