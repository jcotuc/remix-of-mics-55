import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { Scale, CheckCircle, XCircle, AlertTriangle, FileText } from "lucide-react";
import { MOTIVOS_NO_REINGRESO, PERIODO_GARANTIA_DIAS } from "./types";
import type { IncidenteParaVerificar, IncidenteHistorial, MotivoNoReingreso } from "./types";

interface PasoDecisionProps {
  incidenteActual: IncidenteParaVerificar;
  incidenteAnterior: IncidenteHistorial | null;
  esReincidencia: boolean | null;
  aplicaReingreso: boolean | null;
  motivoNoReingreso: MotivoNoReingreso | null;
  justificacion: string;
  onEsReincidenciaChange: (value: boolean | null) => void;
  onAplicaReingresoChange: (value: boolean | null) => void;
  onMotivoChange: (value: MotivoNoReingreso | null) => void;
  onJustificacionChange: (value: string) => void;
}

export function PasoDecision({
  incidenteActual,
  incidenteAnterior,
  esReincidencia,
  aplicaReingreso,
  motivoNoReingreso,
  justificacion,
  onEsReincidenciaChange,
  onAplicaReingresoChange,
  onMotivoChange,
  onJustificacionChange,
}: PasoDecisionProps) {
  return (
    <div className="space-y-6">
      {/* Summary of comparison */}
      {incidenteAnterior && (
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            Comparando <strong>{incidenteActual.codigo}</strong> con{" "}
            <strong>{incidenteAnterior.codigo}</strong>
            {incidenteAnterior.dentro_garantia ? (
              <Badge variant="destructive" className="ml-2">
                Dentro de los {PERIODO_GARANTIA_DIAS} días de garantía
              </Badge>
            ) : (
              <Badge variant="secondary" className="ml-2">
                Fuera del período de garantía
              </Badge>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Decision Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            ⚖️ Decisión
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Question 1: Is it a valid recurrence? */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">
              ¿Es reincidencia válida? (¿La misma falla que antes?)
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                type="button"
                variant={esReincidencia === true ? "default" : "outline"}
                className={cn(
                  "h-16 text-lg font-semibold",
                  esReincidencia === true && "bg-green-600 hover:bg-green-700"
                )}
                onClick={() => {
                  onEsReincidenciaChange(true);
                  onMotivoChange(null);
                }}
              >
                <CheckCircle className="h-6 w-6 mr-2" />
                SÍ, es la misma falla
              </Button>
              <Button
                type="button"
                variant={esReincidencia === false ? "default" : "outline"}
                className={cn(
                  "h-16 text-lg font-semibold",
                  esReincidencia === false && "bg-red-600 hover:bg-red-700"
                )}
                onClick={() => {
                  onEsReincidenciaChange(false);
                  onAplicaReingresoChange(null);
                }}
              >
                <XCircle className="h-6 w-6 mr-2" />
                NO es reincidencia
              </Button>
            </div>
          </div>

          {/* Question 2: Does reentry apply? (only if es_reincidencia = true) */}
          {esReincidencia === true && (
            <div className="space-y-4 pt-4 border-t">
              <Label className="text-base font-semibold">
                ¿Aplica reingreso? (Garantía por reparación previa)
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={aplicaReingreso === true ? "default" : "outline"}
                  className={cn(
                    "h-16 text-lg font-semibold",
                    aplicaReingreso === true && "bg-green-600 hover:bg-green-700"
                  )}
                  onClick={() => {
                    onAplicaReingresoChange(true);
                    onMotivoChange(null);
                  }}
                >
                  <CheckCircle className="h-6 w-6 mr-2" />
                  SÍ aplica reingreso
                </Button>
                <Button
                  type="button"
                  variant={aplicaReingreso === false ? "default" : "outline"}
                  className={cn(
                    "h-16 text-lg font-semibold",
                    aplicaReingreso === false && "bg-orange-600 hover:bg-orange-700"
                  )}
                  onClick={() => onAplicaReingresoChange(false)}
                >
                  <AlertTriangle className="h-6 w-6 mr-2" />
                  NO aplica reingreso
                </Button>
              </div>
            </div>
          )}

          {/* Reason for not applying reentry */}
          {(esReincidencia === false || aplicaReingreso === false) && (
            <div className="space-y-4 pt-4 border-t">
              <Label className="text-base font-semibold">
                Motivo por el cual no aplica:
              </Label>
              <RadioGroup
                value={motivoNoReingreso || ""}
                onValueChange={(v) => onMotivoChange(v as MotivoNoReingreso)}
              >
                {MOTIVOS_NO_REINGRESO.map((motivo) => (
                  <div
                    key={motivo.value}
                    className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() => onMotivoChange(motivo.value)}
                  >
                    <RadioGroupItem value={motivo.value} id={motivo.value} />
                    <Label htmlFor={motivo.value} className="flex-1 cursor-pointer">
                      {motivo.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Justification */}
          <div className="space-y-2 pt-4 border-t">
            <Label htmlFor="justificacion" className="text-base font-semibold">
              Justificación <span className="text-destructive">*</span>
              <span className="text-muted-foreground font-normal ml-2">
                (mínimo 20 caracteres)
              </span>
            </Label>
            <Textarea
              id="justificacion"
              value={justificacion}
              onChange={(e) => onJustificacionChange(e.target.value)}
              placeholder="Explique detalladamente su decisión sobre si es reincidencia válida y si aplica reingreso. Incluya observaciones técnicas relevantes..."
              rows={4}
              className="resize-none"
            />
            <div className="flex justify-between text-xs">
              <span
                className={cn(
                  justificacion.length < 20 ? "text-destructive" : "text-muted-foreground"
                )}
              >
                {justificacion.length} / 20 caracteres mínimo
              </span>
              {justificacion.length >= 20 && (
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Válido
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary of decision */}
      {esReincidencia !== null && (
        <Card
          className={cn(
            "border-2",
            esReincidencia && aplicaReingreso
              ? "border-green-500 bg-green-500/5"
              : "border-orange-500 bg-orange-500/5"
          )}
        >
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm">
              {esReincidencia && aplicaReingreso ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-700">
                    APROBADO: Es reincidencia válida y aplica reingreso por garantía
                  </span>
                </>
              ) : esReincidencia && aplicaReingreso === false ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <span className="font-semibold text-orange-700">
                    PARCIAL: Es reincidencia pero NO aplica reingreso
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="font-semibold text-red-700">
                    RECHAZADO: No es reincidencia válida
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
