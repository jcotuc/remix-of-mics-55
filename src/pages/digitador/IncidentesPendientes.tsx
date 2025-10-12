import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Search, Edit, Calendar, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";

type IncidentePendiente = {
  id: string;
  codigo: string;
  status: string;
  codigo_producto: string;
  codigo_cliente: string;
  codigo_tecnico: string;
  fecha_ingreso: string;
  descripcion_problema: string;
  familia_producto: string;
  centro_servicio: string;
  producto_descripcion?: string;
  cliente_nombre?: string;
  tecnico_nombre?: string;
};

export default function IncidentesPendientes() {
  const navigate = useNavigate();
  const [incidentes, setIncidentes] = useState<IncidentePendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchIncidentesPendientes();
  }, []);

  const fetchIncidentesPendientes = async () => {
    try {
      // Buscar incidentes que están "En diagnostico" o con diagnóstico en estado borrador
      const { data: incData, error: incError } = await supabase
        .from('incidentes')
        .select('*')
        .in('status', ['En diagnostico', 'Pendiente por repuestos', 'Presupuesto', 'Porcentaje'])
        .order('fecha_ingreso', { ascending: false });

      if (incError) throw incError;

      // Obtener información adicional de productos, clientes y técnicos
      const incidentesConInfo = await Promise.all(
        (incData || []).map(async (inc) => {
          const [productoRes, clienteRes, tecnicoRes] = await Promise.all([
            supabase.from('productos').select('descripcion').eq('codigo', inc.codigo_producto).maybeSingle(),
            supabase.from('clientes').select('nombre').eq('codigo', inc.codigo_cliente).maybeSingle(),
            inc.codigo_tecnico 
              ? supabase.from('tecnicos').select('nombre, apellido').eq('codigo', inc.codigo_tecnico).maybeSingle()
              : Promise.resolve({ data: null })
          ]);

          return {
            ...inc,
            producto_descripcion: productoRes.data?.descripcion,
            cliente_nombre: clienteRes.data?.nombre,
            tecnico_nombre: tecnicoRes.data 
              ? `${tecnicoRes.data.nombre} ${tecnicoRes.data.apellido}`
              : 'Sin asignar'
          };
        })
      );

      setIncidentes(incidentesConInfo);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredIncidentes = incidentes.filter(inc =>
    inc.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inc.codigo_producto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inc.codigo_cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inc.producto_descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inc.cliente_nombre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Incidentes Pendientes de Digitalizar
          </h1>
          <p className="text-muted-foreground mt-1">
            Completa los diagnósticos ingresados por los técnicos
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, producto, cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={fetchIncidentesPendientes} variant="outline">
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Cargando...</p>
          ) : filteredIncidentes.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No hay incidentes pendientes de digitalizar
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead>Centro Servicio</TableHead>
                  <TableHead>Fecha Ingreso</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncidentes.map((inc) => (
                  <TableRow key={inc.id}>
                    <TableCell className="font-medium">{inc.codigo}</TableCell>
                    <TableCell>
                      <StatusBadge status={inc.status as any} />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{inc.codigo_producto}</p>
                        <p className="text-xs text-muted-foreground">
                          {inc.producto_descripcion}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{inc.codigo_cliente}</p>
                        <p className="text-xs text-muted-foreground">
                          {inc.cliente_nombre}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{inc.tecnico_nombre}</span>
                      </div>
                    </TableCell>
                    <TableCell>{inc.centro_servicio || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {new Date(inc.fecha_ingreso).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => navigate(`/digitador/diagnosticar/${inc.id}`)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Digitalizar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
