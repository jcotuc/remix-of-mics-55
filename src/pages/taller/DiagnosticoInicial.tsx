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
    <div className="container mx-auto p-6 max-w-6xl animate-fade-in">
      {/* Modern Header */}
      <div className="mb-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/taller/mis-asignaciones')}
          className="mb-4 hover:bg-secondary/10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Mis Asignaciones
        </Button>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Diagnóstico Técnico
            </h1>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">Incidente:</span>
              <span className="px-3 py-1 bg-secondary text-secondary-foreground rounded-lg font-semibold">
                {incidente.codigo}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
              <Camera className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Fallas Encontradas - Modern Design */}
        <Card className="border-l-4 border-l-primary hover-lift">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <span className="text-primary font-bold">1</span>
              </div>
              Fallas Encontradas
              <span className="text-destructive text-sm">*</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              {FALLAS_COMUNES.map((falla) => (
                <label
                  key={falla}
                  className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    fallasSeleccionadas.includes(falla)
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <Checkbox
                    id={`falla-${falla}`}
                    checked={fallasSeleccionadas.includes(falla)}
                    onCheckedChange={() => handleFallaToggle(falla)}
                    className="data-[state=checked]:bg-primary"
                  />
                  <span className="text-sm font-medium">{falla}</span>
                </label>
              ))}
            </div>
            <div className="pt-4 border-t">
              <Label htmlFor="otra-falla" className="text-base font-semibold mb-2 block">
                ¿Otra falla no listada?
              </Label>
              <Textarea
                id="otra-falla"
                placeholder="Describe detalladamente la falla encontrada..."
                value={otraFalla}
                onChange={(e) => setOtraFalla(e.target.value)}
                className="min-h-[100px] resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Causas - Modern Design */}
        <Card className="border-l-4 border-l-secondary hover-lift">
          <CardHeader className="bg-gradient-to-r from-secondary/5 to-transparent">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <div className="w-8 h-8 bg-secondary/10 rounded-lg flex items-center justify-center">
                <span className="text-secondary font-bold">2</span>
              </div>
              Causas Identificadas
              <span className="text-destructive text-sm">*</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              {CAUSAS_COMUNES.map((causa) => (
                <label
                  key={causa}
                  className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    causasSeleccionadas.includes(causa)
                      ? 'border-secondary bg-secondary/5 shadow-sm'
                      : 'border-border hover:border-secondary/50 hover:bg-muted/50'
                  }`}
                >
                  <Checkbox
                    id={`causa-${causa}`}
                    checked={causasSeleccionadas.includes(causa)}
                    onCheckedChange={() => handleCausaToggle(causa)}
                    className="data-[state=checked]:bg-secondary"
                  />
                  <span className="text-sm font-medium">{causa}</span>
                </label>
              ))}
            </div>
            <div className="pt-4 border-t">
              <Label htmlFor="otra-causa" className="text-base font-semibold mb-2 block">
                ¿Otra causa no listada?
              </Label>
              <Textarea
                id="otra-causa"
                placeholder="Describe detalladamente la causa identificada..."
                value={otraCausa}
                onChange={(e) => setOtraCausa(e.target.value)}
                className="min-h-[100px] resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Fotos - Modern Design */}
        <Card className="border-l-4 border-l-primary/50 hover-lift">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Camera className="w-4 h-4 text-primary" />
              </div>
              Evidencia Fotográfica
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-center w-full">
                <label 
                  htmlFor="fotos-diagnostico" 
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer bg-muted/30 hover:bg-muted/50 border-muted-foreground/25 hover:border-primary/50 transition-all duration-200"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Camera className="w-10 h-10 mb-3 text-muted-foreground" />
                    <p className="mb-2 text-sm font-semibold text-muted-foreground">
                      <span className="text-primary">Click para subir</span> o arrastra las fotos
                    </p>
                    <p className="text-xs text-muted-foreground">JPG, PNG o WEBP</p>
                  </div>
                  <input
                    id="fotos-diagnostico"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>

              {uploading && (
                <div className="text-center py-4">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="text-sm text-muted-foreground mt-2">Subiendo fotos...</p>
                </div>
              )}

              {fotosUrls.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  {fotosUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Evidencia ${index + 1}`}
                        className="w-full h-32 object-cover rounded-xl border-2 border-border shadow-md group-hover:shadow-xl transition-shadow duration-200"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-xl transition-colors duration-200"></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions - Modern Sticky Bottom */}
        <div className="sticky bottom-6 z-10">
          <Card className="border-2 shadow-xl bg-card/95 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex gap-3 justify-end items-center">
                <div className="mr-auto text-sm text-muted-foreground">
                  {fallasSeleccionadas.length > 0 && causasSeleccionadas.length > 0 ? (
                    <span className="flex items-center gap-2 text-success">
                      <CheckCircle2 className="w-4 h-4" />
                      Listo para enviar
                    </span>
                  ) : (
                    <span>
                      Selecciona al menos 1 falla y 1 causa
                    </span>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={guardarBorrador}
                  disabled={saving}
                  size="lg"
                >
                  Guardar Borrador
                </Button>
                <Button
                  variant="default"
                  onClick={finalizarDiagnostico}
                  disabled={saving || (fallasSeleccionadas.length === 0 && !otraFalla.trim()) || (causasSeleccionadas.length === 0 && !otraCausa.trim())}
                  className="gap-2"
                  size="lg"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Finalizar y Enviar a Digitación
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
