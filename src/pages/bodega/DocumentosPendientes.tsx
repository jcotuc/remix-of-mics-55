import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface DocumentoPendiente {
  numeroDocumento: string;
  tipo: string;
  fecha: string;
  origen: string;
  estado: 'pendiente' | 'procesado' | 'error';
  diferencias: number;
}

export default function DocumentosPendientes() {
  const [documentos, setDocumentos] = useState<DocumentoPendiente[]>([
    {
      numeroDocumento: 'SAP-2024-001',
      tipo: 'Entrada de Mercancía',
      fecha: '2024-01-15',
      origen: 'SAP',
      estado: 'pendiente',
      diferencias: 0
    },
    {
      numeroDocumento: 'SAP-2024-002',
      tipo: 'Salida de Mercancía',
      fecha: '2024-01-16',
      origen: 'SAP',
      estado: 'error',
      diferencias: 3
    }
  ]);
  const [syncing, setSyncing] = useState(false);

  const sincronizarSAP = async () => {
    setSyncing(true);
    toast.info("Sincronizando con SAP...");
    
    setTimeout(() => {
      setSyncing(false);
      toast.success("Sincronización completada");
    }, 2000);
  };

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, "default" | "destructive" | "secondary"> = {
      'pendiente': 'secondary',
      'procesado': 'default',
      'error': 'destructive'
    };
    return <Badge variant={variants[estado] || 'default'}>{estado}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Documentos Pendientes de Interfaz</h1>
        </div>
        <Button onClick={sincronizarSAP} disabled={syncing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
          Sincronizar con SAP
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {documentos.filter(d => d.estado === 'pendiente').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Procesados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {documentos.filter(d => d.estado === 'procesado').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Con Errores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {documentos.filter(d => d.estado === 'error').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Documentos WMS vs SAP</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número Documento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Diferencias</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documentos.map((doc) => (
                <TableRow key={doc.numeroDocumento}>
                  <TableCell className="font-mono">{doc.numeroDocumento}</TableCell>
                  <TableCell>{doc.tipo}</TableCell>
                  <TableCell>{doc.fecha}</TableCell>
                  <TableCell>{doc.origen}</TableCell>
                  <TableCell>{getEstadoBadge(doc.estado)}</TableCell>
                  <TableCell>
                    {doc.diferencias > 0 && (
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        {doc.diferencias}
                      </div>
                    )}
                    {doc.diferencias === 0 && <span className="text-green-600">Sin diferencias</span>}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      Ver Detalle
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
