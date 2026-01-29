/**
 * PasoDocumental - Step 2: Documentary verification questions
 */

import { useState, useEffect } from "react";
import { apiBackendAction } from "@/lib/api-backend";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText } from "lucide-react";
import { PreguntaCard } from "./PreguntaCard";
import type { PreguntaAuditoria, RespuestaAuditoria } from "./types";

interface PasoDocumentalProps {
  respuestas: Record<number, string>;
  onRespuestaChange: (preguntaId: number, respuesta: string) => void;
}

export function PasoDocumental({ respuestas, onRespuestaChange }: PasoDocumentalProps) {
  const [preguntas, setPreguntas] = useState<PreguntaAuditoria[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPreguntas();
  }, []);

  const fetchPreguntas = async () => {
    setLoading(true);
    try {
      const { results } = await apiBackendAction("preguntas_auditoria.list", {
        seccion: "documental",
        activo: true,
      });
      setPreguntas((results || []).sort((a: PreguntaAuditoria, b: PreguntaAuditoria) => a.orden - b.orden));
    } catch (error) {
      console.error("Error fetching preguntas documentales:", error);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Verificación Documental</h2>
          </div>
          <Badge variant={progreso === 100 ? "default" : "secondary"}>
            {preguntasRespondidas} / {preguntas.length}
          </Badge>
        </div>
        <Progress value={progreso} className="h-2" />
        <p className="text-sm text-muted-foreground mt-2">
          Verifique la documentación del incidente contra los estándares establecidos.
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

      {preguntas.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No hay preguntas documentales configuradas.
        </div>
      )}
    </div>
  );
}
