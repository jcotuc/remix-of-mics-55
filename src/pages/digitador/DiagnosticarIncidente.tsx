import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, AlertTriangle } from "lucide-react";
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
  const [digitadorAsignado, setDigitadorAsignado] = useState<string | null>(null);

  useEffect(() => {
    fetchIncidente();
  }, [id]);

  const asignarDigitador = async () => {
    if (!id) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('nombre, apellido')
        .eq('user_id', user.id)
        .maybeSingle();

      const codigoDigitador = profile ? `${profile.nombre} ${profile.apellido}` : user.email;

      // Check if there's a diagnostico for this incident
      const { data: diagnostico } = await supabase
        .from('diagnosticos')
        .select('id, digitador_asignado')
        .eq('incidente_id', id)
        .maybeSingle();

      if (diagnostico) {
        // If already assigned to someone else, show warning
        if (diagnostico.digitador_asignado && diagnostico.digitador_asignado !== codigoDigitador) {
          setDigitadorAsignado(diagnostico.digitador_asignado);
          toast.error(`Este incidente ya está siendo trabajado por ${diagnostico.digitador_asignado}`);
          return;
        }

        // Assign to current digitador
        await supabase
          .from('diagnosticos')
          .update({
            digitador_asignado: codigoDigitador,
            fecha_inicio_digitacion: new Date().toISOString()
          })
          .eq('id', diagnostico.id);
      }
    } catch (error) {
      console.error('Error asignando digitador:', error);
    }
  };

  const fetchIncidente = async () => {
    try {
      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setIncidente(data);
      
      // Assign digitador after loading incident
      await asignarDigitador();
    } catch (error) {
      console.error('Error:', error);
      toast.error("Error al cargar el incidente");
    } finally {
      setLoading(false);
    }
  };

  const handleDiagnosticoCompleto = async () => {
    // Clear digitador assignment
    try {
      const { data: diagnostico } = await supabase
        .from('diagnosticos')
        .select('id')
        .eq('incidente_id', id)
        .maybeSingle();

      if (diagnostico) {
        await supabase
          .from('diagnosticos')
          .update({
            digitador_asignado: null,
            fecha_inicio_digitacion: null
          })
          .eq('id', diagnostico.id);
      }
    } catch (error) {
      console.error('Error clearing digitador assignment:', error);
    }

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

  if (digitadorAsignado) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
          <p className="text-lg font-medium mb-2">
            Este incidente ya está siendo trabajado
          </p>
          <p className="text-muted-foreground mb-4">
            {digitadorAsignado} está digitalizando este diagnóstico
          </p>
          <Button onClick={() => navigate('/digitador/pendientes')}>
            Volver a Pendientes
          </Button>
        </div>
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
