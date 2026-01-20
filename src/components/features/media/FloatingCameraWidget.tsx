import { useState } from "react";
import { Camera, X, Image, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WhatsAppStyleMediaCapture, MediaFile } from "./WhatsAppStyleMediaCapture";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

interface FloatingCameraWidgetProps {
  media: MediaFile[];
  onMediaChange: (media: MediaFile[]) => void;
  maxFiles?: number;
}

export function FloatingCameraWidget({
  media,
  onMediaChange,
  maxFiles = 10,
}: FloatingCameraWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <Drawer>
        <DrawerTrigger asChild>
          <Button
            size="lg"
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 bg-primary hover:bg-primary/90"
          >
            <Camera className="h-6 w-6" />
            {media.length > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center p-0 text-xs"
              >
                {media.length}
              </Badge>
            )}
          </Button>
        </DrawerTrigger>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Fotos y Videos del Ingreso
              {media.length > 0 && (
                <Badge variant="secondary">{media.length} archivo(s)</Badge>
              )}
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto">
            <WhatsAppStyleMediaCapture
              media={media}
              onMediaChange={onMediaChange}
              maxFiles={maxFiles}
            />
          </div>
        </DrawerContent>
      </Drawer>

      {/* Mini preview bar when there are photos */}
      {media.length > 0 && (
        <div className="fixed bottom-24 right-6 z-40">
          <div 
            className="bg-card border rounded-lg shadow-lg p-2 cursor-pointer transition-all"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-2">
              <Image className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{media.length} foto(s)</span>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </div>
            
            {isExpanded && (
              <div className="mt-2 flex gap-1 flex-wrap max-w-[200px]">
                {media.slice(0, 4).map((file, idx) => (
                  <div 
                    key={idx} 
                    className="w-10 h-10 rounded overflow-hidden border"
                  >
                    <img 
                      src={file.preview} 
                      alt={`Preview ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
                {media.length > 4 && (
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-xs font-medium">
                    +{media.length - 4}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
