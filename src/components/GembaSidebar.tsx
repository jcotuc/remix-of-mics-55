import { useState, useRef } from "react";
import { Camera, X, MessageSquare, Trash2, ChevronLeft, ChevronRight, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface GembaPhoto {
  file: File;
  preview: string;
  comment: string;
  timestamp: Date;
}

interface GembaSidebarProps {
  photos: GembaPhoto[];
  onPhotosChange: (photos: GembaPhoto[]) => void;
  maxPhotos?: number;
}

export function GembaSidebar({
  photos,
  onPhotosChange,
  maxPhotos = 20,
}: GembaSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [currentPhoto, setCurrentPhoto] = useState<{ file: File; preview: string } | null>(null);
  const [currentComment, setCurrentComment] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length >= maxPhotos) {
      return;
    }

    const file = files[0];
    const preview = URL.createObjectURL(file);
    setCurrentPhoto({ file, preview });
    setCurrentComment("");
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSavePhoto = () => {
    if (!currentPhoto || !currentComment.trim()) return;

    const newPhoto: GembaPhoto = {
      file: currentPhoto.file,
      preview: currentPhoto.preview,
      comment: currentComment.trim(),
      timestamp: new Date(),
    };

    onPhotosChange([...photos, newPhoto]);
    setCurrentPhoto(null);
    setCurrentComment("");
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
    <div 
      className={cn(
        "fixed right-0 top-0 h-full bg-background border-l shadow-lg transition-all duration-300 z-40 flex flex-col",
        isExpanded ? "w-80" : "w-14"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-amber-50 dark:bg-amber-950/30">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-8 w-8"
        >
          {isExpanded ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
        
        {isExpanded && (
          <div className="flex items-center gap-2 flex-1 ml-2">
            <MessageSquare className="h-4 w-4 text-amber-600" />
            <span className="font-medium text-sm">Gemba Docs</span>
            {photos.length > 0 && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs">
                {photos.length}
              </Badge>
            )}
          </div>
        )}

        {!isExpanded && photos.length > 0 && (
          <Badge 
            variant="secondary" 
            className="absolute top-2 right-2 bg-amber-500 text-white text-xs h-5 w-5 p-0 flex items-center justify-center rounded-full"
          >
            {photos.length}
          </Badge>
        )}
      </div>

      {/* Content */}
      {isExpanded ? (
        <ScrollArea className="flex-1 p-3">
          <div className="space-y-4">
            {/* Add new photo */}
            {currentPhoto ? (
              <div className="border-2 border-amber-500 rounded-lg p-3 bg-amber-50/50 dark:bg-amber-950/20 space-y-3">
                <div className="aspect-video rounded-lg overflow-hidden border">
                  <img 
                    src={currentPhoto.preview} 
                    alt="Nueva foto"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comment" className="text-xs font-medium">
                    Comentario *
                  </Label>
                  <Textarea
                    id="comment"
                    value={currentComment}
                    onChange={(e) => setCurrentComment(e.target.value)}
                    placeholder="Describe esta foto..."
                    rows={2}
                    className="text-sm resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSavePhoto} 
                    size="sm" 
                    className="flex-1 bg-amber-600 hover:bg-amber-700"
                    disabled={!currentComment.trim()}
                  >
                    Guardar
                  </Button>
                  <Button onClick={handleCancelPhoto} size="sm" variant="outline">
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-amber-300 rounded-lg p-4 text-center">
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
                  size="sm"
                  className="gap-2 border-amber-400 text-amber-700 hover:bg-amber-50"
                  disabled={photos.length >= maxPhotos}
                >
                  <Camera className="h-4 w-4" />
                  Tomar Foto
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  {photos.length >= maxPhotos 
                    ? `Límite alcanzado`
                    : `${photos.length}/${maxPhotos} fotos`
                  }
                </p>
              </div>
            )}

            {/* Photo list */}
            {photos.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Fotos guardadas</Label>
                <div className="space-y-2">
                  {photos.map((photo, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-start gap-2 p-2 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-14 h-14 rounded overflow-hidden border flex-shrink-0">
                        <img 
                          src={photo.preview} 
                          alt={`Foto ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {photo.comment}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {photo.timestamp.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-destructive hover:text-destructive shrink-0"
                        onClick={() => handleDeletePhoto(idx)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      ) : (
        // Collapsed state - show icons only
        <div className="flex flex-col items-center gap-3 p-2 mt-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-amber-600 hover:bg-amber-50"
            onClick={() => {
              setIsExpanded(true);
              setTimeout(() => fileInputRef.current?.click(), 100);
            }}
            disabled={photos.length >= maxPhotos}
          >
            <ImagePlus className="h-5 w-5" />
          </Button>
          
          {/* Mini photo previews */}
          {photos.slice(0, 4).map((photo, idx) => (
            <div 
              key={idx}
              className="w-10 h-10 rounded border overflow-hidden cursor-pointer hover:ring-2 ring-amber-400"
              onClick={() => setIsExpanded(true)}
            >
              <img 
                src={photo.preview}
                alt={`Foto ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
          {photos.length > 4 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => setIsExpanded(true)}
            >
              +{photos.length - 4}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}