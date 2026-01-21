import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, Wrench, AlertCircle, CheckCircle2, Package } from "lucide-react";
import { toast } from "sonner";

type TipoResolucion = "REPARAR_EN_GARANTIA" | "PRESUPUESTO" | "CANJE" | "NOTA_DE_CREDITO";
type EstadoDiagnostico = "PENDIENTE" | "EN_PROGRESO" | "COMPLETADO";

interface Falla {
  id: number;
  nombre: string;
  familia_id: number | null;
}

interface Causa {
  id: number;
  nombre: string;
  familia_id: number | null;
}

interface DiagnosticoFormData {
  recomendaciones: string;
  es_reparable: boolean;
  aplica_garantia: boolean;
  tipo_resolucion: TipoResolucion | null;
  tipo_trabajo: string;
  fallas_seleccionadas: number[];
  causas_seleccionadas: number[];
}

const TIPOS_RESOLUCION: { value: TipoResolucion; label: string }[] = [
  { value: "REPARAR_EN_GARANTIA", label: "Reparar en Garantía" },
  { value: "PRESUPUESTO", label: "Presupuesto" },
  { value: "CANJE", label: "Canje" },
  { value: "NOTA_DE_CREDITO", label: "Nota de Crédito" },
];

const TIPOS_TRABAJO = [
  "Diagnóstico",
  "Reparación menor",
  "Reparación mayor",
  "Mantenimiento preventivo",
  "Cambio de piezas",
];

