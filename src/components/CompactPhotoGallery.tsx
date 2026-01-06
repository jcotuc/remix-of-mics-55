import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, X, Image as ImageIcon, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface IncidentPhoto {
  id: string;
  url: string;
  tipo: 'ingreso' | 'diagnostico' | 'salida';
  created_at: string;
  orden: number;
}

interface CompactPhotoGalleryProps {
  incidenteId: string;
}

const tipoLabels: Record<string, { label: string; color: string; bgSection: string; borderColor: string }> = {
  ingreso: { label: "Ingreso", color: "bg-blue-200 text-blue-900", bgSection: "bg-blue-50", borderColor: "border-blue-200" },
  diagnostico: { label: "Diagnóstico", color: "bg-amber-200 text-amber-900", bgSection: "bg-amber-50", borderColor: "border-amber-200" },
  salida: { label: "Salida", color: "bg-green-200 text-green-900", bgSection: "bg-green-50", borderColor: "border-green-200" },
};

export function CompactPhotoGallery({ incidenteId }: CompactPhotoGalleryProps) {
  const [photos, setPhotos] = useState<IncidentPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<IncidentPhoto | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPhotos();
  }, [incidenteId]);

  const fetchPhotos = async () => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await (supabase as any)
        .from('incidente_fotos')
        .select('*')
        .eq('incidente_id', incidenteId)
        .order('tipo', { ascending: true })
        .order('orden', { ascending: true });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoClick = (photo: IncidentPhoto, index: number) => {
    setCurrentPhotoIndex(index);
    setSelectedPhoto(photo);
  };

  const navigatePhoto = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'next' 
      ? (currentPhotoIndex + 1) % photos.length
      : (currentPhotoIndex - 1 + photos.length) % photos.length;
    
    setCurrentPhotoIndex(newIndex);
    setSelectedPhoto(photos[newIndex]);
  };

  // Group photos by type
  const photosByType = photos.reduce((acc, photo) => {
    if (!acc[photo.tipo]) acc[photo.tipo] = [];
    acc[photo.tipo].push(photo);
    return acc;
  }, {} as Record<string, IncidentPhoto[]>);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Camera className="w-4 h-4" />
            Fotos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Cargando fotos...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Camera className="w-4 h-4" />
            Fotos del Incidente
            <span className="text-sm font-normal text-muted-foreground">
              ({photos.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {photos.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground px-4">
              <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No hay fotos disponibles</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {/* Always show all 3 sections */}
              {(['ingreso', 'diagnostico', 'salida'] as const).map((tipo) => {
                const typePhotos = photosByType[tipo] || [];
                const config = tipoLabels[tipo];
                
                return (
                  <div 
                    key={tipo} 
                    className={`p-3 ${config.bgSection}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge 
                        variant="secondary" 
                        className={`${config.color} text-xs font-medium`}
                      >
                        {config.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-medium">
                        {typePhotos.length} foto{typePhotos.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    {typePhotos.length === 0 ? (
                      <div className={`border-2 border-dashed ${config.borderColor} rounded-lg p-3 text-center`}>
                        <ImageIcon className="w-6 h-6 mx-auto text-muted-foreground/40" />
                        <p className="text-xs text-muted-foreground mt-1">Sin fotos</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {typePhotos.slice(0, 6).map((photo, idx) => {
                          const globalIndex = photos.findIndex(p => p.id === photo.id);
                          return (
                            <div
                              key={photo.id}
                              className={`aspect-square rounded-lg overflow-hidden cursor-pointer border-2 ${config.borderColor} hover:border-primary transition-colors relative group`}
                              onClick={() => handlePhotoClick(photo, globalIndex)}
                            >
                              <img
                                src={photo.url}
                                alt={`Foto de ${tipo}`}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                loading="lazy"
                              />
                              {idx === 5 && typePhotos.length > 6 && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                  <span className="text-white text-sm font-medium">
                                    +{typePhotos.length - 6}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
                
                {photos.length > 1 && (
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
                <div className="flex items-center justify-between">
                  <div>
                    <Badge className={tipoLabels[selectedPhoto.tipo]?.color || "bg-gray-100 text-gray-800"}>
                      {tipoLabels[selectedPhoto.tipo]?.label || selectedPhoto.tipo}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(new Date(selectedPhoto.created_at), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Foto {currentPhotoIndex + 1} de {photos.length}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}