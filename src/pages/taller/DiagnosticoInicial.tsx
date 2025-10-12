import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, CheckCircle2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
  
  // Paso 1: Fallas, Causas, Garantía, Resolución
  const [fallas, setFallas] = useState<string[]>([]);
  const [causas, setCausas] = useState<string[]>([]);
  const [otraFalla, setOtraFalla] = useState("");
  const [otraCausa, setOtraCausa] = useState("");
  const [aplicaGarantia, setAplicaGarantia] = useState<boolean | null>(null);
  const [tipoResolucion, setTipoResolucion] = useState<string>("");
  
  // Paso 2: Solicitud de Repuestos
  const [necesitaRepuestos, setNecesitaRepuestos] = useState(false);
  const [estadoSolicitud, setEstadoSolicitud] = useState<string>("");
  
  // Paso 3: Fotos y Observaciones
  const [fotos, setFotos] = useState<File[]>([]);
  const [observaciones, setObservaciones] = useState("");
  
  // Control de pasos
  const [paso, setPaso] = useState(1);

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

  const resolucionesConGarantia = [
    "Reparar en Garantía",
    "Cambio por Garantía",
    "Nota de Crédito"
  ];
  
  const resolucionesSinGarantia = [
    "Canje",
    "Presupuesto"
  ];

  const opcionesResolucion = aplicaGarantia 
    ? resolucionesConGarantia 
    : resolucionesSinGarantia;

  // Determinar si necesita repuestos según el tipo de resolución
  useEffect(() => {
    if (tipoResolucion === "Reparar en Garantía" || tipoResolucion === "Presupuesto") {
      setNecesitaRepuestos(true);
    } else {
      setNecesitaRepuestos(false);
    }
  }, [tipoResolucion]);

  const handleContinuarAPaso2 = () => {
    if (fallas.length === 0) {
      toast.error("Debes seleccionar al menos una falla");
      return;
    }

    if (causas.length === 0) {
      toast.error("Debes seleccionar al menos una causa");
      return;
    }

    if (aplicaGarantia === null) {
      toast.error("Debes indicar si aplica garantía");
      return;
    }

    if (!tipoResolucion) {
      toast.error("Debes seleccionar un tipo de resolución");
      return;
    }

    // Si necesita repuestos, ir al paso 2, si no, ir directo al paso 3
    if (necesitaRepuestos) {
      setPaso(2);
    } else {
      setPaso(3);
    }
  };

  const handleFinalizarDiagnostico = async () => {
    setSaving(true);
    try {
      // Subir fotos si hay
      let fotosUrls: string[] = [];
      if (fotos.length > 0) {
        fotosUrls = await Promise.all(
          fotos.map(async (foto) => {
            const fileName = `${id}/diagnostico/${Date.now()}-${foto.name}`;
            const { data, error } = await supabase.storage
              .from("incident-photos")
              .upload(fileName, foto);
            
            if (error) throw error;
            
            const { data: { publicUrl } } = supabase.storage
              .from("incident-photos")
              .getPublicUrl(fileName);
            
            return publicUrl;
          })
        );
      }

      const diagnosticoData = {
        incidente_id: id,
        tecnico_codigo: "TEC-001",
        fallas: [...fallas, ...(otraFalla ? [otraFalla] : [])],
        causas: [...causas, ...(otraCausa ? [otraCausa] : [])],
        fotos_urls: fotosUrls,
        recomendaciones: observaciones,
        estado: "completado",
      };

      const { error: diagnosticoError } = await supabase
        .from("diagnosticos")
        .insert(diagnosticoData);

      if (diagnosticoError) throw diagnosticoError;

      // Actualizar el incidente
      const { error: incidenteError } = await supabase
        .from("incidentes")
        .update({
          status: "En diagnostico",
          cobertura_garantia: aplicaGarantia,
        })
        .eq("id", id);

      if (incidenteError) throw incidenteError;

      toast.success("Diagnóstico finalizado exitosamente");
      navigate("/taller/mis-asignaciones");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al finalizar el diagnóstico");
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
    <div className="container mx-auto p-6 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => navigate("/taller/mis-asignaciones")}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Volver
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">Diagnóstico Técnico</h1>
        <p className="text-muted-foreground">Incidente: {incidente.codigo}</p>
      </div>

      {/* Información del Incidente */}
      <Card className="mb-6 border-l-4 border-l-primary">
        <CardHeader className="bg-primary/5">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Información del Incidente
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground">Cliente</Label>
              <p className="text-base font-medium">{incidente.codigo_cliente}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Producto</Label>
              <p className="text-base font-medium">{incidente.codigo_producto}</p>
            </div>
            {incidente.sku_maquina && (
              <div>
                <Label className="text-sm text-muted-foreground">SKU de la Máquina</Label>
                <p className="text-base font-medium">{incidente.sku_maquina}</p>
              </div>
            )}
            {incidente.familia_producto && (
              <div>
                <Label className="text-sm text-muted-foreground">Familia del Producto</Label>
                <p className="text-base font-medium">{incidente.familia_producto}</p>
              </div>
            )}
            {incidente.accesorios && (
              <div className="md:col-span-2">
                <Label className="text-sm text-muted-foreground">Accesorios Incluidos</Label>
                <p className="text-base">{incidente.accesorios}</p>
              </div>
            )}
            <div className="md:col-span-2">
              <Label className="text-sm text-muted-foreground">Descripción del Problema (Cliente)</Label>
              <p className="text-base bg-muted p-3 rounded-md mt-1">{incidente.descripcion_problema}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>
            {paso === 1 && "Paso 1: Diagnóstico - Fallas y Causas"}
            {paso === 2 && "Paso 2: Solicitud de Repuestos"}
            {paso === 3 && "Paso 3: Fotos y Observaciones"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {paso === 1 && (
            <>
              {/* Fallas */}
              <div className="space-y-4">
                <div>
                  <Label className="text-lg font-semibold">Fallas Encontradas</Label>
                  <p className="text-sm text-muted-foreground">
                    Selecciona todas las fallas que apliquen
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {FALLAS_COMUNES.map((falla) => (
                    <label
                      key={falla}
                      className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        fallas.includes(falla)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Checkbox
                        checked={fallas.includes(falla)}
                        onCheckedChange={() => {
                          setFallas((prev) =>
                            prev.includes(falla)
                              ? prev.filter((f) => f !== falla)
                              : [...prev, falla]
                          );
                        }}
                      />
                      <span className="text-sm">{falla}</span>
                    </label>
                  ))}
                </div>
                <div>
                  <Label>Otra falla no listada</Label>
                  <Textarea
                    value={otraFalla}
                    onChange={(e) => setOtraFalla(e.target.value)}
                    placeholder="Describe la falla..."
                    rows={3}
                  />
                </div>
              </div>

              <Separator />

              {/* Causas */}
              <div className="space-y-4">
                <div>
                  <Label className="text-lg font-semibold">Causas Identificadas</Label>
                  <p className="text-sm text-muted-foreground">
                    Selecciona todas las causas que apliquen
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {CAUSAS_COMUNES.map((causa) => (
                    <label
                      key={causa}
                      className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        causas.includes(causa)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Checkbox
                        checked={causas.includes(causa)}
                        onCheckedChange={() => {
                          setCausas((prev) =>
                            prev.includes(causa)
                              ? prev.filter((c) => c !== causa)
                              : [...prev, causa]
                          );
                        }}
                      />
                      <span className="text-sm">{causa}</span>
                    </label>
                  ))}
                </div>
                <div>
                  <Label>Otra causa no listada</Label>
                  <Textarea
                    value={otraCausa}
                    onChange={(e) => setOtraCausa(e.target.value)}
                    placeholder="Describe la causa..."
                    rows={3}
                  />
                </div>
              </div>

              <Separator />

              {/* Aplica Garantía */}
              <div className="space-y-4">
                <div>
                  <Label className="text-lg font-semibold">¿Aplica Garantía?</Label>
                  <p className="text-sm text-muted-foreground">
                    Indica si esta reparación está cubierta por garantía
                  </p>
                </div>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={aplicaGarantia === true ? "default" : "outline"}
                    onClick={() => {
                      setAplicaGarantia(true);
                      setTipoResolucion("");
                    }}
                  >
                    Sí, aplica garantía
                  </Button>
                  <Button
                    type="button"
                    variant={aplicaGarantia === false ? "default" : "outline"}
                    onClick={() => {
                      setAplicaGarantia(false);
                      setTipoResolucion("");
                    }}
                  >
                    No aplica garantía
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Tipo de Resolución */}
              {aplicaGarantia !== null && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-lg font-semibold">Tipo de Resolución</Label>
                    <p className="text-sm text-muted-foreground">
                      Selecciona cómo se resolverá este incidente
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {opcionesResolucion.map((opcion) => (
                      <Button
                        key={opcion}
                        type="button"
                        variant={tipoResolucion === opcion ? "default" : "outline"}
                        onClick={() => setTipoResolucion(opcion)}
                        className="justify-start h-auto py-3"
                      >
                        {opcion}
                      </Button>
                    ))}
                  </div>
                  {tipoResolucion === "Presupuesto" && necesitaRepuestos && (
                    <div className="bg-muted p-3 rounded-md text-sm">
                      <p className="text-muted-foreground">
                        <strong>Nota:</strong> Los repuestos se despacharán una vez que el cliente realice el pago del presupuesto.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {paso === 2 && (
            <div className="space-y-4">
              <div>
                <Label className="text-lg font-semibold">Solicitud de Repuestos</Label>
                <p className="text-sm text-muted-foreground">
                  Agrega los repuestos necesarios para la reparación
                </p>
              </div>
              
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-2">Solicitud de Repuestos</p>
                <p className="text-sm text-muted-foreground">
                  Estado: {estadoSolicitud || "Sin solicitud"}
                </p>
                <Button variant="outline" className="mt-4">
                  Agregar Repuestos
                </Button>
              </div>
            </div>
          )}

          {paso === 3 && (
            <>
              <div className="space-y-4">
                <div>
                  <Label className="text-lg font-semibold">Fotos del Diagnóstico</Label>
                  <p className="text-sm text-muted-foreground">
                    Evidencia fotográfica del diagnóstico realizado
                  </p>
                </div>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setFotos(prev => [...prev, ...files]);
                  }}
                />
                {fotos.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {fotos.length} foto(s) seleccionada(s)
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <Label className="text-lg font-semibold">Observaciones del Técnico</Label>
                  <p className="text-sm text-muted-foreground">
                    Comentarios adicionales sobre el diagnóstico
                  </p>
                </div>
                <Textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Escribe aquí cualquier observación relevante..."
                  rows={6}
                />
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-between gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (paso > 1) {
                setPaso(paso - 1);
              } else {
                navigate("/taller/mis-asignaciones");
              }
            }}
          >
            {paso === 1 ? "Cancelar" : "Anterior"}
          </Button>
          <Button 
            onClick={() => {
              if (paso === 1) {
                handleContinuarAPaso2();
              } else if (paso === 2) {
                setPaso(3);
              } else {
                handleFinalizarDiagnostico();
              }
            }}
            disabled={saving}
          >
            {paso === 3 ? (saving ? "Guardando..." : "Finalizar Diagnóstico") : "Continuar"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
