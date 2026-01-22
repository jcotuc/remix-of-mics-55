import { useRef, forwardRef, useImperativeHandle } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eraser, Save } from "lucide-react";

export interface SignatureCanvasRef {
  isEmpty: () => boolean;
  toDataURL: () => string;
  clear: () => void;
}

interface SignatureCanvasComponentProps {
  onEnd?: () => void;
  onSave?: (dataUrl: string) => void;
}

export const SignatureCanvasComponent = forwardRef<SignatureCanvasRef, SignatureCanvasComponentProps>(
  ({ onEnd, onSave }, ref) => {
    const sigCanvas = useRef<SignatureCanvas>(null);

    useImperativeHandle(ref, () => ({
      isEmpty: () => sigCanvas.current?.isEmpty() ?? true,
      toDataURL: () => sigCanvas.current?.toDataURL() ?? "",
      clear: () => sigCanvas.current?.clear(),
    }));

    const handleClear = () => {
      sigCanvas.current?.clear();
    };

    const handleSave = () => {
      if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
        const dataUrl = sigCanvas.current.toDataURL();
        onSave?.(dataUrl);
      }
    };

    return (
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Firma del Cliente</label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClear}
              >
                <Eraser className="h-4 w-4 mr-2" />
                Limpiar
              </Button>
              {onSave && (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleSave}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Guardar
                </Button>
              )}
            </div>
          </div>
          <div className="border-2 border-dashed border-border rounded-lg bg-white">
            <SignatureCanvas
              ref={sigCanvas}
              canvasProps={{
                className: "w-full h-48 cursor-crosshair",
              }}
              backgroundColor="white"
              penColor="black"
              onEnd={onEnd}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Por favor firme dentro del recuadro para confirmar la recepción de la máquina
          </p>
        </div>
      </Card>
    );
  }
);

SignatureCanvasComponent.displayName = "SignatureCanvasComponent";
