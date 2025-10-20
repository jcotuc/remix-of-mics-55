import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { Upload, CheckCircle2, Loader2 } from "lucide-react";

export default function ImportarClientes() {
  const [loading, setLoading] = useState(false);
  const [imported, setImported] = useState(0);
  const [autoImporting, setAutoImporting] = useState(false);
  const { toast } = useToast();


  useEffect(() => {
    // Auto-importar archivos de SAP al cargar la página
    autoImportSAPClients();
  }, []);

  const autoImportSAPClients = async () => {
    setAutoImporting(true);
    setLoading(true);
    
    try {
      let totalImported = 0;
      const files = [
        '/temp/clientes_sap_parte_1.csv',
        '/temp/clientes_sap_parte_2.csv'
      ];

      for (const filePath of files) {
        try {
          console.log(`Importando archivo SAP: ${filePath}`);
          const response = await fetch(filePath);
          if (!response.ok) {
            console.error(`No se pudo cargar ${filePath}`);
            continue;
          }
          
          const text = await response.text();
          const count = await processSAPCSV(text);
          totalImported += count;
          
          console.log(`Importados ${count} clientes de ${filePath}`);
        } catch (error) {
          console.error(`Error procesando ${filePath}:`, error);
        }
      }

      setImported(totalImported);
      toast({
        title: "Importación SAP completada",
        description: `Se importaron ${totalImported} clientes desde SAP.`,
      });
    } catch (error) {
      console.error('Error en importación SAP:', error);
      toast({
        title: "Error en importación SAP",
        description: "No se pudieron cargar los archivos de SAP.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setAutoImporting(false);
    }
  };

  const processSAPCSV = async (csvText: string): Promise<number> => {
    // Parsear CSV con delimitador ; (punto y coma)
    const lines = csvText.split('\n');
    if (lines.length < 2) return 0;
    
    // Remover BOM si existe
    const firstLine = lines[0].replace(/^\uFEFF/, '');
    const headers = firstLine.split(';').map(h => h.trim());
    
    console.log(`📊 Headers encontrados:`, headers);
    console.log(`📊 Procesando ${lines.length - 1} registros de SAP...`);
    
    const batchSize = 50;
    let count = 0;
    let errors = 0;
    
    for (let i = 1; i < lines.length; i += batchSize) {
      const batch = lines.slice(i, Math.min(i + batchSize, lines.length));
      const clientesData = batch
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(';').map(v => v.trim());
          const row: any = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx] || '';
          });
          
          // Convertir "NULL" string a null real
          const getValue = (val: string) => {
            if (!val || val === 'NULL' || val === 'null') return null;
            return val;
          };
          
          return {
            codigo: row['CardCode'] || '',
            codigo_sap: row['CardCode'] || '',
            nombre: getValue(row['CardName']) || '',
            nombre_facturacion: getValue(row['CardName']) || '',
            nit: getValue(row['U_Nit']) || 'CF',
            telefono_principal: getValue(row['Phone1']),
            telefono_secundario: getValue(row['Phone2']),
            celular: getValue(row['Phone1']), // Usar Phone1 como celular
            correo: getValue(row['E_Mail']),
            direccion: getValue(row['Address']),
            direccion_envio: getValue(row['MailAddres']),
            municipio: getValue(row['City']),
            departamento: getValue(row['County']),
            pais: row['Country'] === 'GT' ? 'Guatemala' : getValue(row['Country']),
            origen: 'sap',
          };
        })
        .filter(c => c.codigo && c.nombre);

      if (clientesData.length > 0) {
        try {
          const { error } = await supabase
            .from('clientes')
            .upsert(clientesData, {
              onConflict: 'codigo',
              ignoreDuplicates: false
            });
          
          if (!error) {
            count += clientesData.length;
            console.log(`✅ Batch ${Math.floor((i-1)/batchSize) + 1}: ${clientesData.length} clientes | Total: ${count}`);
          } else {
            errors++;
            console.error(`❌ Error en batch:`, error.message);
            
            // Intentar insertar uno por uno si falla el batch
            for (const cliente of clientesData) {
              try {
                await supabase
                  .from('clientes')
                  .upsert(cliente, { onConflict: 'codigo' });
                count++;
              } catch (e) {
                console.error(`Error individual en cliente ${cliente.codigo}`);
              }
            }
          }
        } catch (e) {
          console.error(`Error general en batch:`, e);
          errors++;
        }
      }
      
      // Pequeña pausa para no saturar
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`✨ Importación SAP completa: ${count} exitosos, ${errors} errores`);
    return count;
  };

  const processExcelData = async (jsonData: any[]): Promise<number> => {
    let count = 0;
    let errors = 0;
    const batchSize = 50; // Reducir tamaño del batch para mejor control
    
    console.log(`📊 Procesando ${jsonData.length} registros en total...`);
    
    for (let i = 0; i < jsonData.length; i += batchSize) {
      const batch = jsonData.slice(i, i + batchSize);
      const clientesData = batch
        .map(row => ({
          codigo: row['CardCode'] || '',
          nombre: row['CardName'] || '',
          nit: row['LicTradNum'] || 'CF',
          celular: row['Cellular'] || row['Phone1'] || '',
          direccion: row['Address'] || '',
          correo: row['E_Mail'] || '',
          telefono_principal: row['Phone1'] || '',
        }))
        .filter(c => c.codigo && c.nombre);

      if (clientesData.length > 0) {
        try {
          const { data, error } = await supabase
            .from('clientes')
            .upsert(clientesData, {
              onConflict: 'codigo',
              ignoreDuplicates: false
            })
            .select();
          
          if (!error) {
            count += clientesData.length;
            console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}: ${clientesData.length} clientes | Total: ${count}/${jsonData.length}`);
          } else {
            errors++;
            console.error(`❌ Error en batch ${Math.floor(i/batchSize) + 1}:`, error.message);
            
            // Intentar insertar uno por uno si falla el batch
            for (const cliente of clientesData) {
              try {
                await supabase
                  .from('clientes')
                  .upsert(cliente, { onConflict: 'codigo' });
                count++;
              } catch (e) {
                console.error(`Error individual en cliente ${cliente.codigo}`);
              }
            }
          }
        } catch (e) {
          console.error(`Error general en batch:`, e);
          errors++;
        }
      }
      
      // Pequeña pausa para no saturar
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`✨ Importación completa: ${count} exitosos, ${errors} errores`);
    return count;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setImported(0);

    try {
      let jsonData: any[] = [];
      
      // Si es CSV, lo parseamos manualmente
      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        const lines = text.split('\n');
        const headers = lines[0].split(';');
        
        jsonData = lines.slice(1)
          .filter(line => line.trim())
          .map(line => {
            const values = line.split(';');
            const obj: any = {};
            headers.forEach((header, i) => {
              obj[header.trim()] = values[i]?.trim() || '';
            });
            return obj;
          });
      } else {
        // Si es Excel
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        jsonData = XLSX.utils.sheet_to_json(worksheet);
      }

      let count = 0;
      let errors = 0;
      
      for (const row of jsonData) {
        const clienteData = {
          codigo: row['CardCode'] || row['Codigo'] || row['CODIGO'] || row['codigo'] || '',
          nombre: row['CardName'] || row['Nombre'] || row['NOMBRE'] || row['nombre'] || '',
          nit: row['LicTradNum'] || row['NIT'] || row['Nit'] || row['nit'] || 'CF',
          celular: row['Cellular'] || row['Phone1'] || row['Celular'] || row['CELULAR'] || row['celular'] || '',
          direccion: row['Address'] || row['Direccion'] || row['DIRECCION'] || row['direccion'] || '',
          correo: row['E_Mail'] || row['Correo'] || row['CORREO'] || row['correo'] || row['Email'] || row['EMAIL'] || '',
          telefono_principal: row['Phone1'] || row['Telefono'] || row['TELEFONO'] || row['telefono'] || '',
        };

        // Solo insertar si tiene código y nombre
        if (clienteData.codigo && clienteData.nombre) {
          const { error } = await supabase.from('clientes').insert(clienteData);
          if (!error) {
            count++;
          } else {
            errors++;
            console.error('Error insertando cliente:', clienteData.codigo, error);
          }
        }
      }

      setImported(count);
      toast({
        title: "Importación completada",
        description: `Se importaron ${count} clientes correctamente.${errors > 0 ? ` ${errors} errores.` : ''}`,
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
            Sube tus archivos Excel (.xlsx, .xls) o CSV de clientes para importarlos a la base de datos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {autoImporting && (
            <div className="flex items-center gap-2 text-blue-600 bg-blue-50 p-4 rounded-lg">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Importando clientes automáticamente desde los archivos CSV...</span>
            </div>
          )}
          
          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept=".xlsx,.xls,.csv"
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
