import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { updateClientCodesHPCtoHPS } from "@/scripts/updateClientCodes";
import { RefreshCw, CheckCircle2 } from "lucide-react";

export default function ActualizarCodigos() {
  const [loading, setLoading] = useState(false);
  const [updated, setUpdated] = useState(0);
  const { toast } = useToast();

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const result = await updateClientCodesHPCtoHPS();
      
      if (result.success) {
        setUpdated(result.updated);
        toast({
          title: "Códigos actualizados",
          description: `Se actualizaron ${result.updated} códigos de HPC a HPS exitosamente.`,
        });
      } else {
        toast({
          title: "Error",
          description: "Hubo un problema al actualizar los códigos.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Hubo un problema al actualizar los códigos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Actualizar Códigos de Clientes</CardTitle>
          <CardDescription>
            Cambiar códigos de HPC a HPS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleUpdate}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Actualizando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Actualizar Códigos HPC → HPS
              </>
            )}
          </Button>

          {updated > 0 && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-4 rounded-lg">
              <CheckCircle2 className="h-5 w-5" />
              <span>{updated} códigos actualizados exitosamente</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
