import { Download, FileSpreadsheet, FileText, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface ExportColumn {
  key: string;
  label: string;
}

interface ExportDropdownProps {
  data: Record<string, any>[];
  columns: ExportColumn[];
  filename?: string;
  disabled?: boolean;
}

export function ExportDropdown({
  data,
  columns,
  filename = "export",
  disabled = false
}: ExportDropdownProps) {
  const formatDate = () => {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  };

  const prepareData = () => {
    return data.map(row => {
      const formatted: Record<string, any> = {};
      columns.forEach(col => {
        formatted[col.label] = row[col.key] ?? "";
      });
      return formatted;
    });
  };

  const exportToExcel = () => {
    try {
      const exportData = prepareData();
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Datos");
      
      // Auto-size columns
      const colWidths = columns.map(col => ({
        wch: Math.max(col.label.length, 15)
      }));
      ws['!cols'] = colWidths;
      
      XLSX.writeFile(wb, `${filename}_${formatDate()}.xlsx`);
      toast.success(`Exportado ${data.length} registros a Excel`);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast.error("Error al exportar a Excel");
    }
  };

  const exportToCSV = () => {
    try {
      const exportData = prepareData();
      const ws = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(ws);
      
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}_${formatDate()}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      
      toast.success(`Exportado ${data.length} registros a CSV`);
    } catch (error) {
      console.error("Error exporting to CSV:", error);
      toast.error("Error al exportar a CSV");
    }
  };

  const exportToText = () => {
    try {
      const header = columns.map(c => c.label).join("\t");
      const rows = data.map(row => 
        columns.map(col => String(row[col.key] ?? "")).join("\t")
      );
      const text = [header, ...rows].join("\n");
      
      const blob = new Blob([text], { type: "text/plain;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}_${formatDate()}.txt`;
      link.click();
      URL.revokeObjectURL(link.href);
      
      toast.success(`Exportado ${data.length} registros a TXT`);
    } catch (error) {
      console.error("Error exporting to TXT:", error);
      toast.error("Error al exportar");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled || data.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={exportToExcel}>
          <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
          Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToCSV}>
          <FileText className="h-4 w-4 mr-2 text-blue-600" />
          CSV (.csv)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportToText}>
          <FileDown className="h-4 w-4 mr-2 text-gray-600" />
          Texto (.txt)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          {data.length} registro{data.length !== 1 ? "s" : ""} para exportar
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
