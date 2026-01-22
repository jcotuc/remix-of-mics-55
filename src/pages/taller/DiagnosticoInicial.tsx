import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, AlertCircle, CheckCircle2, Plus, RotateCcw, AlertTriangle, Check, X } from "lucide-react";
import { toast } from "sonner";
import { apiBackendAction } from "@/lib/api-backend";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const { user } = useAuth();
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

  // Fetch incidente using apiBackendAction
  const { data: incidente, isLoading: loadingIncidente } = useQuery({
    queryKey: ["incidente", incidenteId],
    queryFn: async () => {
      const result = await apiBackendAction("incidentes.get", { id: incidenteId });
      return result.result;
    },
    enabled: !!incidenteId,
  });

  // Fetch existing diagnostico using apiBackendAction
  const { data: diagnosticoExistente } = useQuery({
    queryKey: ["diagnostico", incidenteId],
    queryFn: async () => {
      const result = await apiBackendAction("diagnosticos.search", { incidente_id: incidenteId });
      return result.results?.[0] || null;
    },
    enabled: !!incidenteId,
  });

  // Fetch fallas using apiBackendAction
  const { data: fallas = [] } = useQuery({
    queryKey: ["fallas"],
    queryFn: async () => {
      const result = await apiBackendAction("fallas.list", {});
      return (result.results || []) as Falla[];
    },
  });

  // Fetch causas using apiBackendAction
  const { data: causas = [] } = useQuery({
    queryKey: ["causas"],
    queryFn: async () => {
      const result = await apiBackendAction("causas.list", {});
      return (result.results || []) as Causa[];
    },
  });

  // Load existing data if editing
  useEffect(() => {
    if (diagnosticoExistente) {
      setFormData({
        recomendaciones: diagnosticoExistente.recomendaciones || "",
        es_reparable: diagnosticoExistente.es_reparable ?? true,
        aplica_garantia: diagnosticoExistente.aplica_garantia ?? false,
        tipo_resolucion: diagnosticoExistente.tipo_resolucion as TipoResolucion,
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
      apiBackendAction("diagnostico_fallas.list", { diagnostico_id: diagnosticoId }),
      apiBackendAction("diagnostico_causas.list", { diagnostico_id: diagnosticoId }),
    ]);

    if (fallasRes.results) {
      setFormData(prev => ({
        ...prev,
        fallas_seleccionadas: fallasRes.results.map((f: any) => f.falla_id),
      }));
    }
    if (causasRes.results) {
      setFormData(prev => ({
        ...prev,
        causas_seleccionadas: causasRes.results.map((c: any) => c.causa_id),
      }));
    }
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Get current user from auth context
      if (!user) throw new Error("No autenticado");

      // Get tecnico_id from usuarios via apiBackendAction
      const { results: usuarioResults } = await apiBackendAction("usuarios.search", { auth_uid: user.id });
      const usuario = usuarioResults?.[0] as { id: number } | undefined;

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
        // Update existing via apiBackendAction
        await apiBackendAction("diagnosticos.update", {
          id: diagnosticoExistente.id,
          data: diagnosticoData
        } as any);
        diagnosticoId = diagnosticoExistente.id;
      } else {
        // Create new via apiBackendAction
        const result = await apiBackendAction("diagnosticos.create", {
          ...diagnosticoData,
          created_at: new Date().toISOString()
        } as any);
        diagnosticoId = (result as any).id;
      }

      // Update fallas associations via apiBackendAction
      await apiBackendAction("diagnostico_fallas.deleteByDiagnostico", { diagnostico_id: diagnosticoId });

      if (formData.fallas_seleccionadas.length > 0) {
        const fallasInsert = formData.fallas_seleccionadas.map(falla_id => ({
          diagnostico_id: diagnosticoId,
          falla_id,
        }));
        await apiBackendAction("diagnostico_fallas.createBatch", fallasInsert as any);
      }

      // Update causas associations via apiBackendAction
      await apiBackendAction("diagnostico_causas.deleteByDiagnostico", { diagnostico_id: diagnosticoId });

      if (formData.causas_seleccionadas.length > 0) {
        const causasInsert = formData.causas_seleccionadas.map(causa_id => ({
          diagnostico_id: diagnosticoId,
          causa_id,
        }));
        await apiBackendAction("diagnostico_causas.createBatch", causasInsert as any);
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

      // Update diagnostico via apiBackendAction
      await apiBackendAction("diagnosticos.update", {
        id: diagnosticoExistente.id,
        data: {
          estado: "COMPLETADO" as EstadoDiagnostico,
          updated_at: new Date().toISOString(),
        }
      } as any);

      // Update incidente estado via apiBackendAction
      await apiBackendAction("incidentes.update", {
        id: incidenteId,
        data: {
          estado: "DIAGNOSTICO_COMPLETADO",
          updated_at: new Date().toISOString(),
        }
      } as any);
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

  // Check if product is discontinued (placeholder logic)
  const isDiscontinued = incidente?.producto?.codigo?.includes("DISC");

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
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <Button variant="outline" size="sm" className="gap-2 text-orange-600 border-orange-300 hover:bg-orange-50">
          <RotateCcw className="h-4 w-4" />
          Desasignar
        </Button>
      </div>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Diagnóstico Técnico</h1>
        <p className="text-sm text-orange-500">Incidente: {incidente.codigo}</p>
      </div>

      {/* Información del Incidente */}
      <Card className="border-orange-200 bg-orange-50/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-foreground">
            <CheckCircle2 className="h-5 w-5 text-orange-500" />
            Información del Incidente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Product Image */}
            <div className="w-full md:w-48 h-40 bg-white rounded-lg border flex items-center justify-center overflow-hidden">
              {incidente.producto?.url_foto ? (
                <img 
                  src={incidente.producto.url_foto} 
                  alt={incidente.producto.descripcion || "Producto"} 
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="text-muted-foreground text-sm text-center p-4">
                  Sin imagen
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="flex-1 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Descripción de la Máquina</p>
                  <p className="font-semibold text-foreground">
                    {incidente.producto?.descripcion || incidente.producto?.codigo || "N/A"}
                  </p>
                </div>
                {isDiscontinued && (
                  <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Descontinuado
                  </Badge>
                )}
              </div>

              {isDiscontinued && (
                <div className="bg-orange-100 border border-orange-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-orange-800">Producto Descontinuado</p>
                      <p className="text-xs text-orange-700">
                        Este producto está descontinuado. Puedes intentar repararlo, pero si no hay repuestos disponibles, deberás optar por un Canje o Porcentaje.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p className="text-sm font-medium">{incidente.cliente?.codigo || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Código Producto</p>
                  <p className="text-sm font-medium">{incidente.producto?.codigo || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Familia ID</p>
                  <p className="text-sm font-medium">{String(incidente.producto?.familia_id ?? "N/A")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Clave</p>
                  <p className="text-sm font-medium">{incidente.producto?.clave || incidente.producto?.sku || "N/A"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Problem Description */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Descripción del Problema (Cliente)</p>
            <div className="bg-white border rounded-lg p-3">
              <p className="text-sm">{incidente.descripcion_problema || "Sin descripción"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Paso 1: Diagnóstico */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4">Paso 1: Diagnóstico</h2>
          
          <div className="grid gap-6 md:grid-cols-2">
            {/* Fallas */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-orange-600">Fallas</h3>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <ScrollArea className="h-64 border rounded-lg p-2">
                <div className="space-y-2">
                  {fallas.map((falla) => (
                    <div
                      key={falla.id}
                      onClick={() => toggleFalla(falla.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        formData.fallas_seleccionadas.includes(falla.id)
                          ? "bg-orange-50 border-orange-300"
                          : "bg-white hover:bg-muted/50"
                      }`}
                    >
                      <Checkbox
                        checked={formData.fallas_seleccionadas.includes(falla.id)}
                        onCheckedChange={() => toggleFalla(falla.id)}
                        className="pointer-events-none"
                      />
                      <span className="text-sm flex-1">{falla.nombre}</span>
                    </div>
                  ))}
                  {fallas.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No hay fallas registradas</p>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Causas */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-orange-600">Causas</h3>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <ScrollArea className="h-64 border rounded-lg p-2">
                <div className="space-y-2">
                  {causas.map((causa) => (
                    <div
                      key={causa.id}
                      onClick={() => toggleCausa(causa.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        formData.causas_seleccionadas.includes(causa.id)
                          ? "bg-orange-50 border-orange-300"
                          : "bg-white hover:bg-muted/50"
                      }`}
                    >
                      <Checkbox
                        checked={formData.causas_seleccionadas.includes(causa.id)}
                        onCheckedChange={() => toggleCausa(causa.id)}
                        className="pointer-events-none"
                      />
                      <span className="text-sm flex-1">{causa.nombre}</span>
                    </div>
                  ))}
                  {causas.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No hay causas registradas</p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* ¿Es Reparable? */}
          <div className="mt-6">
            <Label className="text-sm font-medium mb-3 block">¿Es Reparable?</Label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, es_reparable: true }))}
                className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                  formData.es_reparable
                    ? "bg-green-50 border-green-500 text-green-700"
                    : "bg-white border-muted hover:border-muted-foreground/50"
                }`}
              >
                <Check className="h-5 w-5" />
                <span className="font-medium">Sí</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, es_reparable: false }))}
                className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                  !formData.es_reparable
                    ? "bg-red-50 border-red-500 text-red-700"
                    : "bg-white border-muted hover:border-muted-foreground/50"
                }`}
              >
                <X className="h-5 w-5" />
                <span className="font-medium">No</span>
              </button>
            </div>
          </div>

          {/* ¿Aplica Garantía? */}
          <div className="mt-6">
            <Label className="text-sm font-medium mb-3 block">¿Aplica Garantía?</Label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, aplica_garantia: true }))}
                className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                  formData.aplica_garantia
                    ? "bg-green-50 border-green-500 text-green-700"
                    : "bg-white border-muted hover:border-muted-foreground/50"
                }`}
              >
                <Check className="h-5 w-5" />
                <span className="font-medium">Sí</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, aplica_garantia: false }))}
                className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                  !formData.aplica_garantia
                    ? "bg-red-50 border-red-500 text-red-700"
                    : "bg-white border-muted hover:border-muted-foreground/50"
                }`}
              >
                <X className="h-5 w-5" />
                <span className="font-medium">No</span>
              </button>
            </div>
          </div>

          {/* Tipo de Resolución */}
          <div className="mt-6 grid gap-4 md:grid-cols-2">
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
                  <SelectValue placeholder="Seleccionar..." />
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
                  <SelectValue placeholder="Seleccionar..." />
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

          {/* Recomendaciones */}
          <div className="mt-6 space-y-2">
            <Label htmlFor="recomendaciones">Recomendaciones</Label>
            <Textarea
              id="recomendaciones"
              placeholder="Ingrese las recomendaciones técnicas..."
              value={formData.recomendaciones}
              onChange={(e) => setFormData(prev => ({ ...prev, recomendaciones: e.target.value }))}
              rows={4}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? "Guardando..." : "Guardar Diagnóstico"}
            </Button>

            {diagnosticoExistente && diagnosticoExistente.estado !== "COMPLETADO" && (
              <Button
                variant="default"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {completeMutation.isPending ? "Completando..." : "Completar Diagnóstico"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
