import { useState, useRef, useEffect } from "react";
import { Camera, X, Keyboard, ScanLine, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (code: string) => void;
  title?: string;
  description?: string;
}

export function BarcodeScanner({
  open,
  onOpenChange,
  onScan,
  title = "Escanear Código",
  description = "Use la cámara para escanear un código de barras o ingrese el código manualmente"
}: BarcodeScannerProps) {
  const [manualCode, setManualCode] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      setCameraError("No se pudo acceder a la cámara. Por favor, ingrese el código manualmente.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (!open) {
      stopCamera();
      setManualCode("");
      setCameraError(null);
    }
  }, [open]);

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      setManualCode("");
      onOpenChange(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleManualSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Keyboard className="h-4 w-4" />
              Manual
            </TabsTrigger>
            <TabsTrigger value="camera" className="flex items-center gap-2" onClick={startCamera}>
              <Camera className="h-4 w-4" />
              Cámara
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Ingrese el código SKU..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                className="flex-1"
              />
              <Button onClick={handleManualSubmit} disabled={!manualCode.trim()}>
                Buscar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Ingrese el código del repuesto y presione Enter o click en Buscar
            </p>
          </TabsContent>

          <TabsContent value="camera" className="space-y-4">
            {cameraError ? (
              <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg bg-muted/50">
                <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                <p className="text-sm text-muted-foreground">{cameraError}</p>
              </div>
            ) : (
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                {cameraActive && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-64 h-32 border-2 border-primary/80 rounded-lg">
                      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-primary animate-pulse" />
                    </div>
                  </div>
                )}
                {!cameraActive && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Button variant="outline" onClick={startCamera}>
                      <Camera className="h-4 w-4 mr-2" />
                      Activar Cámara
                    </Button>
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center">
              Nota: La detección automática de códigos requiere una librería adicional.
              <br />Por ahora, use el modo manual para ingresar códigos.
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
