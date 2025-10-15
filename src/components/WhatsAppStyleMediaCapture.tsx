import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, Video, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export interface MediaFile {
  id: string;
  file: File;
  preview: string;
  tipo: 'foto' | 'video';
}

interface WhatsAppStyleMediaCaptureProps {
  media: MediaFile[];
  onMediaChange: (media: MediaFile[]) => void;
  maxFiles?: number;
}

export function WhatsAppStyleMediaCapture({ 
  media, 
  onMediaChange, 
  maxFiles = 10 
}: WhatsAppStyleMediaCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length + media.length > maxFiles) {
      toast.error(`Máximo ${maxFiles} archivos permitidos`);
      return;
    }

    const newMedia: MediaFile[] = [];

    for (const file of files) {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      if (!isVideo && !isImage) {
        toast.error(`${file.name} no es un archivo válido`);
        continue;
      }

      const preview = URL.createObjectURL(file);
      newMedia.push({
        id: `${Date.now()}-${Math.random()}`,
        file,
        preview,
        tipo: isVideo ? 'video' : 'foto'
      });
    }

    onMediaChange([...media, ...newMedia]);
    e.target.value = '';
  };

  const removeMedia = (id: string) => {
    const item = media.find(m => m.id === id);
    if (item) {
      URL.revokeObjectURL(item.preview);
    }
    onMediaChange(media.filter(m => m.id !== id));
  };

  return (
    <div className="space-y-4">
      {/* Controles estilo WhatsApp */}
      <div className="flex gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          onClick={() => cameraInputRef.current?.click()}
          className="flex-1 min-w-[120px]"
        >
          <Camera className="h-4 w-4 mr-2" />
          Cámara
        </Button>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        <Button
          type="button"
          variant="outline"
          onClick={() => videoInputRef.current?.click()}
          className="flex-1 min-w-[120px]"
        >
          <Video className="h-4 w-4 mr-2" />
          Video
        </Button>
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 min-w-[120px]"
        >
          <ImageIcon className="h-4 w-4 mr-2" />
          Galería
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Vista previa de medios */}
      {media.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {media.map((item) => (
            <Card key={item.id} className="relative overflow-hidden group">
              <div className="aspect-square">
                {item.tipo === 'video' ? (
                  <video 
                    src={item.preview} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img 
                    src={item.preview} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="absolute top-2 right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeMedia(item.id)}
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="absolute bottom-2 left-2">
                {item.tipo === 'video' ? (
                  <div className="bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                    <Video className="h-3 w-3" />
                    Video
                  </div>
                ) : (
                  <div className="bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                    <Camera className="h-3 w-3" />
                    Foto
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {media.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <div className="flex justify-center gap-2 mb-3">
            <Camera className="h-8 w-8 text-muted-foreground" />
            <Video className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            No hay fotos o videos
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Toma fotos/videos o selecciona de la galería
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        {media.length} / {maxFiles} archivos
      </p>
    </div>
  );
}
