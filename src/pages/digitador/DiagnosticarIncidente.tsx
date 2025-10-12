import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { DiagnosticoTecnico } from "@/components/DiagnosticoTecnico";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";

export default function DiagnosticarIncidente() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incidente, setIncidente] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIncidente();
  }, [id]);

  const fetchIncidente = async () => {
    try {
      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setIncidente(data);
    } catch (error) {
      console.error('Error:', error);
      toast.error("Error al cargar el incidente");
    } finally {
      setLoading(false);
    }
  };

  const handleDiagnosticoCompleto = () => {
    toast.success("Diagnóstico completado exitosamente");
    navigate('/digitador/pendientes');
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
        <Button onClick={() => navigate('/digitador/pendientes')}>
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/digitador/pendientes')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Digitalizar Diagnóstico</h1>
            <p className="text-muted-foreground">Código: {incidente.codigo}</p>
          </div>
        </div>
        <StatusBadge status={incidente.status} />
      </div>

      <DiagnosticoTecnico
        incidente={incidente}
        onDiagnosticoCompleto={handleDiagnosticoCompleto}
        modoDigitador={true}
      />
    </div>
  );
}
