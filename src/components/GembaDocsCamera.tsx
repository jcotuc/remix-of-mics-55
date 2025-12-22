import { useState, useRef } from "react";
import { Camera, X, Image, MessageSquare, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerFooter,
} from "@/components/ui/drawer";
import { toast } from "sonner";

export interface GembaPhoto {
  file: File;
  preview: string;
  comment: string;
  timestamp: Date;
}

interface GembaDocsCameraProps {
  photos: GembaPhoto[];
  onPhotosChange: (photos: GembaPhoto[]) => void;
  maxPhotos?: number;
}

export function GembaDocsCamera({
  photos,
  onPhotosChange,
  maxPhotos = 20,
}: GembaDocsCameraProps) {
  const [currentPhoto, setCurrentPhoto] = useState<{ file: File; preview: string } | null>(null);
  const [currentComment, setCurrentComment] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length >= maxPhotos) {
      toast.error(`Máximo ${maxPhotos} fotos permitidas`);
      return;
    }

    const file = files[0];
    const preview = URL.createObjectURL(file);
    setCurrentPhoto({ file, preview });
    setCurrentComment("");
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSavePhoto = () => {
    if (!currentPhoto) return;
    
    if (!currentComment.trim()) {
      toast.error("Debes agregar un comentario a la foto");
      return;
    }

    const newPhoto: GembaPhoto = {
      file: currentPhoto.file,
      preview: currentPhoto.preview,
      comment: currentComment.trim(),
      timestamp: new Date(),
    };

    onPhotosChange([...photos, newPhoto]);
    setCurrentPhoto(null);
    setCurrentComment("");
    toast.success("Foto guardada con comentario");
  };

  const handleDeletePhoto = (index: number) => {
    const updated = photos.filter((_, i) => i !== index);
    onPhotosChange(updated);
  };

  const handleCancelPhoto = () => {
    if (currentPhoto) {
      URL.revokeObjectURL(currentPhoto.preview);
    }
    setCurrentPhoto(null);
    setCurrentComment("");
  };

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button
          size="lg"
          variant="outline"
          className="fixed bottom-6 right-24 h-14 px-4 rounded-full shadow-lg z-50 border-amber-500 text-amber-600 hover:bg-amber-50"
        >
          <MessageSquare className="h-5 w-5 mr-2" />
          Gemba Docs
          {photos.length > 0 && (
            <Badge 
              variant="secondary" 
              className="ml-2 bg-amber-100 text-amber-700"
            >
              {photos.length}
            </Badge>
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-amber-600" />
            Gemba Docs - Fotos con Comentarios
            {photos.length > 0 && (
              <Badge variant="secondary">{photos.length} foto(s)</Badge>
            )}
          </DrawerTitle>
        </DrawerHeader>
        
        <div className="px-4 pb-6 overflow-y-auto space-y-4">
          {/* Current photo being added */}
          {currentPhoto ? (
            <div className="border-2 border-amber-500 rounded-lg p-4 bg-amber-50/50 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-32 h-32 rounded-lg overflow-hidden border flex-shrink-0">
                  <img 
                    src={currentPhoto.preview} 
                    alt="Nueva foto"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <Label htmlFor="comment" className="font-medium">
                      Comentario * (obligatorio)
                    </Label>
                    <Textarea
                      id="comment"
                      value={currentComment}
                      onChange={(e) => setCurrentComment(e.target.value)}
                      placeholder="Describe qué muestra esta foto..."
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSavePhoto} size="sm" className="bg-amber-600 hover:bg-amber-700">
                      Guardar Foto
                    </Button>
                    <Button onClick={handleCancelPhoto} size="sm" variant="outline">
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button 
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="gap-2"
                disabled={photos.length >= maxPhotos}
              >
                <Camera className="h-5 w-5" />
                Tomar Foto
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                {photos.length >= maxPhotos 
                  ? `Límite de ${maxPhotos} fotos alcanzado`
                  : "Cada foto requiere un comentario descriptivo"
                }
              </p>
            </div>
          )}

          {/* Saved photos */}
          {photos.length > 0 && (
            <div className="space-y-3">
              <Label className="font-medium">Fotos Guardadas</Label>
              <div className="space-y-3">
                {photos.map((photo, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-start gap-3 p-3 border rounded-lg bg-card"
                  >
                    <div className="w-20 h-20 rounded overflow-hidden border flex-shrink-0">
                      <img 
                        src={photo.preview} 
                        alt={`Foto ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">Foto {idx + 1}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {photo.comment}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {photo.timestamp.toLocaleString('es-GT')}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeletePhoto(idx)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
