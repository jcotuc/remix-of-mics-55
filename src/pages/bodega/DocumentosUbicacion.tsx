import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, MapPin } from "lucide-react";
import { toast } from "sonner";

interface DocumentoUbicacion {
  numero: string;
  tipo: 'departamental' | 'interno';
  fecha: string;
  origen: string;
  destino: string;
  estado: 'abierto' | 'cerrado' | 'cancelado';
  items: number;
}

export default function DocumentosUbicacion() {
  const [documentos, setDocumentos] = useState<DocumentoUbicacion[]>([
    {
      numero: 'UBI-2024-001',
      tipo: 'departamental',
      fecha: '2024-01-15',
      origen: 'Bodega Central',
      destino: 'Bodega Norte',
      estado: 'abierto',
      items: 5
    },
    {
      numero: 'UBI-2024-002',
      tipo: 'interno',
      fecha: '2024-01-16',
      origen: 'A-01-01',
      destino: 'B-02-03',
      estado: 'cerrado',
      items: 3
    }
  ]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    tipo: 'departamental',
    origen: '',
    destino: '',
    items: [] as { sku: string; cantidad: number }[]
  });

  const handleCrearDocumento = () => {
    const nuevoDoc: DocumentoUbicacion = {
      numero: `UBI-${new Date().getFullYear()}-${(documentos.length + 1).toString().padStart(3, '0')}`,
      tipo: formData.tipo as 'departamental' | 'interno',
      fecha: new Date().toISOString().split('T')[0],
      origen: formData.origen,
      destino: formData.destino,
      estado: 'abierto',
      items: formData.items.length
    };

    setDocumentos([nuevoDoc, ...documentos]);
    toast.success("Documento creado exitosamente");
    setDialogOpen(false);
    setFormData({ tipo: 'departamental', origen: '', destino: '', items: [] });
  };

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, "default" | "destructive" | "secondary"> = {
      'abierto': 'secondary',
      'cerrado': 'default',
      'cancelado': 'destructive'
    };
    return <Badge variant={variants[estado] || 'default'}>{estado}</Badge>;
  };

  const getTipoBadge = (tipo: string) => {
    return (
      <Badge variant="outline">
        {tipo === 'departamental' ? 'Entre Departamentos' : 'Interno'}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Documentos de Ubicación</h1>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Documento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Crear Documento de Ubicación</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Tipo de Reubicación</Label>
                <Select value={formData.tipo} onValueChange={(v) => setFormData({...formData, tipo: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="departamental">Entre Departamentos</SelectItem>
                    <SelectItem value="interno">Ubicación Interna</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Origen</Label>
                  <Input
                    placeholder={formData.tipo === 'departamental' ? 'Bodega Central' : 'A-01-01'}
                    value={formData.origen}
                    onChange={(e) => setFormData({...formData, origen: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Destino</Label>
                  <Input
                    placeholder={formData.tipo === 'departamental' ? 'Bodega Norte' : 'B-02-03'}
                    value={formData.destino}
                    onChange={(e) => setFormData({...formData, destino: e.target.value})}
                  />
                </div>
              </div>

              <Button onClick={handleCrearDocumento} className="w-full">
                Crear Documento
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="abiertos" className="w-full">
        <TabsList>
          <TabsTrigger value="abiertos">Abiertos</TabsTrigger>
          <TabsTrigger value="cerrados">Cerrados</TabsTrigger>
          <TabsTrigger value="todos">Todos</TabsTrigger>
        </TabsList>

        <TabsContent value="abiertos">
          <Card>
            <CardHeader>
              <CardTitle>Documentos Abiertos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documentos.filter(d => d.estado === 'abierto').map((doc) => (
                    <TableRow key={doc.numero}>
                      <TableCell className="font-mono">{doc.numero}</TableCell>
                      <TableCell>{getTipoBadge(doc.tipo)}</TableCell>
                      <TableCell>{doc.fecha}</TableCell>
                      <TableCell>{doc.origen}</TableCell>
                      <TableCell>{doc.destino}</TableCell>
                      <TableCell>{doc.items}</TableCell>
                      <TableCell>{getEstadoBadge(doc.estado)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">Ver Detalle</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cerrados">
          <Card>
            <CardHeader>
              <CardTitle>Documentos Cerrados</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documentos.filter(d => d.estado === 'cerrado').map((doc) => (
                    <TableRow key={doc.numero}>
                      <TableCell className="font-mono">{doc.numero}</TableCell>
                      <TableCell>{getTipoBadge(doc.tipo)}</TableCell>
                      <TableCell>{doc.fecha}</TableCell>
                      <TableCell>{doc.origen}</TableCell>
                      <TableCell>{doc.destino}</TableCell>
                      <TableCell>{doc.items}</TableCell>
                      <TableCell>{getEstadoBadge(doc.estado)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="todos">
          <Card>
            <CardHeader>
              <CardTitle>Historial Completo</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documentos.map((doc) => (
                    <TableRow key={doc.numero}>
                      <TableCell className="font-mono">{doc.numero}</TableCell>
                      <TableCell>{getTipoBadge(doc.tipo)}</TableCell>
                      <TableCell>{doc.fecha}</TableCell>
                      <TableCell>{doc.origen}</TableCell>
                      <TableCell>{doc.destino}</TableCell>
                      <TableCell>{doc.items}</TableCell>
                      <TableCell>{getEstadoBadge(doc.estado)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
