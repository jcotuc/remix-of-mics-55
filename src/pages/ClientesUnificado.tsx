import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiBackendAction } from "@/lib/api-backend";
import { toast } from "sonner";
import { Search, Eye, Edit, Users, Truck, Phone, Mail, MapPin, Home, X, Filter } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { OutlinedInput, OutlinedTextarea, OutlinedSelect } from "@/components/ui/outlined-input";
import { TablePagination } from "@/components/shared";

interface ClienteRow {
  id: number;
  codigo: string;
  nombre: string;
  nit: string | null;
  celular: string | null;
  correo: string | null;
  direccion: string | null;
  direccion_envio: string | null;
  departamento: string | null;
  municipio: string | null;
  telefono_principal: string | null;
  telefono_secundario: string | null;
  nombre_facturacion: string | null;
  created_at: string | null;
}

interface Filtros {
  conTelefono: boolean;
  conCorreo: boolean;
  conUbicacion: boolean;
  conDireccion: boolean;
}

interface ClientesUnificadoProps {
  defaultTab?: 'mostrador' | 'logistica';
}

export default function ClientesUnificado({
  defaultTab
}: ClientesUnificadoProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const initialTab = defaultTab || (location.pathname.includes('logistica') ? 'logistica' : 'mostrador');
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [clientesMostrador, setClientesMostrador] = useState<ClienteRow[]>([]);
  const [clientesLogistica, setClientesLogistica] = useState<ClienteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const [filtros, setFiltros] = useState<Filtros>({
    conTelefono: false,
    conCorreo: false,
    conUbicacion: false,
    conDireccion: false
  });

  const [totalMostrador, setTotalMostrador] = useState(0);
  const [totalLogistica, setTotalLogistica] = useState(0);
  const [totalFiltered, setTotalFiltered] = useState(0);

  const [editingCliente, setEditingCliente] = useState<ClienteRow | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [deletingCliente, setDeletingCliente] = useState<ClienteRow | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const hasActiveFilters = filtros.conTelefono || filtros.conCorreo || filtros.conUbicacion || filtros.conDireccion;

  const toggleFiltro = (key: keyof Filtros) => {
    setFiltros(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const clearFilters = () => {
    setFiltros({
      conTelefono: false,
      conCorreo: false,
      conUbicacion: false,
      conDireccion: false
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchCounts();
  }, []);

  useEffect(() => {
    fetchClientes();
  }, [activeTab, currentPage, itemsPerPage, debouncedSearch, filtros]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, debouncedSearch, filtros]);

  const fetchCounts = async () => {
    try {
      // Fetch all clients and count locally
      const { results } = await apiBackendAction("clientes.list", { limit: 50000 });
      const mostradorCount = results.filter((c: any) => c.codigo?.startsWith("HPS-")).length;
      const logisticaCount = results.filter((c: any) => c.codigo?.startsWith("HPC") && !c.codigo?.startsWith("HPC-")).length;
      setTotalMostrador(mostradorCount);
      setTotalLogistica(logisticaCount);
    } catch (error) {
      console.error("Error fetching counts:", error);
    }
  };

  const fetchClientes = async () => {
    setLoading(true);
    try {
      // Fetch all clients and filter locally (server-side filtering not supported via apiBackendAction)
      const { results: allClientes } = await apiBackendAction("clientes.list", { limit: 50000 });
      
      // Filter by tab
      let filtered = (allClientes as ClienteRow[]).filter(c => {
        if (activeTab === 'mostrador') {
          return c.codigo?.startsWith("HPS-");
        } else {
          return c.codigo?.startsWith("HPC") && !c.codigo?.startsWith("HPC-");
        }
      });

      // Search filter
      if (debouncedSearch) {
        const search = debouncedSearch.toLowerCase();
        filtered = filtered.filter(c => 
          c.codigo?.toLowerCase().includes(search) ||
          c.nombre?.toLowerCase().includes(search) ||
          c.nit?.toLowerCase().includes(search) ||
          c.celular?.toLowerCase().includes(search)
        );
      }

      // Apply boolean filters
      if (filtros.conTelefono) {
        filtered = filtered.filter(c => c.celular || c.telefono_principal);
      }
      if (filtros.conCorreo) {
        filtered = filtered.filter(c => c.correo && c.correo !== '');
      }
      if (filtros.conUbicacion) {
        filtered = filtered.filter(c => c.departamento || c.municipio);
      }
      if (filtros.conDireccion) {
        filtered = filtered.filter(c => c.direccion || c.direccion_envio);
      }

      // Sort
      if (activeTab === 'mostrador') {
        filtered.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      } else {
        filtered.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
      }

      setTotalFiltered(filtered.length);

      // Paginate
      const from = (currentPage - 1) * itemsPerPage;
      const paginated = filtered.slice(from, from + itemsPerPage);
      
      if (activeTab === 'mostrador') {
        setClientesMostrador(paginated);
      } else {
        setClientesLogistica(paginated);
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Error al cargar los clientes");
    } finally {
      setLoading(false);
    }
  };

  const currentClientes = activeTab === 'mostrador' ? clientesMostrador : clientesLogistica;
  const totalPages = Math.ceil(totalFiltered / itemsPerPage);

  const handleViewDetail = (cliente: ClienteRow) => {
    if (activeTab === 'mostrador') {
      navigate(`/mostrador/clientes/${cliente.codigo}`);
    } else {
      navigate(`/detalle-cliente/${cliente.codigo}`);
    }
  };

  const handleEdit = (cliente: ClienteRow) => {
    setEditingCliente({ ...cliente });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingCliente) return;
    setIsSaving(true);
    try {
      await apiBackendAction("clientes.update", {
        id: editingCliente.id,
        data: {
          nombre: editingCliente.nombre,
          nit: editingCliente.nit,
          celular: editingCliente.celular,
          correo: editingCliente.correo,
          direccion: editingCliente.direccion,
          departamento: editingCliente.departamento,
          municipio: editingCliente.municipio,
          telefono_principal: editingCliente.telefono_principal,
          telefono_secundario: editingCliente.telefono_secundario
        }
      });
      toast.success("Cliente actualizado correctamente");
      setIsEditDialogOpen(false);
      setEditingCliente(null);
      fetchClientes();
    } catch (error) {
      console.error("Error updating client:", error);
      toast.error("Error al actualizar el cliente");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = (cliente: ClienteRow) => {
    setDeletingCliente(cliente);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingCliente) return;
    try {
      await apiBackendAction("clientes.delete", { id: deletingCliente.id });
      toast.success("Cliente eliminado correctamente");
      setIsDeleteDialogOpen(false);
      setDeletingCliente(null);
      fetchClientes();
    } catch (error) {
      console.error("Error deleting client:", error);
      toast.error("Error al eliminar el cliente");
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Gestión de Clientes</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <TabsList className="bg-transparent border-b border-border rounded-none h-auto p-0 gap-0">
              <TabsTrigger value="mostrador" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-2.5 px-4 gap-2">
                <Users className="h-4 w-4" />
                Mostrador
                <Badge variant="secondary" className="ml-1 text-xs">
                  {totalMostrador.toLocaleString()}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="logistica" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-2.5 px-4 gap-2">
                <Truck className="h-4 w-4" />
                Logística
                <Badge variant="secondary" className="ml-1 text-xs">
                  {totalLogistica.toLocaleString()}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <div className="w-full sm:w-80">
              <OutlinedInput 
                label="Buscar por código, nombre, NIT..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                icon={<Search className="h-4 w-4" />} 
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap mt-4 pb-3 border-b">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" />
              Filtrar:
            </span>
            
            <Button
              variant={filtros.conTelefono ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => toggleFiltro('conTelefono')}
            >
              <Phone className="h-3 w-3" />
              Con Teléfono
            </Button>
            
            <Button
              variant={filtros.conCorreo ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => toggleFiltro('conCorreo')}
            >
              <Mail className="h-3 w-3" />
              Con Correo
            </Button>
            
            <Button
              variant={filtros.conUbicacion ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => toggleFiltro('conUbicacion')}
            >
              <MapPin className="h-3 w-3" />
              Con Ubicación
            </Button>
            
            <Button
              variant={filtros.conDireccion ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => toggleFiltro('conDireccion')}
            >
              <Home className="h-3 w-3" />
              Con Dirección
            </Button>
            
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                onClick={clearFilters}
              >
                <X className="h-3 w-3" />
                Limpiar
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between mt-3 mb-2">
            <p className="text-sm text-muted-foreground">
              {totalFiltered.toLocaleString()} cliente{totalFiltered !== 1 ? 's' : ''} encontrado{totalFiltered !== 1 ? 's' : ''}
              {hasActiveFilters && <span className="ml-1">(filtrado)</span>}
            </p>
          </div>

          <TabsContent value="mostrador" className="mt-0">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Cargando...</div>
            ) : currentClientes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No se encontraron clientes
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="font-semibold">Código</TableHead>
                      <TableHead className="font-semibold">Nombre</TableHead>
                      <TableHead className="font-semibold">NIT</TableHead>
                      <TableHead className="font-semibold">Teléfono</TableHead>
                      <TableHead className="font-semibold text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentClientes.map(cliente => (
                      <TableRow 
                        key={cliente.id} 
                        className="cursor-pointer hover:bg-muted/30 transition-colors" 
                        onClick={() => handleViewDetail(cliente)}
                      >
                        <TableCell className="font-mono text-sm">{cliente.codigo}</TableCell>
                        <TableCell className="font-medium">{cliente.nombre}</TableCell>
                        <TableCell>{cliente.nit}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {cliente.celular}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewDetail(cliente)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(cliente)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="logistica" className="mt-0">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Cargando...</div>
            ) : currentClientes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No se encontraron clientes
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="font-semibold">Código</TableHead>
                      <TableHead className="font-semibold">Nombre</TableHead>
                      <TableHead className="font-semibold">NIT</TableHead>
                      <TableHead className="font-semibold">Contacto</TableHead>
                      <TableHead className="font-semibold">Ubicación</TableHead>
                      <TableHead className="font-semibold text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentClientes.map(cliente => (
                      <TableRow 
                        key={cliente.id} 
                        className="cursor-pointer hover:bg-muted/30 transition-colors" 
                        onClick={() => handleViewDetail(cliente)}
                      >
                        <TableCell className="font-mono text-sm">{cliente.codigo}</TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate">{cliente.nombre}</TableCell>
                        <TableCell>{cliente.nit}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              {cliente.celular}
                            </div>
                            {cliente.correo && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                <span className="truncate max-w-[150px]">{cliente.correo}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {(cliente.departamento || cliente.municipio) && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate max-w-[150px]">
                                {[cliente.municipio, cliente.departamento].filter(Boolean).join(", ")}
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewDetail(cliente)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(cliente)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalFiltered}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(val) => {
              setItemsPerPage(val);
              setCurrentPage(1);
            }}
          />
        </Tabs>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          {editingCliente && (
            <div className="space-y-4 py-4">
              <OutlinedInput 
                label="Nombre" 
                value={editingCliente.nombre} 
                onChange={e => setEditingCliente({ ...editingCliente, nombre: e.target.value })} 
              />
              <OutlinedInput 
                label="NIT" 
                value={editingCliente.nit || ""} 
                onChange={e => setEditingCliente({ ...editingCliente, nit: e.target.value })} 
              />
              <OutlinedInput 
                label="Celular" 
                value={editingCliente.celular || ""} 
                onChange={e => setEditingCliente({ ...editingCliente, celular: e.target.value })} 
              />
              <OutlinedInput 
                label="Correo" 
                value={editingCliente.correo || ""} 
                onChange={e => setEditingCliente({ ...editingCliente, correo: e.target.value })} 
              />
              <OutlinedInput 
                label="Dirección" 
                value={editingCliente.direccion || ""} 
                onChange={e => setEditingCliente({ ...editingCliente, direccion: e.target.value })} 
              />
              <OutlinedInput 
                label="Dirección de Envío" 
                value={editingCliente.direccion_envio || ""} 
                onChange={e => setEditingCliente({ ...editingCliente, direccion_envio: e.target.value })} 
              />
              <div className="grid grid-cols-2 gap-4">
                <OutlinedInput 
                  label="Departamento" 
                  value={editingCliente.departamento || ""} 
                  onChange={e => setEditingCliente({ ...editingCliente, departamento: e.target.value })} 
                />
                <OutlinedInput 
                  label="Municipio" 
                  value={editingCliente.municipio || ""} 
                  onChange={e => setEditingCliente({ ...editingCliente, municipio: e.target.value })} 
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el cliente {deletingCliente?.nombre}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}