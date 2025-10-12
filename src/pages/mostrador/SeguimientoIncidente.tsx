import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Package, User, Calendar, MapPin, FileText, DollarSign, CheckCircle2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";


export default function SeguimientoIncidente() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incidente, setIncidente] = useState<any>(null);
  const [cliente, setCliente] = useState<any>(null);
  const [producto, setProducto] = useState<any>(null);
  const [tecnico, setTecnico] = useState<any>(null);
  const [repuestos, setRepuestos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      // Fetch incident
      const { data: incData, error: incError } = await supabase
        .from('incidentes')
        .select('*')
        .eq('id', id)
        .single();

      if (incError) throw incError;
      setIncidente(incData);

      // Fetch client
      if (incData.codigo_cliente) {
        const { data: clienteData } = await supabase
          .from('clientes')
          .select('*')
          .eq('codigo', incData.codigo_cliente)
          .single();
        setCliente(clienteData);
      }

      // Fetch product
      if (incData.codigo_producto) {
        const { data: prodData } = await supabase
          .from('productos')
          .select('*')
          .eq('codigo', incData.codigo_producto)
          .single();
        setProducto(prodData);
      }

      // Fetch technician
      if (incData.codigo_tecnico) {
        const { data: tecData } = await supabase
          .from('tecnicos')
          .select('*')
          .eq('codigo', incData.codigo_tecnico)
          .single();
        setTecnico(tecData);
      }

      // Fetch spare parts (if any are referenced in the incident)
      // This would depend on your data structure
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <p>Cargando...</p>
      </div>
    );
  }

  if (!incidente) {
    return (
      <div className="container mx-auto p-6">
        <p>Incidente no encontrado</p>
        <Button onClick={() => navigate(-1)}>Volver</Button>
      </div>
    );
  }

  const getStatusProgress = (status: string) => {
    const statuses = [
      "Ingresado",
      "En ruta",
      "Pendiente de diagnostico",
      "En diagnostico",
      "Pendiente por repuestos",
      "Presupuesto",
      "Porcentaje",
      "Reparado"
    ];
    const index = statuses.indexOf(status);
    return index >= 0 ? ((index + 1) / statuses.length) * 100 : 0;
  };

  const progress = getStatusProgress(incidente.status);

  const esPresupuestoOCanje = ["Presupuesto", "Porcentaje", "Cambio por garantia"].includes(incidente.status);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Seguimiento de Incidente</h1>
            <p className="text-muted-foreground">Código: {incidente.codigo}</p>
          </div>
        </div>
        <Button onClick={handlePrint} variant="outline">
          <Printer className="w-4 h-4 mr-2" />
          Imprimir
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Estado Actual */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Estado Actual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <StatusBadge status={incidente.status} />
              <span className="text-sm text-muted-foreground">
                {Math.round(progress)}% completado
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-muted rounded-full h-3">
              <div 
                className="bg-primary h-3 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
              <div>
                <p className="text-sm text-muted-foreground">Fecha de Ingreso</p>
                <p className="font-medium">
                  {new Date(incidente.fecha_ingreso).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Centro de Servicio</p>
                <p className="font-medium">{incidente.centro_servicio || 'No especificado'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tipología</p>
                <p className="font-medium">{incidente.tipologia || 'No especificado'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Garantía</p>
                <p className="font-medium">
                  {incidente.cobertura_garantia ? 'Sí' : 'No'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
