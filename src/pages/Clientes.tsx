import { useState, useEffect, useMemo } from "react";
import { Search, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { apiBackendAction } from "@/lib/api-backend";
import { toast } from "sonner";
import { TablePagination } from "@/components/shared";
import type { ClienteSchema } from "@/generated/actions.d";

export default function Clientes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [clientesList, setClientesList] = useState<ClienteSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCliente, setEditingCliente] = useState<ClienteSchema | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  useEffect(() => {
    updateCodesAndFetch();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const updateCodesAndFetch = async () => {
    try {
      setLoading(true);
      // Fetch all clients to find HPC codes
      const response = await apiBackendAction("clientes.list", { limit: 5000 });
      const allClientes = response.results || [];
      const hpcClientes = allClientes.filter((c: ClienteSchema) => c.codigo?.startsWith('HPC-'));

      if (hpcClientes.length > 0) {
        console.log(`Encontrados ${hpcClientes.length} clientes con prefijo HPC - códigos son inmutables`);
        // Note: codigo is immutable, HPC codes should be migrated at DB level
        for (const cliente of hpcClientes) {
          console.log(`Cliente HPC encontrado: ${cliente.codigo}`);
        }
      }
      await fetchClientes();
    } catch (error) {
      console.error('Error al actualizar códigos:', error);
      toast.error('Error al actualizar códigos de clientes');
      setLoading(false);
    }
  };

  const fetchClientes = async () => {
    try {
      setLoading(true);
      const response = await apiBackendAction("clientes.list", { limit: 5000 });
      const allClientes = response.results || [];
      // Filter for HPS- codes matching pattern HPS-XXXXXX
      const clientesManuales = allClientes.filter((c: ClienteSchema) => 
        c.codigo?.startsWith('HPS-') && /^HPS-\d{6}$/.test(c.codigo)
      );
      // Sort by created_at descending
      clientesManuales.sort((a: ClienteSchema, b: ClienteSchema) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
      setClientesList(clientesManuales);
    } catch (error) {
      console.error('Error al cargar clientes:', error);
      toast.error('Error al cargar los clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este cliente?')) return;
    try {
      await apiBackendAction("clientes.delete", { id });
      toast.success('Cliente eliminado exitosamente');
      fetchClientes();
    } catch (error) {
      console.error('Error al eliminar cliente:', error);
      toast.error('Error al eliminar el cliente');
    }
  };

  const handleEdit = (cliente: ClienteSchema) => {
    setEditingCliente(cliente);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingCliente) return;
    const formData = new FormData(e.currentTarget);
    try {
      await apiBackendAction("clientes.update", {
        id: editingCliente.id,
        data: {
          nombre: formData.get('nombre') as string,
          nit: formData.get('nit') as string,
          celular: formData.get('celular') as string,
          direccion: formData.get('direccion') as string || null,
          correo: formData.get('correo') as string || null,
          telefono_principal: formData.get('telefono_principal') as string || null,
          telefono_secundario: formData.get('telefono_secundario') as string || null,
          nombre_facturacion: formData.get('nombre_facturacion') as string || null,
          pais: formData.get('pais') as string || null,
          departamento: formData.get('departamento') as string || null,
          municipio: formData.get('municipio') as string || null
        }
      });
      toast.success('Cliente actualizado exitosamente');
      setIsEditDialogOpen(false);
      setEditingCliente(null);
      fetchClientes();
    } catch (error) {
      console.error('Error al actualizar cliente:', error);
      toast.error('Error al actualizar el cliente');
    }
  };

  const filteredClientes = useMemo(() => {
    return clientesList.filter(cliente => 
      cliente.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      cliente.nit?.includes(searchTerm) || 
      cliente.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [clientesList, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredClientes.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClientes = filteredClientes.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestión de Clientes</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
          <CardDescription>
            {filteredClientes.length} clientes registrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nombre, NIT o código..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="max-w-sm" 
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>NIT</TableHead>
                  <TableHead>Celular</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : paginatedClientes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      No hay clientes registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedClientes.map(cliente => (
                    <TableRow 
                      key={cliente.id} 
                      className="cursor-pointer hover:bg-muted/50" 
                      onClick={() => window.location.href = `/mostrador/clientes/${cliente.codigo}`}
                    >
                      <TableCell className="font-medium">{cliente.codigo}</TableCell>
                      <TableCell>{cliente.nombre}</TableCell>
                      <TableCell>{cliente.nit}</TableCell>
                      <TableCell>{cliente.celular}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2" onClick={e => e.stopPropagation()}>
                          <Button variant="outline" size="sm" onClick={() => handleEdit(cliente)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-destructive hover:text-destructive" 
                            onClick={() => handleDelete(cliente.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {!loading && filteredClientes.length > 0 && (
            <TablePagination 
              currentPage={currentPage} 
              totalPages={totalPages} 
              totalItems={filteredClientes.length} 
              itemsPerPage={itemsPerPage} 
              onPageChange={setCurrentPage} 
              onItemsPerPageChange={value => {
                setItemsPerPage(value);
                setCurrentPage(1);
              }} 
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>
              Actualiza la información del cliente
            </DialogDescription>
          </DialogHeader>
          
          {editingCliente && (
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-nombre">Nombre *</Label>
                  <Input id="edit-nombre" name="nombre" defaultValue={editingCliente.nombre} required />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-nit">NIT *</Label>
                  <Input id="edit-nit" name="nit" defaultValue={editingCliente.nit || ''} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-celular">Celular *</Label>
                  <Input id="edit-celular" name="celular" defaultValue={editingCliente.celular || ''} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-correo">Correo</Label>
                  <Input id="edit-correo" name="correo" type="email" defaultValue={editingCliente.correo || ''} />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="edit-direccion">Dirección</Label>
                  <Input id="edit-direccion" name="direccion" defaultValue={editingCliente.direccion || ''} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-telefono-principal">Teléfono Principal</Label>
                  <Input id="edit-telefono-principal" name="telefono_principal" defaultValue={editingCliente.telefono_principal || ''} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-telefono-secundario">Teléfono Secundario</Label>
                  <Input id="edit-telefono-secundario" name="telefono_secundario" defaultValue={editingCliente.telefono_secundario || ''} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-nombre-facturacion">Nombre Facturación</Label>
                  <Input id="edit-nombre-facturacion" name="nombre_facturacion" defaultValue={editingCliente.nombre_facturacion || ''} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-pais">País</Label>
                  <Input id="edit-pais" name="pais" defaultValue={editingCliente.pais || 'Guatemala'} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-departamento">Departamento</Label>
                  <Input id="edit-departamento" name="departamento" defaultValue={editingCliente.departamento || ''} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-municipio">Municipio</Label>
                  <Input id="edit-municipio" name="municipio" defaultValue={editingCliente.municipio || ''} />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Guardar Cambios
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
