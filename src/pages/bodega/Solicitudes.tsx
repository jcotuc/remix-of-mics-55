import { useState, useEffect } from "react";
import { ShoppingCart, Clock, CheckCircle, XCircle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type Solicitud = {
  id: string;
  incidente_codigo: string;
  repuesto_codigo: string;
  repuesto_descripcion: string;
  cantidad: number;
  estado: "pendiente" | "aprobada" | "entregada" | "rechazada";
  fecha_solicitud: string;
  tecnico: string;
};

export default function Solicitudes() {
  const navigate = useNavigate();
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSolicitudes();
  }, []);

  const fetchSolicitudes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('incidentes')
        .select('codigo, status')
        .in('status', ['Repuestos solicitados', 'Diagnostico']);

      if (error) throw error;

      // Simular solicitudes de repuestos
      const solicitudesSimuladas: Solicitud[] = (data || []).slice(0, 10).map((inc, idx) => ({
        id: `SOL-${String(idx + 1).padStart(6, '0')}`,
        incidente_codigo: inc.codigo,
        repuesto_codigo: `REP-${Math.floor(Math.random() * 1000)}`,
        repuesto_descripcion: `Repuesto para ${inc.codigo}`,
        cantidad: Math.floor(Math.random() * 5) + 1,
        estado: idx % 4 === 0 ? "pendiente" : idx % 4 === 1 ? "aprobada" : idx % 4 === 2 ? "entregada" : "rechazada",
        fecha_solicitud: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        tecnico: `Técnico ${idx + 1}`
      }));

      setSolicitudes(solicitudesSimuladas);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  };

  const handleAprobar = (id: string) => {
    setSolicitudes(prev => prev.map(s =>
      s.id === id ? { ...s, estado: "aprobada" as const } : s
    ));
    toast.success('Solicitud aprobada');
  };

  const handleRechazar = (id: string) => {
    setSolicitudes(prev => prev.map(s =>
      s.id === id ? { ...s, estado: "rechazada" as const } : s
    ));
    toast.success('Solicitud rechazada');
  };

  const handleEntregar = (id: string) => {
    setSolicitudes(prev => prev.map(s =>
      s.id === id ? { ...s, estado: "entregada" as const } : s
    ));
    toast.success('Repuesto entregado');
  };

  const getEstadoBadge = (estado: Solicitud['estado']) => {
    switch (estado) {
      case "pendiente":
        return <Badge className="bg-orange-500"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>;
      case "aprobada":
        return <Badge className="bg-blue-500"><CheckCircle className="h-3 w-3 mr-1" />Aprobada</Badge>;
      case "entregada":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Entregada</Badge>;
      case "rechazada":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rechazada</Badge>;
    }
  };

  const pendientes = solicitudes.filter(s => s.estado === "pendiente").length;
  const aprobadas = solicitudes.filter(s => s.estado === "aprobada").length;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ShoppingCart className="h-8 w-8 text-primary" />
          Solicitudes de Repuestos
        </h1>
        <p className="text-muted-foreground mt-2">
          Gestión de solicitudes del taller
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendientes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-500" />
              Aprobadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aprobadas}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-green-500" />
              Total Solicitudes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{solicitudes.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Solicitudes</CardTitle>
          <CardDescription>
            {solicitudes.length} solicitudes registradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Incidente</TableHead>
                  <TableHead>Repuesto</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {solicitudes.map((solicitud) => (
                  <TableRow key={solicitud.id}>
                    <TableCell className="font-medium">{solicitud.id}</TableCell>
                    <TableCell>
                      <Button
                        variant="link"
                        className="p-0 h-auto"
                        onClick={() => navigate(`/incidentes/${solicitud.incidente_codigo}`)}
                      >
                        {solicitud.incidente_codigo}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{solicitud.repuesto_codigo}</p>
                        <p className="text-xs text-muted-foreground">{solicitud.repuesto_descripcion}</p>
                      </div>
                    </TableCell>
                    <TableCell>{solicitud.cantidad}</TableCell>
                    <TableCell>{solicitud.tecnico}</TableCell>
                    <TableCell>{new Date(solicitud.fecha_solicitud).toLocaleDateString('es-GT')}</TableCell>
                    <TableCell>{getEstadoBadge(solicitud.estado)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {solicitud.estado === "pendiente" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleAprobar(solicitud.id)}
                            >
                              Aprobar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRechazar(solicitud.id)}
                            >
                              Rechazar
                            </Button>
                          </>
                        )}
                        {solicitud.estado === "aprobada" && (
                          <Button
                            size="sm"
                            className="bg-green-500 hover:bg-green-600"
                            onClick={() => handleEntregar(solicitud.id)}
                          >
                            Entregar
                          </Button>
                        )}
                      </div>
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