export default function DiagnosticoInicial() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const incidenteId = parseInt(id || "0");

  const [formData, setFormData] = useState<DiagnosticoFormData>({
    recomendaciones: "",
    es_reparable: true,
    aplica_garantia: false,
    tipo_resolucion: null,
    tipo_trabajo: "",
    fallas_seleccionadas: [],
    causas_seleccionadas: [],
  });

  // Fetch incidente
  const { data: incidente, isLoading: loadingIncidente } = useQuery({
    queryKey: ["incidente", incidenteId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("incidentes")
        .select(`
          id,
          codigo,
          estado,
          descripcion_problema,
          producto_id,
          cliente_id,
          productos:producto_id(id, nombre, modelo, codigo),
          clientes:cliente_id(id, nombre, codigo)
        `)
        .eq("id", incidenteId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!incidenteId,
  });

  // Fetch existing diagnostico
  const { data: diagnosticoExistente } = useQuery({
    queryKey: ["diagnostico", incidenteId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("diagnosticos")
        .select("*")
        .eq("incidente_id", incidenteId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!incidenteId,
  });

  // Fetch fallas
  const { data: fallas = [] } = useQuery({
    queryKey: ["fallas"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("fallas")
        .select("id, nombre, familia_id")
        .order("nombre");
      if (error) throw error;
      return data as Falla[];
    },
  });

  // Fetch causas
  const { data: causas = [] } = useQuery({
    queryKey: ["causas"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("causas")
        .select("id, nombre, familia_id")
        .order("nombre");
      if (error) throw error;
      return data as Causa[];
    },
  });

  // Load existing data if editing
  useEffect(() => {
    if (diagnosticoExistente) {
      setFormData({
        recomendaciones: diagnosticoExistente.recomendaciones || "",
        es_reparable: diagnosticoExistente.es_reparable ?? true,
        aplica_garantia: diagnosticoExistente.aplica_garantia ?? false,
        tipo_resolucion: diagnosticoExistente.tipo_resolucion,
        tipo_trabajo: diagnosticoExistente.tipo_trabajo || "",
        fallas_seleccionadas: [],
        causas_seleccionadas: [],
      });

      // Load fallas/causas associations
      loadAssociations(diagnosticoExistente.id);
    }
  }, [diagnosticoExistente]);

  const loadAssociations = async (diagnosticoId: number) => {
    const [fallasRes, causasRes] = await Promise.all([
      (supabase as any).from("diagnostico_fallas").select("falla_id").eq("diagnostico_id", diagnosticoId),
      (supabase as any).from("diagnostico_causas").select("causa_id").eq("diagnostico_id", diagnosticoId),
    ]);

    if (fallasRes.data) {
      setFormData(prev => ({
        ...prev,
        fallas_seleccionadas: fallasRes.data.map((f: any) => f.falla_id),
      }));
    }
    if (causasRes.data) {
      setFormData(prev => ({
        ...prev,
        causas_seleccionadas: causasRes.data.map((c: any) => c.causa_id),
      }));
    }
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      // Get tecnico_id from usuarios
      const { data: usuario } = await (supabase as any)
        .from("usuarios")
        .select("id")
        .eq("auth_uid", user.id)
        .single();

      if (!usuario) throw new Error("Usuario no encontrado");

      const diagnosticoData = {
        incidente_id: incidenteId,
        tecnico_id: usuario.id,
        recomendaciones: formData.recomendaciones || null,
        es_reparable: formData.es_reparable,
        aplica_garantia: formData.aplica_garantia,
        tipo_resolucion: formData.tipo_resolucion,
        tipo_trabajo: formData.tipo_trabajo || null,
        estado: "EN_PROGRESO" as EstadoDiagnostico,
        updated_at: new Date().toISOString(),
      };

      let diagnosticoId: number;

      if (diagnosticoExistente) {
        // Update existing
        const { error } = await (supabase as any)
          .from("diagnosticos")
          .update(diagnosticoData)
          .eq("id", diagnosticoExistente.id);
        if (error) throw error;
        diagnosticoId = diagnosticoExistente.id;
      } else {
        // Create new
        const { data, error } = await (supabase as any)
          .from("diagnosticos")
          .insert({ ...diagnosticoData, created_at: new Date().toISOString() })
          .select("id")
          .single();
        if (error) throw error;
        diagnosticoId = data.id;
      }

      // Update fallas associations
      await (supabase as any)
        .from("diagnostico_fallas")
        .delete()
        .eq("diagnostico_id", diagnosticoId);

      if (formData.fallas_seleccionadas.length > 0) {
        const fallasInsert = formData.fallas_seleccionadas.map(falla_id => ({
          diagnostico_id: diagnosticoId,
          falla_id,
        }));
        const { error: fallasError } = await (supabase as any)
          .from("diagnostico_fallas")
          .insert(fallasInsert);
        if (fallasError) throw fallasError;
      }

      // Update causas associations
      await (supabase as any)
        .from("diagnostico_causas")
        .delete()
        .eq("diagnostico_id", diagnosticoId);

      if (formData.causas_seleccionadas.length > 0) {
        const causasInsert = formData.causas_seleccionadas.map(causa_id => ({
          diagnostico_id: diagnosticoId,
          causa_id,
        }));
        const { error: causasError } = await (supabase as any)
          .from("diagnostico_causas")
          .insert(causasInsert);
        if (causasError) throw causasError;
      }

      return diagnosticoId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diagnostico", incidenteId] });
      queryClient.invalidateQueries({ queryKey: ["incidente", incidenteId] });
      toast.success("Diagnóstico guardado correctamente");
    },
    onError: (error: Error) => {
      toast.error(`Error al guardar: ${error.message}`);
    },
  });

  // Complete mutation
  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!diagnosticoExistente) {
        throw new Error("Debe guardar el diagnóstico antes de completarlo");
      }

      const { error } = await (supabase as any)
        .from("diagnosticos")
        .update({
          estado: "COMPLETADO" as EstadoDiagnostico,
          updated_at: new Date().toISOString(),
        })
        .eq("id", diagnosticoExistente.id);

      if (error) throw error;

      // Update incidente estado
      await (supabase as any)
        .from("incidentes")
        .update({
          estado: "DIAGNOSTICO_COMPLETADO",
          updated_at: new Date().toISOString(),
        })
        .eq("id", incidenteId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diagnostico", incidenteId] });
      queryClient.invalidateQueries({ queryKey: ["incidente", incidenteId] });
      toast.success("Diagnóstico completado");
      navigate(-1);
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const toggleFalla = (fallaId: number) => {
    setFormData(prev => ({
      ...prev,
      fallas_seleccionadas: prev.fallas_seleccionadas.includes(fallaId)
        ? prev.fallas_seleccionadas.filter(id => id !== fallaId)
        : [...prev.fallas_seleccionadas, fallaId],
    }));
  };

  const toggleCausa = (causaId: number) => {
    setFormData(prev => ({
      ...prev,
      causas_seleccionadas: prev.causas_seleccionadas.includes(causaId)
        ? prev.causas_seleccionadas.filter(id => id !== causaId)
        : [...prev.causas_seleccionadas, causaId],
    }));
  };

  if (loadingIncidente) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!incidente) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-muted-foreground">Incidente no encontrado</p>
            <Button className="mt-4" onClick={() => navigate(-1)}>Volver</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="h-6 w-6" />
            Diagnóstico Inicial
          </h1>
          <p className="text-muted-foreground">Incidente: {incidente.codigo}</p>
        </div>
        {diagnosticoExistente && (
          <Badge variant={diagnosticoExistente.estado === "COMPLETADO" ? "default" : "secondary"}>
            {diagnosticoExistente.estado}
          </Badge>
        )}
      </div>

      {/* Incidente Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            Información del Incidente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label className="text-muted-foreground text-sm">Producto</Label>
              <p className="font-medium">{incidente.productos?.nombre || "N/A"}</p>
              <p className="text-sm text-muted-foreground">{incidente.productos?.codigo}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Cliente</Label>
              <p className="font-medium">{incidente.clientes?.nombre || "N/A"}</p>
              <p className="text-sm text-muted-foreground">{incidente.clientes?.codigo}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Estado</Label>
              <Badge variant="outline">{incidente.estado}</Badge>
            </div>
          </div>
          {incidente.descripcion_problema && (
            <div className="mt-4">
              <Label className="text-muted-foreground text-sm">Problema Reportado</Label>
              <p className="text-sm mt-1">{incidente.descripcion_problema}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diagnóstico Form */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Fallas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fallas Detectadas</CardTitle>
            <CardDescription>Seleccione las fallas encontradas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {fallas.map((falla) => (
                <div key={falla.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`falla-${falla.id}`}
                    checked={formData.fallas_seleccionadas.includes(falla.id)}
                    onCheckedChange={() => toggleFalla(falla.id)}
                  />
                  <label
                    htmlFor={`falla-${falla.id}`}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {falla.nombre}
                  </label>
                </div>
              ))}
              {fallas.length === 0 && (
                <p className="text-sm text-muted-foreground">No hay fallas registradas</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Causas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Causas Identificadas</CardTitle>
            <CardDescription>Seleccione las causas de las fallas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {causas.map((causa) => (
                <div key={causa.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`causa-${causa.id}`}
                    checked={formData.causas_seleccionadas.includes(causa.id)}
                    onCheckedChange={() => toggleCausa(causa.id)}
                  />
                  <label
                    htmlFor={`causa-${causa.id}`}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {causa.nombre}
                  </label>
                </div>
              ))}
              {causas.length === 0 && (
                <p className="text-sm text-muted-foreground">No hay causas registradas</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resolution Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resolución y Recomendaciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Switches */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="es_reparable">¿Es reparable?</Label>
                <Switch
                  id="es_reparable"
                  checked={formData.es_reparable}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, es_reparable: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="aplica_garantia">¿Aplica garantía?</Label>
                <Switch
                  id="aplica_garantia"
                  checked={formData.aplica_garantia}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, aplica_garantia: checked }))}
                />
              </div>
            </div>

            {/* Selects */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Resolución</Label>
                <Select
                  value={formData.tipo_resolucion || ""}
                  onValueChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    tipo_resolucion: value as TipoResolucion 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_RESOLUCION.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Trabajo</Label>
                <Select
                  value={formData.tipo_trabajo}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, tipo_trabajo: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_TRABAJO.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {tipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Recomendaciones */}
          <div className="space-y-2">
            <Label htmlFor="recomendaciones">Recomendaciones</Label>
            <Textarea
              id="recomendaciones"
              placeholder="Describa las recomendaciones para la reparación..."
              value={formData.recomendaciones}
              onChange={(e) => setFormData(prev => ({ ...prev, recomendaciones: e.target.value }))}
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4 justify-end">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Cancelar
        </Button>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Guardando..." : "Guardar"}
        </Button>
        <Button
          variant="default"
          onClick={() => completeMutation.mutate()}
          disabled={completeMutation.isPending || !diagnosticoExistente}
          className="bg-green-600 hover:bg-green-700"
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          {completeMutation.isPending ? "Completando..." : "Completar Diagnóstico"}
        </Button>
      </div>
    </div>
  );
}
