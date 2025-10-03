import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Wrench, Clock, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StatusBadge } from "@/components/StatusBadge";
import type { Database } from "@/integrations/supabase/types";

type IncidenteDB = Database['public']['Tables']['incidentes']['Row'];

export default function Asignaciones() {
  const navigate = useNavigate();
  const [incidentes, setIncidentes] = useState<IncidenteDB[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIncidentes();
  }, []);

  const fetchIncidentes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .in('status', ['Ingresado', 'En diagnostico', 'Reparado'])
        .order('fecha_ingreso', { ascending: false });

      if (error) throw error;
      setIncidentes(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar incidentes');
    } finally {
      setLoading(false);
    }
  };

  const handleAsignar = async (incidenteId: string) => {
    try {
      const { error } = await supabase
        .from('incidentes')
        .update({ status: 'En diagnostico' })
        .eq('id', incidenteId);

      if (error) throw error;
      
      toast.success('Incidente asignado');
      fetchIncidentes();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al asignar');
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Wrench className="h-8 w-8 text-primary" />
          Asignaciones de Taller
        </h1>
        <p className="text-muted-foreground mt-2">
          Incidentes pendientes de diagnóstico y reparación
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              Ingresados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {incidentes.filter(i => i.status === 'Ingresado').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wrench className="h-4 w-4 text-blue-500" />
              En Diagnóstico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {incidentes.filter(i => i.status === 'En diagnostico').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Reparados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {incidentes.filter(i => i.status === 'Reparado').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Incidentes Asignables</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Cargando...</p>
            </div>
          ) : incidentes.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay incidentes pendientes</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Problema</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Garantía</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidentes.map((inc) => (
                  <TableRow 
                    key={inc.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/incidentes/${inc.id}`)}
                  >
                    <TableCell className="font-medium">{inc.codigo}</TableCell>
                    <TableCell>
                      {new Date(inc.fecha_ingreso).toLocaleDateString('es-GT')}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {inc.descripcion_problema}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{inc.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {inc.cobertura_garantia ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Sí
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-red-100 text-red-800">
                          No
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {inc.status === 'Ingresado' && (
                        <Button
                          size="sm"
                          onClick={() => handleAsignar(inc.id)}
                        >
                          Asignarme
                        </Button>
                      )}
                      {inc.status === 'En diagnostico' && (
                        <Badge variant="outline" className="bg-blue-50">
                          Asignado
                        </Badge>
                      )}
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