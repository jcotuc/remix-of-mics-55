import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Search } from "lucide-react";
import { TablePagination } from "@/components/shared";

interface Cliente {
  id: string;
  codigo: string;
  nombre: string;
  nit: string;
  celular: string;
  direccion?: string;
  correo?: string;
  telefono_principal?: string;
}

export default function ClientesLogistica() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  useEffect(() => {
    fetchClientes();
  }, []);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("nombre");

      if (error) throw error;
      
      const clientesExcel = (data || []).filter(c => 
        c.codigo.startsWith('HPC') && !c.codigo.includes('-')
      );
      
      console.log(`Total clientes en DB: ${data?.length}, Clientes Excel: ${clientesExcel.length}`);
      
      setClientes(clientesExcel);
    } catch (error) {
      console.error("Error fetching clientes:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClientes = useMemo(() => {
    return clientes.filter(
      (cliente) =>
        cliente.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cliente.nit.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cliente.celular.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [clientes, searchTerm]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredClientes.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClientes = filteredClientes.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Clientes</CardTitle>
          <CardDescription>Consulta de información de clientes ({filteredClientes.length} registros)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Buscar por código, nombre, NIT o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? (
            <p className="text-center text-muted-foreground">Cargando clientes...</p>
          ) : (
            <>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>NIT</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Dirección</TableHead>
                      <TableHead>Correo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedClientes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No se encontraron clientes
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedClientes.map((cliente) => (
                        <TableRow 
                          key={cliente.id}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => navigate(`/detalle-cliente/${cliente.codigo}`)}
                        >
                          <TableCell className="font-medium">{cliente.codigo}</TableCell>
                          <TableCell>{cliente.nombre}</TableCell>
                          <TableCell>{cliente.nit}</TableCell>
                          <TableCell>{cliente.celular}</TableCell>
                          <TableCell>{cliente.direccion || "-"}</TableCell>
                          <TableCell>{cliente.correo || "-"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {filteredClientes.length > 0 && (
                <TablePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredClientes.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={(value) => {
                    setItemsPerPage(value);
                    setCurrentPage(1);
                  }}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
