/**
 * AuditoriaWizard - Main wizard component with stepper
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiBackendAction } from "@/lib/api-backend";
import { Button } from "@/components/ui/button";
import { MinimalStepper, StepperStep } from "@/components/ui/minimal-stepper";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Save, Loader2, FileText, Clipboard, Wrench, CheckCircle } from "lucide-react";
import { PasoIncidente } from "./PasoIncidente";
import { PasoDocumental } from "./PasoDocumental";
import { PasoFisica } from "./PasoFisica";
import { PasoValidacion } from "./PasoValidacion";
import type { AuditoriaFormData, IncidenteParaAuditoria, WizardStep } from "./types";

const STEPS: StepperStep[] = [
  { id: 0, title: "Incidente", icon: <FileText className="w-5 h-5" /> },
  { id: 1, title: "Documental", icon: <Clipboard className="w-5 h-5" /> },
  { id: 2, title: "Física", icon: <Wrench className="w-5 h-5" /> },
  { id: 3, title: "Validación", icon: <CheckCircle className="w-5 h-5" /> },
];

export function AuditoriaWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<AuditoriaFormData>({
    incidente_id: null,
    clasificacion: null,
    tipo_auditoria_modalidad: null,
    tipologia_reparacion: null,
    familia_producto_id: null,
    centro_servicio_id: null,
    observaciones: "",
    resultado: null,
    evidencias_urls: [],
  });

  const [incidenteSeleccionado, setIncidenteSeleccionado] = useState<IncidenteParaAuditoria | null>(null);
  const [respuestasDocumentales, setRespuestasDocumentales] = useState<Record<number, string>>({});
  const [respuestasFisicas, setRespuestasFisicas] = useState<Record<number, string>>({});
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);

  const handleFormDataChange = (data: Partial<AuditoriaFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const handleRespuestaDocumentalChange = (preguntaId: number, respuesta: string) => {
    setRespuestasDocumentales((prev) => ({ ...prev, [preguntaId]: respuesta }));
  };

  const handleRespuestaFisicaChange = (preguntaId: number, respuesta: string) => {
    setRespuestasFisicas((prev) => ({ ...prev, [preguntaId]: respuesta }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: // incidente
        return formData.incidente_id && formData.clasificacion && formData.tipo_auditoria_modalidad;
      case 1: // documental
        return Object.keys(respuestasDocumentales).length > 0;
      case 2: // fisica
        // Can proceed even without physical questions (optional for some families)
        return true;
      case 3: // validacion
        return formData.resultado !== null;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = async () => {
    if (!formData.incidente_id || !formData.resultado) {
      toast.error("Complete todos los campos requeridos");
      return;
    }

    setSaving(true);
    try {
      // 1. Create auditoria record
      const auditoriaData = {
        incidente_id: formData.incidente_id,
        fecha_auditoria: new Date().toISOString(),
        tecnico_responsable: "AUDITOR", // Will be updated when auth is integrated
        resultado: formData.resultado === "APRUEBA" ? "aprobado" : "rechazado",
        clasificacion: formData.clasificacion,
        tipo_auditoria_modalidad: formData.tipo_auditoria_modalidad,
        familia_producto_id: formData.familia_producto_id,
        tipologia_reparacion: formData.tipologia_reparacion,
        observaciones: formData.observaciones || null,
        updated_at: new Date().toISOString(),
      };

      const auditoria = await apiBackendAction("auditorias_calidad.create", auditoriaData) as { id: number };

      // 2. Save all responses
      const allRespuestas = [
        ...Object.entries(respuestasDocumentales).map(([preguntaId, respuesta]) => ({
          pregunta_id: Number(preguntaId),
          respuesta,
        })),
        ...Object.entries(respuestasFisicas).map(([preguntaId, respuesta]) => ({
          pregunta_id: Number(preguntaId),
          respuesta,
        })),
      ];

      if (allRespuestas.length > 0) {
        await apiBackendAction("auditoria_respuestas.createBatch", {
          auditoria_id: auditoria.id,
          respuestas: allRespuestas,
        });
      }

      toast.success("Auditoría registrada exitosamente");
      navigate("/calidad/auditorias");
    } catch (error) {
      console.error("Error saving auditoria:", error);
      toast.error("Error al guardar la auditoría");
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0: // incidente
        return (
          <PasoIncidente
            formData={formData}
            onFormDataChange={handleFormDataChange}
            incidenteSeleccionado={incidenteSeleccionado}
            onIncidenteChange={setIncidenteSeleccionado}
          />
        );
      case 1: // documental
        return (
          <PasoDocumental
            respuestas={respuestasDocumentales}
            onRespuestaChange={handleRespuestaDocumentalChange}
          />
        );
      case 2: // fisica
        return (
          <PasoFisica
            familiaProductoId={formData.familia_producto_id}
            respuestas={respuestasFisicas}
            onRespuestaChange={handleRespuestaFisicaChange}
          />
        );
      case 3: // validacion
        return (
          <PasoValidacion
            formData={formData}
            onFormDataChange={handleFormDataChange}
            incidente={incidenteSeleccionado}
            respuestasCount={{
              documentales: Object.keys(respuestasDocumentales).length,
              fisicas: Object.keys(respuestasFisicas).length,
            }}
            mediaFiles={mediaFiles}
            onMediaChange={setMediaFiles}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header with Stepper */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-6">Nueva Auditoría de Calidad</h1>
        <MinimalStepper
          steps={STEPS}
          currentStep={currentStep}
        />
      </div>

      {/* Step Content */}
      <div className="mb-8">
        {renderStep()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-4 border-t">
        <Button
          variant="outline"
          onClick={currentStep === 0 ? () => navigate("/calidad/auditorias") : handleBack}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {currentStep === 0 ? "Cancelar" : "Anterior"}
        </Button>

        {currentStep < STEPS.length - 1 ? (
          <Button onClick={handleNext} disabled={!canProceed()}>
            Siguiente
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={saving || !canProceed()}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Auditoría
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
