import { useState, useRef } from "react";
import { Camera, X, Image, Trash2, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import browserImageCompression from "browser-image-compression";

export interface SidebarPhoto {
  id: string;
  file: File;
  preview: string;
  comment?: string;
  timestamp: Date;
  tipo: 'ingreso' | 'salida' | 'diagnostico';
}

interface SidebarMediaCaptureProps {
  photos: SidebarPhoto[];
  onPhotosChange: (photos: SidebarPhoto[]) => void;
  tipo: 'ingreso' | 'salida' | 'diagnostico';
  maxPhotos?: number;
  commentRequired?: boolean;
}

export function SidebarMediaCapture({
  photos,
  onPhotosChange,
  tipo,
  maxPhotos = 20,
  commentRequired = false,
}: SidebarMediaCaptureProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState<{ file: File; preview: string } | null>(null);
  const [currentComment, setCurrentComment] = useState("");
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const compressImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    };
    return await browserImageCompression(file, options);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length >= maxPhotos) {
      toast.error(`Máximo ${maxPhotos} fotos permitidas`);
      return;
    }

    setIsCompressing(true);
    try {
      const file = files[0];
      const compressedFile = await compressImage(file);
      const preview = URL.createObjectURL(compressedFile);
      setCurrentPhoto({ file: compressedFile, preview });
      setCurrentComment("");
    } catch (error) {
      console.error("Error compressing image:", error);
      toast.error("Error al procesar la imagen");
    } finally {
      setIsCompressing(false);
    }

    // Reset inputs
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  const handleSavePhoto = () => {
    if (!currentPhoto) return;

    if (commentRequired && !currentComment.trim()) {
      toast.error("Debes agregar un comentario a la foto");
      return;
    }

    const newPhoto: SidebarPhoto = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file: currentPhoto.file,
      preview: currentPhoto.preview,
      comment: currentComment.trim() || undefined,
      timestamp: new Date(),
      tipo,
    };

    onPhotosChange([...photos, newPhoto]);
    setCurrentPhoto(null);
    setCurrentComment("");
    toast.success("Foto guardada");
  };

  const handleDeletePhoto = (id: string) => {
    const photo = photos.find(p => p.id === id);
    if (photo) {
      URL.revokeObjectURL(photo.preview);
    }
    onPhotosChange(photos.filter(p => p.id !== id));
  };

  const handleCancelPhoto = () => {
    if (currentPhoto) {
      URL.revokeObjectURL(currentPhoto.preview);
    }
    setCurrentPhoto(null);
    setCurrentComment("");
  };

  const tipoLabel = {
    ingreso: "Ingreso",
    salida: "Salida",
    diagnostico: "Diagnóstico",
  }[tipo];

  return (
    <>
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        {/* Floating trigger button on right edge */}
        <SheetTrigger asChild>
          <Button
            className="fixed right-0 top-1/2 -translate-y-1/2 h-24 w-10 rounded-l-lg rounded-r-none shadow-lg z-50 
                       bg-background border-2 border-r-0 border-amber-500 hover:bg-amber-50 
                       flex flex-col items-center justify-center gap-1 p-2"
            variant="outline"
          >
            <Camera className="h-5 w-5 text-amber-600" />
            {photos.length > 0 && (
              <Badge 
                className="h-5 w-5 p-0 flex items-center justify-center text-xs bg-amber-500 text-white"
              >
                {photos.length}
              </Badge>
            )}
          </Button>
        </SheetTrigger>

        <SheetContent side="right" className="w-full sm:w-[400px] p-0 flex flex-col">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="flex items-center gap-2 text-amber-600">
              <Camera className="h-5 w-5" />
              Fotos de {tipoLabel}
              {photos.length > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {photos.length} foto{photos.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {/* Capture area */}
              {currentPhoto ? (
                <div className="border-2 border-amber-500 rounded-lg p-3 bg-amber-50/50 space-y-3">
                  <div className="aspect-video relative rounded-lg overflow-hidden border bg-muted">
                    <img
                      src={currentPhoto.preview}
                      alt="Vista previa"
                      className="w-full h-full object-contain"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={handleCancelPhoto}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div>
                    <Label htmlFor="comment" className="text-sm font-medium">
                      Comentario {commentRequired ? "*" : "(opcional)"}
                    </Label>
                    <Textarea
                      id="comment"
                      value={currentComment}
                      onChange={(e) => setCurrentComment(e.target.value)}
                      placeholder="Describe qué muestra esta foto..."
                      rows={2}
                      className="mt-1"
                    />
                  </div>

                  <Button 
                    onClick={handleSavePhoto} 
                    className="w-full bg-amber-600 hover:bg-amber-700"
                  >
                    Guardar Foto
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4">
                  <div className="flex gap-2 justify-center">
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      className="flex-1 gap-2 border-amber-500 text-amber-600 hover:bg-amber-50"
                      disabled={photos.length >= maxPhotos || isCompressing}
                    >
                      <Camera className="h-4 w-4" />
                      Cámara
                    </Button>
                    <Button
                      onClick={() => galleryInputRef.current?.click()}
                      variant="outline"
                      className="flex-1 gap-2 border-amber-500 text-amber-600 hover:bg-amber-50"
                      disabled={photos.length >= maxPhotos || isCompressing}
                    >
                      <Image className="h-4 w-4" />
                      Galería
                    </Button>
                  </div>
                  {isCompressing && (
                    <p className="text-center text-sm text-muted-foreground mt-2">
                      Procesando imagen...
                    </p>
                  )}
                  {photos.length >= maxPhotos && (
                    <p className="text-center text-sm text-destructive mt-2">
                      Límite de {maxPhotos} fotos alcanzado
                    </p>
                  )}
                </div>
              )}

              {/* Photo grid */}
              {photos.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Fotos guardadas</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {photos.map((photo) => (
                      <div
                        key={photo.id}
                        className="relative rounded-lg overflow-hidden border bg-muted group"
                      >
                        <div className="aspect-square">
                          <img
                            src={photo.preview}
                            alt="Foto"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {photo.comment && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2">
                            <p className="text-xs text-white line-clamp-2">
                              {photo.comment}
                            </p>
                          </div>
                        )}
                        <Button
                          size="icon"
                          variant="destructive"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeletePhoto(photo.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        <div className="absolute top-1 left-1">
                          <Badge className="text-[10px] px-1 py-0 bg-black/60">
                            {photo.timestamp.toLocaleTimeString('es-GT', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
