import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, Video, X, Image as ImageIcon, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import imageCompression from 'browser-image-compression';

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
  const [isCompressing, setIsCompressing] = useState(false);

  const compressImage = async (file: File): Promise<File> => {
    try {
      const options = {
        maxSizeMB: 1, // Máximo 1MB por imagen
        maxWidthOrHeight: 1920, // Máximo 1920px
        useWebWorker: true,
        fileType: 'image/jpeg' as const,
      };
      
      const compressedFile = await imageCompression(file, options);
      console.log('Imagen comprimida:', {
        original: (file.size / 1024 / 1024).toFixed(2) + 'MB',
        compressed: (compressedFile.size / 1024 / 1024).toFixed(2) + 'MB'
      });
      
      return compressedFile;
    } catch (error) {
      console.error('Error al comprimir imagen:', error);
      return file; // Si falla la compresión, devolver el archivo original
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length + media.length > maxFiles) {
      toast.error(`Máximo ${maxFiles} archivos permitidos`);
      return;
    }

    setIsCompressing(true);
    const newMedia: MediaFile[] = [];

    try {
      for (const file of files) {
        const isVideo = file.type.startsWith('video/');
        const isImage = file.type.startsWith('image/');

        if (!isVideo && !isImage) {
          toast.error(`${file.name} no es un archivo válido`);
          continue;
        }

        // Comprimir solo imágenes
        let processedFile = file;
        if (isImage) {
          processedFile = await compressImage(file);
        }

        const preview = URL.createObjectURL(processedFile);
        newMedia.push({
          id: `${Date.now()}-${Math.random()}`,
          file: processedFile,
          preview,
          tipo: isVideo ? 'video' : 'foto'
        });
      }

      onMediaChange([...media, ...newMedia]);
      toast.success(`${newMedia.length} archivo(s) agregado(s)`);
    } catch (error) {
      console.error('Error al procesar archivos:', error);
      toast.error('Error al procesar algunos archivos');
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
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
          className="flex-1 min-w-[120px] sm:min-w-[140px]"
          disabled={isCompressing || media.length >= maxFiles}
        >
          {isCompressing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Camera className="h-4 w-4 mr-2" />
          )}
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
          className="flex-1 min-w-[120px] sm:min-w-[140px]"
          disabled={isCompressing || media.length >= maxFiles}
        >
          {isCompressing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Video className="h-4 w-4 mr-2" />
          )}
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
          className="flex-1 min-w-[120px] sm:min-w-[140px]"
          disabled={isCompressing || media.length >= maxFiles}
        >
          {isCompressing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <ImageIcon className="h-4 w-4 mr-2" />
          )}
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
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              Archivos seleccionados: {media.length} / {maxFiles}
            </p>
            {media.length >= maxFiles && (
              <p className="text-xs text-destructive">Límite alcanzado</p>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {media.map((item) => (
              <Card key={item.id} className="relative overflow-hidden group border-2 hover:border-primary/50 transition-colors">
                <div className="aspect-square bg-muted/30">
                  {item.tipo === 'video' ? (
                    <video 
                      src={item.preview} 
                      className="w-full h-full object-cover"
                      muted
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
                  className="absolute top-1 right-1 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  onClick={() => removeMedia(item.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
                <div className="absolute bottom-1 left-1">
                  {item.tipo === 'video' ? (
                    <div className="bg-black/90 text-white px-2 py-1 rounded text-[10px] flex items-center gap-1 font-medium shadow-lg">
                      <Video className="h-2.5 w-2.5" />
                      Video
                    </div>
                  ) : (
                    <div className="bg-black/90 text-white px-2 py-1 rounded text-[10px] flex items-center gap-1 font-medium shadow-lg">
                      <Camera className="h-2.5 w-2.5" />
                      Foto
                    </div>
                  )}
                </div>
                {item.file.size && (
                  <div className="absolute bottom-1 right-1 bg-black/90 text-white px-2 py-1 rounded text-[10px] shadow-lg">
                    {(item.file.size / 1024 / 1024).toFixed(2)}MB
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {media.length === 0 && !isCompressing && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/20">
          <div className="flex justify-center gap-3 mb-4">
            <Camera className="h-10 w-10 text-muted-foreground/50" />
            <Video className="h-10 w-10 text-muted-foreground/50" />
            <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-muted-foreground mb-1">
            No hay archivos seleccionados
          </p>
          <p className="text-xs text-muted-foreground">
            Usa los botones de arriba para capturar o seleccionar fotos/videos
          </p>
        </div>
      )}

      {isCompressing && (
        <div className="text-center py-8 border-2 border-dashed rounded-lg bg-primary/5">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
          <p className="text-sm font-medium">Comprimiendo imágenes...</p>
          <p className="text-xs text-muted-foreground mt-1">
            Esto mejora la velocidad de carga
          </p>
        </div>
      )}
    </div>
  );
}
