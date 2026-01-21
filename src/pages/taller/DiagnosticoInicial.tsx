import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Construction } from "lucide-react";

// TODO: This page needs to be refactored to use the correct database schema
// Current issues:
// - Uses non-existent tables: CDS_Fallas, CDS_Causas, CDS_Familias
// - Uses non-existent fields on diagnosticos: fallas, causas, tiempo_estimado, resolucion
// - Uses incorrect estado values
// Correct tables: fallas, causas, familias_producto
// Correct diagnosticos fields: see diagnosticos table schema

export default function DiagnosticoInicial() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Diagnóstico Inicial</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Construction className="h-5 w-5" />
            Página en Refactorización
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            Esta página está siendo actualizada para usar el esquema de base de datos correcto.
          </p>
          <p className="text-sm text-muted-foreground">
            Incidente: {id}
          </p>
          <Button className="mt-6" onClick={() => navigate(-1)}>
            Volver
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
