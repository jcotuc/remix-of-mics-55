import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { Upload, CheckCircle2 } from "lucide-react";

export default function ImportarClientes() {
  const [loading, setLoading] = useState(false);
  const [imported, setImported] = useState(0);
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setImported(0);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      let count = 0;
      for (const row of jsonData as any[]) {
        const { error } = await supabase.from('clientes').insert({
          codigo: row['Codigo'] || row['CODIGO'] || row['codigo'],
          nombre: row['Nombre'] || row['NOMBRE'] || row['nombre'],
          nit: row['NIT'] || row['Nit'] || row['nit'] || 'CF',
          celular: row['Celular'] || row['CELULAR'] || row['celular'] || row['Telefono'] || row['TELEFONO'] || '',
          direccion: row['Direccion'] || row['DIRECCION'] || row['direccion'],
          correo: row['Correo'] || row['CORREO'] || row['correo'] || row['Email'] || row['EMAIL'],
          telefono_principal: row['Telefono'] || row['TELEFONO'] || row['telefono'],
        });

        if (!error) count++;
      }

      setImported(count);
      toast({
        title: "Importación exitosa",
        description: `Se importaron ${count} clientes correctamente.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Hubo un problema al importar el archivo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Importar Clientes desde Excel</CardTitle>
          <CardDescription>
            Sube tus archivos Excel de clientes para importarlos a la base de datos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={loading}
            />
            <Upload className="h-5 w-5" />
          </div>
          
          {loading && (
            <p className="text-sm text-muted-foreground">Importando clientes...</p>
          )}
          
          {imported > 0 && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span>{imported} clientes importados exitosamente</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
