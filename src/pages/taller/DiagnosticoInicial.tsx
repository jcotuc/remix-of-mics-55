import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FALLAS_COMUNES, CAUSAS_COMUNES } from "@/data/diagnosticoOptions";
import { Textarea } from "@/components/ui/textarea";

export default function DiagnosticoInicial() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incidente, setIncidente] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [fallasSeleccionadas, setFallasSeleccionadas] = useState<string[]>([]);
  const [causasSeleccionadas, setCausasSeleccionadas] = useState<string[]>([]);
  const [otraFalla, setOtraFalla] = useState("");
  const [otraCausa, setOtraCausa] = useState("");
  const [fotosUrls, setFotosUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

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

      // Load existing diagnostic if any
      const { data: diagnostico } = await supabase
        .from('diagnosticos')
        .select('*')
        .eq('incidente_id', id)
        .maybeSingle();

      if (diagnostico) {
        setFallasSeleccionadas(diagnostico.fallas || []);
        setCausasSeleccionadas(diagnostico.causas || []);
        setFotosUrls(diagnostico.fotos_urls || []);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error("Error al cargar el incidente");
    } finally {
      setLoading(false);
    }
  };

  const handleFallaToggle = (falla: string) => {
    setFallasSeleccionadas(prev =>
      prev.includes(falla)
        ? prev.filter(f => f !== falla)
        : [...prev, falla]
    );
  };

  const handleCausaToggle = (causa: string) => {
    setCausasSeleccionadas(prev =>
      prev.includes(causa)
        ? prev.filter(c => c !== causa)
        : [...prev, causa]
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${id}/${Date.now()}-${Math.random()}.${fileExt}`;

        const { error: uploadError, data } = await supabase.storage
          .from('incident-photos')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('incident-photos')
          .getPublicUrl(fileName);

        newUrls.push(publicUrl);
      }

      setFotosUrls(prev => [...prev, ...newUrls]);
      toast.success("Fotos subidas exitosamente");
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error("Error al subir las fotos");
    } finally {
      setUploading(false);
    }
  };

  const guardarBorrador = async () => {
    const todasFallas = [...fallasSeleccionadas];
    if (otraFalla.trim()) todasFallas.push(otraFalla.trim());

    const todasCausas = [...causasSeleccionadas];
    if (otraCausa.trim()) todasCausas.push(otraCausa.trim());

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data: profile } = await supabase
        .from('profiles')
        .select('nombre, apellido')
        .eq('user_id', user.id)
        .maybeSingle();

      const tecnicoCodigo = profile ? `${profile.nombre} ${profile.apellido}` : user.email || 'Técnico';

      const diagnosticoData = {
        incidente_id: id,
        tecnico_codigo: tecnicoCodigo,
        fallas: todasFallas,
        causas: todasCausas,
        fotos_urls: fotosUrls,
        estado: 'borrador'
      };

      const { data: existing } = await supabase
        .from('diagnosticos')
        .select('id')
        .eq('incidente_id', id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('diagnosticos')
          .update(diagnosticoData)
          .eq('id', existing.id);
      } else {
        await supabase
          .from('diagnosticos')
          .insert(diagnosticoData);
      }

      toast.success("Borrador guardado");
    } catch (error) {
      console.error('Error:', error);
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const finalizarDiagnostico = async () => {
    const todasFallas = [...fallasSeleccionadas];
    if (otraFalla.trim()) todasFallas.push(otraFalla.trim());

    const todasCausas = [...causasSeleccionadas];
    if (otraCausa.trim()) todasCausas.push(otraCausa.trim());

    if (todasFallas.length === 0 || todasCausas.length === 0) {
      toast.error("Debes seleccionar al menos una falla y una causa");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data: profile } = await supabase
        .from('profiles')
        .select('nombre, apellido')
        .eq('user_id', user.id)
        .maybeSingle();

      const tecnicoCodigo = profile ? `${profile.nombre} ${profile.apellido}` : user.email || 'Técnico';

      const diagnosticoData = {
        incidente_id: id,
        tecnico_codigo: tecnicoCodigo,
        fallas: todasFallas,
        causas: todasCausas,
        fotos_urls: fotosUrls,
        estado: 'pendiente_digitacion'
      };

      const { data: existing } = await supabase
        .from('diagnosticos')
        .select('id')
        .eq('incidente_id', id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('diagnosticos')
          .update(diagnosticoData)
          .eq('id', existing.id);
      } else {
        await supabase
          .from('diagnosticos')
          .insert(diagnosticoData);
      }

      await supabase
        .from('incidentes')
        .update({ status: 'En diagnostico' })
        .eq('id', id);

      toast.success("Diagnóstico enviado para digitalización");
      navigate('/taller/mis-asignaciones');
    } catch (error) {
      console.error('Error:', error);
      toast.error("Error al finalizar diagnóstico");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto p-6">Cargando...</div>;
  }

  if (!incidente) {
    return (
      <div className="container mx-auto p-6">
        <p>Incidente no encontrado</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate('/taller/mis-asignaciones')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Diagnóstico Inicial</h1>
          <p className="text-muted-foreground">Incidente: {incidente.codigo}</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Fallas Encontradas */}
        <Card>
          <CardHeader>
            <CardTitle>Fallas Encontradas *</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {FALLAS_COMUNES.map((falla) => (
                <div key={falla} className="flex items-center space-x-2">
                  <Checkbox
                    id={`falla-${falla}`}
                    checked={fallasSeleccionadas.includes(falla)}
                    onCheckedChange={() => handleFallaToggle(falla)}
                  />
                  <Label
                    htmlFor={`falla-${falla}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {falla}
                  </Label>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Label htmlFor="otra-falla">Otra falla (especificar)</Label>
              <Textarea
                id="otra-falla"
                placeholder="Describe otra falla no listada..."
                value={otraFalla}
                onChange={(e) => setOtraFalla(e.target.value)}
                className="mt-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Causas */}
        <Card>
          <CardHeader>
            <CardTitle>Causas Identificadas *</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {CAUSAS_COMUNES.map((causa) => (
                <div key={causa} className="flex items-center space-x-2">
                  <Checkbox
                    id={`causa-${causa}`}
                    checked={causasSeleccionadas.includes(causa)}
                    onCheckedChange={() => handleCausaToggle(causa)}
                  />
                  <Label
                    htmlFor={`causa-${causa}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {causa}
                  </Label>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Label htmlFor="otra-causa">Otra causa (especificar)</Label>
              <Textarea
                id="otra-causa"
                placeholder="Describe otra causa no listada..."
                value={otraCausa}
                onChange={(e) => setOtraCausa(e.target.value)}
                className="mt-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Fotos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Fotos del Diagnóstico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="fotos-diagnostico">Subir fotos</Label>
                <input
                  id="fotos-diagnostico"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="mt-2 block w-full text-sm text-muted-foreground
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary file:text-primary-foreground
                    hover:file:bg-primary/90
                    cursor-pointer"
                />
              </div>

              {fotosUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-4 mt-4">
                  {fotosUrls.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={guardarBorrador}
            disabled={saving}
          >
            Guardar Borrador
          </Button>
          <Button
            onClick={finalizarDiagnostico}
            disabled={saving}
            className="gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Finalizar y Enviar a Digitación
          </Button>
        </div>
      </div>
    </div>
  );
}
