import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Camera, Image as ImageIcon, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";

export interface PhotoWithDescription {
  id: string;
  file: File;
  preview: string;
  description: string;
  tipo: 'foto' | 'video';
}

interface PhotoGalleryProps {
  photos: PhotoWithDescription[];
  onPhotosChange: (photos: PhotoWithDescription[]) => void;
  maxPhotos?: number;
}

export function PhotoGalleryWithDescriptions({ 
  photos, 
  onPhotosChange, 
  maxPhotos = 20 
}: PhotoGalleryProps) {
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length + photos.length > maxPhotos) {
      toast.error(`Máximo ${maxPhotos} archivos permitidos`);
      return;
    }

    const newPhotos: PhotoWithDescription[] = [];

    for (const file of files) {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      if (!isVideo && !isImage) {
        toast.error(`${file.name} no es una foto o video válido`);
        continue;
      }

      const preview = URL.createObjectURL(file);
      newPhotos.push({
        id: `${Date.now()}-${Math.random()}`,
        file,
        preview,
        description: '',
        tipo: isVideo ? 'video' : 'foto'
      });
    }

    onPhotosChange([...photos, ...newPhotos]);
    e.target.value = '';
  };

  const handleRemovePhoto = (id: string) => {
    const photo = photos.find(p => p.id === id);
    if (photo) {
      URL.revokeObjectURL(photo.preview);
    }
    onPhotosChange(photos.filter(p => p.id !== id));
  };

  const handleUpdateDescription = (id: string, description: string) => {
    onPhotosChange(photos.map(p => 
      p.id === id ? { ...p, description } : p
    ));
  };

  const selectedPhoto = photos.find(p => p.id === selectedPhotoId);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => document.getElementById('photo-input-gallery')?.click()}
          className="flex-1"
        >
          <Camera className="h-4 w-4 mr-2" />
          Agregar Fotos/Videos
        </Button>
        <input
          id="photo-input-gallery"
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={handleAddPhoto}
        />
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <Card key={photo.id} className="overflow-hidden">
              <div className="relative aspect-square">
                {photo.tipo === 'video' ? (
                  <video 
                    src={photo.preview} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img 
                    src={photo.preview} 
                    alt={photo.description || 'Foto'} 
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 w-8 p-0"
                        onClick={() => setSelectedPhotoId(photo.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                      <DialogHeader>
                        <DialogTitle>Detalles de {photo.tipo === 'video' ? 'Video' : 'Foto'}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        {photo.tipo === 'video' ? (
                          <video 
                            src={photo.preview} 
                            controls 
                            className="w-full rounded-lg"
                          />
                        ) : (
                          <img 
                            src={photo.preview} 
                            alt={photo.description} 
                            className="w-full rounded-lg"
                          />
                        )}
                        <div>
                          <Label>Descripción</Label>
                          <Textarea
                            value={photo.description}
                            onChange={(e) => handleUpdateDescription(photo.id, e.target.value)}
                            placeholder="Describa lo que se observa en esta imagen/video..."
                            rows={3}
                          />
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-8 w-8 p-0"
                    onClick={() => handleRemovePhoto(photo.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-2">
                <Input
                  value={photo.description}
                  onChange={(e) => handleUpdateDescription(photo.id, e.target.value)}
                  placeholder="Descripción breve..."
                  className="text-xs"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {photos.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No hay fotos o videos agregados
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Haz clic en "Agregar Fotos/Videos" para comenzar
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {photos.length} / {maxPhotos} archivos agregados
      </p>
    </div>
  );
}
