/**
 * PasoValidacion - Step 4: Final validation, photos, and result
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WhatsAppStyleMediaCapture } from "@/components/features/media";
import { CheckCircle, XCircle, FileCheck } from "lucide-react";
import type { AuditoriaFormData, IncidenteParaAuditoria } from "./types";

interface PasoValidacionProps {
  formData: AuditoriaFormData;
  onFormDataChange: (data: Partial<AuditoriaFormData>) => void;
  incidente: IncidenteParaAuditoria | null;
  respuestasCount: { documentales: number; fisicas: number };
  mediaFiles: any[];
  onMediaChange: (files: any[]) => void;
}

export function PasoValidacion({
  formData,
  onFormDataChange,
  incidente,
  respuestasCount,
  mediaFiles,
  onMediaChange,
}: PasoValidacionProps) {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Resumen de Auditoría
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Incidente:</span>
              <span className="font-medium ml-2">{incidente?.codigo || "N/A"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Clasificación:</span>
              <Badge variant="outline" className="ml-2">{formData.clasificacion || "N/A"}</Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Modalidad:</span>
              <Badge variant="outline" className="ml-2">{formData.tipo_auditoria_modalidad || "N/A"}</Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Tipología:</span>
              <Badge variant="outline" className="ml-2">{formData.tipologia_reparacion || "N/A"}</Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Preguntas documentales:</span>
              <span className="font-medium ml-2">{respuestasCount.documentales} respondidas</span>
            </div>
            <div>
              <span className="text-muted-foreground">Preguntas físicas:</span>
              <span className="font-medium ml-2">{respuestasCount.fisicas} respondidas</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Evidence Photos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Evidencias Fotográficas (Opcional)</CardTitle>
        </CardHeader>
        <CardContent>
          <WhatsAppStyleMediaCapture 
            media={mediaFiles} 
            onMediaChange={onMediaChange} 
            maxFiles={10}
          />
        </CardContent>
      </Card>

      {/* Observations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Observaciones Generales</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Ingrese observaciones adicionales sobre la auditoría..."
            value={formData.observaciones}
            onChange={(e) => onFormDataChange({ observaciones: e.target.value })}
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Final Result */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-lg">Resultado Final de Auditoría</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              type="button"
              size="lg"
              variant={formData.resultado === "APRUEBA" ? "default" : "outline"}
              onClick={() => onFormDataChange({ resultado: "APRUEBA" })}
              className={`flex-1 py-6 text-lg ${
                formData.resultado === "APRUEBA" 
                  ? "bg-green-600 hover:bg-green-700" 
                  : "hover:border-green-500 hover:text-green-600"
              }`}
            >
              <CheckCircle className="h-6 w-6 mr-2" />
              APRUEBA
            </Button>
            <Button
              type="button"
              size="lg"
              variant={formData.resultado === "NO_APRUEBA" ? "default" : "outline"}
              onClick={() => onFormDataChange({ resultado: "NO_APRUEBA" })}
              className={`flex-1 py-6 text-lg ${
                formData.resultado === "NO_APRUEBA" 
                  ? "bg-red-600 hover:bg-red-700" 
                  : "hover:border-red-500 hover:text-red-600"
              }`}
            >
              <XCircle className="h-6 w-6 mr-2" />
              NO APRUEBA
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
