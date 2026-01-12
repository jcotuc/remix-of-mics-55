import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Eye, Edit, Trash2, Users, Truck, Phone, Mail, MapPin } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { OutlinedInput, OutlinedTextarea, OutlinedSelect } from "@/components/ui/outlined-input";
import { TablePagination } from "@/components/TablePagination";

interface Cliente {
  id: string;
  codigo: string;
  nombre: string;
  nit: string;
  celular: string;
  correo: string | null;
  direccion: string | null;
  direccion_envio: string | null;
  departamento: string | null;
  municipio: string | null;
  telefono_principal: string | null;
  telefono_secundario: string | null;
  nombre_facturacion: string | null;
  codigo_sap: string | null;
  created_at: string;
}

interface ClientesUnificadoProps {
  defaultTab?: 'mostrador' | 'logistica';
}

export default function ClientesUnificado({ defaultTab }: ClientesUnificadoProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine default tab based on route if not provided
  const initialTab = defaultTab || (location.pathname.includes('logistica') ? 'logistica' : 'mostrador');
  
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [clientesMostrador, setClientesMostrador] = useState<Cliente[]>([]);
  const [clientesLogistica, setClientesLogistica] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
  // Total counts for badges
  const [totalMostrador, setTotalMostrador] = useState(0);
  const [totalLogistica, setTotalLogistica] = useState(0);
  const [totalFiltered, setTotalFiltered] = useState(0);
  
  // Edit modal state
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Delete confirmation state
  const [deletingCliente, setDeletingCliente] = useState<Cliente | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch counts on mount
  useEffect(() => {
    fetchCounts();
  }, []);

  // Fetch data when tab, page, items per page, or search changes
  useEffect(() => {
    fetchClientes();
  }, [activeTab, currentPage, itemsPerPage, debouncedSearch]);

  // Reset page when changing tabs or search
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, debouncedSearch]);

  const fetchCounts = async () => {
    try {
      // Count Mostrador clients
      const { count: mostradorCount } = await supabase
        .from("clientes")
        .select("*", { count: "exact", head: true })
        .like("codigo", "HPS-%");
      
      setTotalMostrador(mostradorCount || 0);

      // Count Logística clients  
      const { count: logisticaCount } = await supabase
        .from("clientes")
        .select("*", { count: "exact", head: true })
        .like("codigo", "HPC%")
        .not("codigo", "like", "HPC-%");
      
      setTotalLogistica(logisticaCount || 0);
    } catch (error) {
      console.error("Error fetching counts:", error);
    }
  };

  const fetchClientes = async () => {
    setLoading(true);
    try {
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      if (activeTab === 'mostrador') {
        // Build query for Mostrador
        let query = supabase
          .from("clientes")
          .select("*", { count: "exact" })
          .like("codigo", "HPS-%");

        // Apply search filter
        if (debouncedSearch) {
          query = query.or(
            `codigo.ilike.%${debouncedSearch}%,nombre.ilike.%${debouncedSearch}%,nit.ilike.%${debouncedSearch}%,celular.ilike.%${debouncedSearch}%`
          );
        }

        const { data, count, error } = await query
          .order("created_at", { ascending: false })
          .range(from, to);

        if (error) throw error;
        setClientesMostrador(data || []);
        setTotalFiltered(count || 0);
      } else {
        // Build query for Logística
        let query = supabase
          .from("clientes")
          .select("*", { count: "exact" })
          .like("codigo", "HPC%")
          .not("codigo", "like", "HPC-%");

        // Apply search filter
        if (debouncedSearch) {
          query = query.or(
            `codigo.ilike.%${debouncedSearch}%,nombre.ilike.%${debouncedSearch}%,nit.ilike.%${debouncedSearch}%,celular.ilike.%${debouncedSearch}%`
          );
        }

        const { data, count, error } = await query
          .order("nombre", { ascending: true })
          .range(from, to);

        if (error) throw error;
        setClientesLogistica(data || []);
        setTotalFiltered(count || 0);
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Error al cargar los clientes");
    } finally {
      setLoading(false);
    }
  };

  // Get current data based on active tab
  const currentClientes = activeTab === 'mostrador' ? clientesMostrador : clientesLogistica;
  const totalPages = Math.ceil(totalFiltered / itemsPerPage);

  const handleViewDetail = (cliente: Cliente) => {
    if (activeTab === 'mostrador') {
      navigate(`/mostrador/clientes/${cliente.codigo}`);
    } else {
      navigate(`/detalle-cliente/${cliente.codigo}`);
    }
  };

  const handleEdit = (cliente: Cliente) => {
    setEditingCliente({ ...cliente });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingCliente) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("clientes")
        .update({
          nombre: editingCliente.nombre,
          nit: editingCliente.nit,
          celular: editingCliente.celular,
          correo: editingCliente.correo,
          direccion: editingCliente.direccion,
          direccion_envio: editingCliente.direccion_envio,
          departamento: editingCliente.departamento,
          municipio: editingCliente.municipio,
          telefono_principal: editingCliente.telefono_principal,
          telefono_secundario: editingCliente.telefono_secundario,
          nombre_facturacion: editingCliente.nombre_facturacion,
        })
        .eq("id", editingCliente.id);

      if (error) throw error;

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

  const handleDeleteConfirm = (cliente: Cliente) => {
    setDeletingCliente(cliente);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingCliente) return;
    
    try {
      const { error } = await supabase
        .from("clientes")
        .delete()
        .eq("id", deletingCliente.id);

      if (error) throw error;

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
      {/* Header + Tabs in one section */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Gestión de Clientes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Administra los clientes de mostrador y logística
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <TabsList className="bg-transparent border-b border-border rounded-none h-auto p-0 gap-0">
              <TabsTrigger 
                value="mostrador" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-2.5 px-4 gap-2"
              >
                <Users className="h-4 w-4" />
                Mostrador
                <Badge variant="secondary" className="ml-1 text-xs">
                  {totalMostrador.toLocaleString()}
                </Badge>
              </TabsTrigger>
              <TabsTrigger 
                value="logistica" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-2.5 px-4 gap-2"
              >
                <Truck className="h-4 w-4" />
                Logística
                <Badge variant="secondary" className="ml-1 text-xs">
                  {totalLogistica.toLocaleString()}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {/* Search inline with tabs */}
            <div className="w-full sm:w-80">
              <OutlinedInput
                label="Buscar por código, nombre, NIT..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search className="h-4 w-4" />}
              />
            </div>
          </div>

          {/* Results info */}
          <div className="flex items-center justify-between mt-3 mb-2">
            <p className="text-sm text-muted-foreground">
              {totalFiltered.toLocaleString()} cliente{totalFiltered !== 1 ? 's' : ''} encontrado{totalFiltered !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Mostrador Tab */}
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
                  {currentClientes.map((cliente) => (
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
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleViewDetail(cliente)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(cliente)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteConfirm(cliente)}
                          >
                            <Trash2 className="h-4 w-4" />
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

        {/* Logistica Tab */}
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
                  {currentClientes.map((cliente) => (
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
                            {[cliente.municipio, cliente.departamento].filter(Boolean).join(', ')}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetail(cliente);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
      </div>

      {/* Pagination */}
      {totalFiltered > 0 && (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalFiltered}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(value) => {
            setItemsPerPage(value);
            setCurrentPage(1);
          }}
        />
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          
          {editingCliente && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2">
                <OutlinedInput
                  label="Código"
                  value={editingCliente.codigo}
                  disabled
                />
              </div>
              
              <OutlinedInput
                label="Nombre"
                value={editingCliente.nombre}
                onChange={(e) => setEditingCliente({ ...editingCliente, nombre: e.target.value })}
                required
              />
              
              <OutlinedInput
                label="NIT"
                value={editingCliente.nit}
                onChange={(e) => setEditingCliente({ ...editingCliente, nit: e.target.value })}
                required
              />
              
              <OutlinedInput
                label="Celular"
                value={editingCliente.celular}
                onChange={(e) => setEditingCliente({ ...editingCliente, celular: e.target.value })}
                required
              />
              
              <OutlinedInput
                label="Correo Electrónico"
                type="email"
                value={editingCliente.correo || ""}
                onChange={(e) => setEditingCliente({ ...editingCliente, correo: e.target.value })}
              />
              
              <OutlinedInput
                label="Teléfono Principal"
                value={editingCliente.telefono_principal || ""}
                onChange={(e) => setEditingCliente({ ...editingCliente, telefono_principal: e.target.value })}
              />
              
              <OutlinedInput
                label="Teléfono Secundario"
                value={editingCliente.telefono_secundario || ""}
                onChange={(e) => setEditingCliente({ ...editingCliente, telefono_secundario: e.target.value })}
              />
              
              <OutlinedInput
                label="Nombre Facturación"
                value={editingCliente.nombre_facturacion || ""}
                onChange={(e) => setEditingCliente({ ...editingCliente, nombre_facturacion: e.target.value })}
              />
              
              <OutlinedInput
                label="Departamento"
                value={editingCliente.departamento || ""}
                onChange={(e) => setEditingCliente({ ...editingCliente, departamento: e.target.value })}
              />
              
              <OutlinedInput
                label="Municipio"
                value={editingCliente.municipio || ""}
                onChange={(e) => setEditingCliente({ ...editingCliente, municipio: e.target.value })}
              />
              
              <div className="col-span-2">
                <OutlinedTextarea
                  label="Dirección"
                  value={editingCliente.direccion || ""}
                  onChange={(e) => setEditingCliente({ ...editingCliente, direccion: e.target.value })}
                />
              </div>
              
              <div className="col-span-2">
                <OutlinedTextarea
                  label="Dirección de Envío"
                  value={editingCliente.direccion_envio || ""}
                  onChange={(e) => setEditingCliente({ ...editingCliente, direccion_envio: e.target.value })}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el cliente{" "}
              <strong>{deletingCliente?.nombre}</strong> ({deletingCliente?.codigo}).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
