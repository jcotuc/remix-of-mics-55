import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MapPin, Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TablePagination } from "@/components/TablePagination";

interface Ubicacion {
  id: number;
  codigo: string;
  pasillo: string | null;
  rack: string | null;
  nivel: string | null;
  caja: string | null;
  activo: boolean;
  bodega_id: string;
  bodega_nombre: string;
  centro_servicio_nombre: string;
}

interface Bodega {
  cds_id: string;
  nombre: string | null;
  codigo: string | null;
  centro_servicio: {
    id: string;
    nombre: string;
  } | null;
}

export default function GestionUbicaciones() {
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBodega, setSelectedBodega] = useState<string>("todas");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 50;

  const [formData, setFormData] = useState({
    bodegaId: '',
    pasillo: '',
    rack: '',
    nivel: '',
    caja: ''
  });

  useEffect(() => {
    fetchBodegas();
  }, []);

  useEffect(() => {
    fetchUbicaciones();
  }, [selectedBodega, currentPage, searchTerm]);

  const fetchBodegas = async () => {
    const { data, error } = await supabase
      .from('Bodegas_CDS')
      .select(`
        cds_id,
        nombre,
        codigo,
        centro_servicio:centros_servicio(id, nombre)
      `)
      .eq('activo', true)
      .order('nombre');
    
    if (error) {
      console.error('Error fetching bodegas:', error);
      return;
    }
    
    setBodegas(data || []);
  };

  const fetchUbicaciones = async () => {
    setLoading(true);
    try {
      const start = (currentPage - 1) * itemsPerPage;
      const end = start + itemsPerPage - 1;

      let query = supabase
        .from('Ubicación_CDS')
        .select(`
          id,
          codigo,
          pasillo,
          rack,
          nivel,
          caja,
          activo,
          bodega_id,
          bodega:Bodegas_CDS!inner(
            nombre,
            centro_servicio:centros_servicio(nombre)
          )
        `, { count: 'exact' });

      if (selectedBodega && selectedBodega !== "todas") {
        query = query.eq('bodega_id', selectedBodega);
      }

      if (searchTerm) {
        query = query.ilike('codigo', `%${searchTerm}%`);
      }

      const { data, error, count } = await query
        .order('codigo')
        .range(start, end);

      if (error) {
        console.error('Error fetching ubicaciones:', error);
        toast.error('Error al cargar ubicaciones');
        return;
      }

      const formatted: Ubicacion[] = (data || []).map((ub: any) => ({
        id: ub.id,
        codigo: ub.codigo,
        pasillo: ub.pasillo,
        rack: ub.rack,
        nivel: ub.nivel,
        caja: ub.caja,
        activo: ub.activo,
        bodega_id: ub.bodega_id,
        bodega_nombre: ub.bodega?.nombre || 'Sin bodega',
        centro_servicio_nombre: ub.bodega?.centro_servicio?.nombre || 'Sin centro'
      }));

      setUbicaciones(formatted);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCrearUbicacion = async () => {
    if (!formData.bodegaId || !formData.pasillo || !formData.rack || !formData.nivel) {
      toast.error("Complete los campos obligatorios (Bodega, Pasillo, Rack, Nivel)");
      return;
    }

    // Build code with optional caja
    let codigo = `${formData.pasillo}.${formData.rack}.${formData.nivel}`;
    if (formData.caja) {
      codigo += `.${formData.caja}`;
    }
    
    try {
      // Check if location already exists for this bodega
      const { data: existing } = await supabase
        .from('Ubicación_CDS')
        .select('id')
        .eq('bodega_id', formData.bodegaId)
        .eq('codigo', codigo.toUpperCase())
        .maybeSingle();

      if (existing) {
        toast.error('Esta ubicación ya existe en la bodega seleccionada');
        return;
      }

      const { error } = await supabase
        .from('Ubicación_CDS')
        .insert({
          bodega_id: formData.bodegaId,
          codigo: codigo.toUpperCase(),
          pasillo: formData.pasillo.toUpperCase(),
          rack: formData.rack.toUpperCase(),
          nivel: formData.nivel.toUpperCase(),
          caja: formData.caja ? formData.caja.toUpperCase() : null,
          activo: true
        });

      if (error) throw error;

      toast.success(`Ubicación ${codigo} creada exitosamente`);
      setDialogOpen(false);
      setFormData({ bodegaId: '', pasillo: '', rack: '', nivel: '', caja: '' });
      fetchUbicaciones();
    } catch (error) {
      console.error('Error:', error);
      toast.error("Error al crear ubicación");
    }
  };

  // Build preview code
  const getPreviewCode = () => {
    if (!formData.pasillo || !formData.rack || !formData.nivel) {
      return 'X.XX.XX';
    }
    let code = `${formData.pasillo}.${formData.rack}.${formData.nivel}`;
    if (formData.caja) {
      code += `.${formData.caja}`;
    }
    return code.toUpperCase();
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Gestión de Ubicaciones</h1>
            <p className="text-muted-foreground">Administración de ubicaciones en bodegas</p>
          </div>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Ubicación
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nueva Ubicación</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Bodega <span className="text-destructive">*</span></Label>
                <Select value={formData.bodegaId} onValueChange={(v) => setFormData({...formData, bodegaId: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione bodega" />
                  </SelectTrigger>
                  <SelectContent>
                    {bodegas.map(b => (
                      <SelectItem key={b.cds_id} value={b.cds_id}>
                        {b.nombre || b.codigo} - {b.centro_servicio?.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <Label>Pasillo <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="A01"
                    value={formData.pasillo}
                    onChange={(e) => setFormData({...formData, pasillo: e.target.value.toUpperCase()})}
                    maxLength={4}
                  />
                </div>
                <div>
                  <Label>Rack <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="001"
                    value={formData.rack}
                    onChange={(e) => setFormData({...formData, rack: e.target.value})}
                    maxLength={4}
                  />
                </div>
                <div>
                  <Label>Nivel <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="02"
                    value={formData.nivel}
                    onChange={(e) => setFormData({...formData, nivel: e.target.value})}
                    maxLength={4}
                  />
                </div>
                <div>
                  <Label>Caja <span className="text-muted-foreground text-xs">(opc.)</span></Label>
                  <Input
                    placeholder="15"
                    value={formData.caja}
                    onChange={(e) => setFormData({...formData, caja: e.target.value})}
                    maxLength={4}
                  />
                </div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Vista previa:</p>
                <p className="text-lg font-bold font-mono">{getPreviewCode()}</p>
              </div>
              <Button onClick={handleCrearUbicacion} className="w-full">
                Crear Ubicación
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Bodega</Label>
              <Select value={selectedBodega} onValueChange={(v) => { setSelectedBodega(v); setCurrentPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las bodegas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las bodegas</SelectItem>
                  {bodegas.map(b => (
                    <SelectItem key={b.cds_id} value={b.cds_id}>
                      {b.nombre || b.codigo} - {b.centro_servicio?.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Buscar código</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Ej: A01.001.02.15"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ubicaciones ({totalCount.toLocaleString()})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Cargando...</p>
          ) : ubicaciones.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No se encontraron ubicaciones
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Pasillo</TableHead>
                    <TableHead>Rack</TableHead>
                    <TableHead>Nivel</TableHead>
                    <TableHead>Caja</TableHead>
                    <TableHead>Bodega</TableHead>
                    <TableHead>Centro de Servicio</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ubicaciones.map((ub) => (
                    <TableRow key={ub.id}>
                      <TableCell className="font-mono font-bold">{ub.codigo}</TableCell>
                      <TableCell>{ub.pasillo || '-'}</TableCell>
                      <TableCell>{ub.rack || '-'}</TableCell>
                      <TableCell>{ub.nivel || '-'}</TableCell>
                      <TableCell>{ub.caja || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{ub.bodega_nombre}</Badge>
                      </TableCell>
                      <TableCell>{ub.centro_servicio_nombre}</TableCell>
                      <TableCell>
                        <Badge className={ub.activo ? "bg-green-500" : "bg-muted"}>
                          {ub.activo ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalCount}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={() => {}}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
