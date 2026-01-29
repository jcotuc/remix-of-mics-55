/**
 * PasoFisica - Step 3: Physical inspection questions based on product family
 */

import { useState, useEffect } from "react";
import { apiBackendAction } from "@/lib/api-backend";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Wrench, AlertCircle } from "lucide-react";
import { PreguntaCard } from "./PreguntaCard";
import type { PreguntaAuditoria } from "./types";

interface PasoFisicaProps {
  familiaProductoId: number | null;
  respuestas: Record<number, string>;
  onRespuestaChange: (preguntaId: number, respuesta: string) => void;
}

export function PasoFisica({ familiaProductoId, respuestas, onRespuestaChange }: PasoFisicaProps) {
  const [preguntas, setPreguntas] = useState<PreguntaAuditoria[]>([]);
  const [familiaNombre, setFamiliaNombre] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (familiaProductoId) {
      fetchPreguntas();
    } else {
      setLoading(false);
    }
  }, [familiaProductoId]);

  const fetchPreguntas = async () => {
    setLoading(true);
    try {
      // Fetch family name
      const { results: familias } = await apiBackendAction("familias_producto.list", {});
      const familia = familias?.find((f: any) => f.id === familiaProductoId);
      setFamiliaNombre(familia?.nombre || "Desconocida");

      // Fetch questions for this family
      const { results } = await apiBackendAction("preguntas_auditoria.list", {
        familia_producto_id: familiaProductoId,
        seccion: "fisica",
        activo: true,
      }) as { results: PreguntaAuditoria[] };
      setPreguntas((results || []).sort((a, b) => a.orden - b.orden));
    } catch (error) {
      console.error("Error fetching preguntas físicas:", error);
    } finally {
      setLoading(false);
    }
  };

  const preguntasRespondidas = preguntas.filter((p) => respuestas[p.id]).length;
  const progreso = preguntas.length > 0 ? (preguntasRespondidas / preguntas.length) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!familiaProductoId) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No se ha identificado la familia del producto. Por favor seleccione un incidente con un producto válido.
        </AlertDescription>
      </Alert>
    );
  }

  if (preguntas.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No hay preguntas de inspección física configuradas para la familia "{familiaNombre}".
          Puede continuar a la validación final.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Inspección Física - {familiaNombre}</h2>
          </div>
          <Badge variant={progreso === 100 ? "default" : "secondary"}>
            {preguntasRespondidas} / {preguntas.length}
          </Badge>
        </div>
        <Progress value={progreso} className="h-2" />
        <p className="text-sm text-muted-foreground mt-2">
          Realice las pruebas físicas correspondientes a equipos de la familia {familiaNombre}.
        </p>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {preguntas.map((pregunta, index) => (
          <PreguntaCard
            key={pregunta.id}
            pregunta={pregunta}
            respuesta={respuestas[pregunta.id] || null}
            onRespuestaChange={(resp) => onRespuestaChange(pregunta.id, resp)}
            numero={index + 1}
            total={preguntas.length}
          />
        ))}
      </div>
    </div>
  );
}
