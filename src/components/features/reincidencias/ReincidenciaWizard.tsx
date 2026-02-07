import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MinimalStepper, type StepperStep } from "@/components/ui/minimal-stepper";
import { Search, GitCompare, Scale, ArrowLeft, ArrowRight, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

import { PasoSeleccion } from "./PasoSeleccion";
import { PasoComparacion } from "./PasoComparacion";
import { PasoDecision } from "./PasoDecision";
import type { WizardData, IncidenteParaVerificar, IncidenteHistorial, MotivoNoReingreso } from "./types";
import { mycsapi } from "@/mics-api";

const STEPS: StepperStep[] = [
  { id: 1, title: "Selección", description: "Buscar incidente", icon: <Search /> },
  { id: 2, title: "Comparación", description: "Historial del cliente", icon: <GitCompare /> },
  { id: 3, title: "Decisión", description: "Determinar resultado", icon: <Scale /> },
];

const initialData: WizardData = {
  incidenteActual: null,
  incidentesHistorial: [],
  incidenteAnteriorId: null,
  filtroMismoProducto: false,
  esReincidencia: null,
  aplicaReingreso: null,
  motivoNoReingreso: null,
  justificacion: "",
  evidenciasUrls: [],
};

export function ReincidenciaWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<WizardData>(initialData);
  const [saving, setSaving] = useState(false);

  // Step navigation validation
  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 1:
        return data.incidenteActual !== null;
      case 2:
        // Can proceed even without selecting previous (means no previous incident)
        return true;
      case 3:
        // Need decision and justification
        return (
          data.esReincidencia !== null &&
          (data.esReincidencia === false || data.aplicaReingreso !== null) &&
          data.justificacion.length >= 20 &&
          (data.esReincidencia === true && data.aplicaReingreso === true
            ? true
            : data.motivoNoReingreso !== null)
        );
      default:
        return false;
    }
  }, [currentStep, data]);

  // Update handlers
  const handleIncidenteChange = useCallback((incidente: IncidenteParaVerificar | null) => {
    setData((prev) => ({
      ...prev,
      incidenteActual: incidente,
      incidentesHistorial: [], // Reset history when incident changes
      incidenteAnteriorId: null,
    }));
  }, []);

  const handleHistorialChange = useCallback((historial: IncidenteHistorial[]) => {
    setData((prev) => ({ ...prev, incidentesHistorial: historial }));
  }, []);

  const handleAnteriorChange = useCallback((id: number | null) => {
    setData((prev) => ({ ...prev, incidenteAnteriorId: id }));
  }, []);

  const handleFiltroChange = useCallback((value: boolean) => {
    setData((prev) => ({ ...prev, filtroMismoProducto: value }));
  }, []);

  const handleEsReincidenciaChange = useCallback((value: boolean | null) => {
    setData((prev) => ({ ...prev, esReincidencia: value }));
  }, []);

  const handleAplicaReingresoChange = useCallback((value: boolean | null) => {
    setData((prev) => ({ ...prev, aplicaReingreso: value }));
  }, []);

  const handleMotivoChange = useCallback((value: MotivoNoReingreso | null) => {
    setData((prev) => ({ ...prev, motivoNoReingreso: value }));
  }, []);

  const handleJustificacionChange = useCallback((value: string) => {
    setData((prev) => ({ ...prev, justificacion: value }));
  }, []);

  // Navigation
  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Save verification
  const handleSave = async () => {
    if (!data.incidenteActual || !user) {
      toast.error("Datos incompletos para guardar");
      return;
    }

    setSaving(true);
    try {
      const incidenteAnterior = data.incidentesHistorial.find(
        (i) => i.id === data.incidenteAnteriorId
      );

      // Get verificado_por ID - convert to number if string
      const verificadorId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;

      await mycsapi.post("/api/v1/verificaciones-reincidencia", { body: {
        incidente_id: data.incidenteActual.id,
        incidente_anterior_id: data.incidenteAnteriorId || undefined,
        es_reincidencia: data.esReincidencia!,
        aplica_reingreso: data.aplicaReingreso || undefined,
        motivo_no_reingreso: data.motivoNoReingreso || undefined,
        justificacion: data.justificacion,
        evidencias_urls: data.evidenciasUrls,
        problema_actual: data.incidenteActual.descripcion_problema || undefined,
        problema_anterior: incidenteAnterior?.descripcion_problema || undefined,
        dias_desde_reparacion: incidenteAnterior?.dias_desde_reparacion || undefined,
        verificado_por: verificadorId,
      } as any });

      // If approved, update incident with origen_id
      if (data.esReincidencia && data.aplicaReingreso && data.incidenteAnteriorId) {
        await mycsapi.patch("/api/v1/incidentes/{incidente_id}", { path: { incidente_id: data.incidenteActual.id }, body: {
            incidente_origen_id: data.incidenteAnteriorId,
            aplica_garantia: true,
          } as any });
      }

      toast.success("Verificación guardada exitosamente");
      navigate("/calidad/reincidencias");
    } catch (error) {
      console.error("Error guardando verificación:", error);
      toast.error("Error al guardar la verificación");
    } finally {
      setSaving(false);
    }
  };

  // Get selected previous incident for step 3
  const incidenteAnteriorSeleccionado = useMemo(() => {
    return data.incidentesHistorial.find((i) => i.id === data.incidenteAnteriorId) || null;
  }, [data.incidentesHistorial, data.incidenteAnteriorId]);

  return (
    <div className="space-y-6">
      {/* Header with Stepper */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Verificación de Reincidencias</CardTitle>
        </CardHeader>
        <CardContent>
          <MinimalStepper steps={STEPS} currentStep={currentStep} />
        </CardContent>
      </Card>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {currentStep === 1 && (
          <PasoSeleccion
            incidenteActual={data.incidenteActual}
            onIncidenteChange={handleIncidenteChange}
          />
        )}

        {currentStep === 2 && data.incidenteActual && (
          <PasoComparacion
            incidenteActual={data.incidenteActual}
            incidentesHistorial={data.incidentesHistorial}
            incidenteAnteriorId={data.incidenteAnteriorId}
            filtroMismoProducto={data.filtroMismoProducto}
            onHistorialChange={handleHistorialChange}
            onAnteriorChange={handleAnteriorChange}
            onFiltroChange={handleFiltroChange}
          />
        )}

        {currentStep === 3 && data.incidenteActual && (
          <PasoDecision
            incidenteActual={data.incidenteActual}
            incidenteAnterior={incidenteAnteriorSeleccionado}
            esReincidencia={data.esReincidencia}
            aplicaReingreso={data.aplicaReingreso}
            motivoNoReingreso={data.motivoNoReingreso}
            justificacion={data.justificacion}
            onEsReincidenciaChange={handleEsReincidenciaChange}
            onAplicaReingresoChange={handleAplicaReingresoChange}
            onMotivoChange={handleMotivoChange}
            onJustificacionChange={handleJustificacionChange}
          />
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>

        {currentStep < 3 ? (
          <Button onClick={handleNext} disabled={!canProceed}>
            Siguiente
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSave}
            disabled={!canProceed || saving}
            className="bg-green-600 hover:bg-green-700"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saving ? "Guardando..." : "Guardar Verificación"}
          </Button>
        )}
      </div>
    </div>
  );
}
