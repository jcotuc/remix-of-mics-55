import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatFechaCorta, formatFechaLarga } from "@/utils/dateFormatters";
import { format } from "date-fns";
import { mycsapi } from "@/mics-api";

interface IncidentPhoto {
  id: string;
  url: string;
  tipo: 'ingreso' | 'diagnostico' | 'salida';
  created_at: string;
  orden: number;
}

interface IncidentPhotoGalleryProps {
  incidenteId: string;
}

export function IncidentPhotoGallery({ incidenteId }: IncidentPhotoGalleryProps) {
  const [photos, setPhotos] = useState<IncidentPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<IncidentPhoto | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPhotos();
  }, [incidenteId]);

  const fetchPhotos = async () => {
    try {
      const { results } = await mycsapi.fetch("/api/v1/incidente-fotos", { method: "GET", query: {
        incidente_id: parseInt(incidenteId) 
      } }) as any;
      
      setPhotos((results || []).map((p: any) => ({
        id: String(p.id),
        url: p.url,
        tipo: p.tipo,
        created_at: p.created_at,
        orden: p.orden || 0
      })));
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPhotosByType = (tipo: 'ingreso' | 'diagnostico' | 'salida') => {
    return photos.filter(photo => photo.tipo === tipo);
  };

  const handlePhotoClick = (photo: IncidentPhoto, type: 'ingreso' | 'diagnostico' | 'salida') => {
    const categoryPhotos = getPhotosByType(type);
    const index = categoryPhotos.findIndex(p => p.id === photo.id);
    setCurrentPhotoIndex(index);
    setSelectedPhoto(photo);
  };

  const navigatePhoto = (direction: 'prev' | 'next') => {
    if (!selectedPhoto) return;
    
    const categoryPhotos = getPhotosByType(selectedPhoto.tipo);
    const newIndex = direction === 'next' 
      ? (currentPhotoIndex + 1) % categoryPhotos.length
      : (currentPhotoIndex - 1 + categoryPhotos.length) % categoryPhotos.length;
    
    setCurrentPhotoIndex(newIndex);
    setSelectedPhoto(categoryPhotos[newIndex]);
  };

  const PhotoCategory = ({ 
    title, 
    tipo, 
    icon 
  }: { 
    title: string; 
    tipo: 'ingreso' | 'diagnostico' | 'salida';
    icon: React.ReactNode;
  }) => {
    const categoryPhotos = getPhotosByType(tipo);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {icon}
            {title}
            <span className="text-sm text-muted-foreground font-normal">
              ({categoryPhotos.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {categoryPhotos.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categoryPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="group relative cursor-pointer"
                  onClick={() => handlePhotoClick(photo, tipo)}
                >
                  <div className="aspect-square rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-colors">
                    <img
                      src={photo.url}
                      alt={`Foto de ${tipo}`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 text-center">
                    {format(new Date(photo.created_at), "dd/MM/yy HH:mm")}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <ImageIcon className="w-12 h-12 mb-2 opacity-30" />
              <p className="text-sm">No hay fotos disponibles</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fotos del Incidente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Cargando fotos...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PhotoCategory 
        title="Fotos de Ingreso" 
        tipo="ingreso"
        icon={<ImageIcon className="w-5 h-5" />}
      />
      
      <PhotoCategory 
        title="Fotos de Diagnóstico" 
        tipo="diagnostico"
        icon={<ImageIcon className="w-5 h-5" />}
      />
      
      <PhotoCategory 
        title="Fotos de Salida" 
        tipo="salida"
        icon={<ImageIcon className="w-5 h-5" />}
      />

      {/* Lightbox Modal */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl p-0">
          {selectedPhoto && (
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 bg-background/80 hover:bg-background"
                onClick={() => setSelectedPhoto(null)}
              >
                <X className="w-4 h-4" />
              </Button>

              <div className="relative bg-black">
                <img
                  src={selectedPhoto.url}
                  alt="Vista completa"
                  className="w-full h-auto max-h-[80vh] object-contain"
                />
                
                {/* Navigation Buttons */}
                {getPhotosByType(selectedPhoto.tipo).length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                      onClick={() => navigatePhoto('prev')}
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                      onClick={() => navigatePhoto('next')}
                    >
                      <ChevronRight className="w-6 h-6" />
                    </Button>
                  </>
                )}
              </div>

              <div className="p-4 bg-background">
                <p className="text-sm text-muted-foreground">
                  {formatFechaLarga(selectedPhoto.created_at)} a las {format(new Date(selectedPhoto.created_at), "HH:mm")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Foto {currentPhotoIndex + 1} de {getPhotosByType(selectedPhoto.tipo).length}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
