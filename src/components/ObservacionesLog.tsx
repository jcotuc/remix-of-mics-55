import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Clock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ObservacionesLogProps {
  logObservaciones: string | null;
  className?: string;
}

interface ParsedComment {
  timestamp: string | null;
  user: string | null;
  message: string;
}

function parseObservaciones(log: string | null): ParsedComment[] {
  if (!log || log.trim() === "") return [];

  const comments: ParsedComment[] = [];
  
  // Try to parse different formats
  // Format 1: [2024-01-15 10:30] Usuario: Mensaje
  // Format 2: 2024-01-15 - Mensaje
  // Format 3: Plain text separated by newlines
  
  const lines = log.split('\n').filter(line => line.trim() !== "");
  
  lines.forEach(line => {
    // Try to match [timestamp] user: message
    const bracketMatch = line.match(/^\[(\d{4}-\d{2}-\d{2}[^\]]*)\]\s*([^:]+)?:\s*(.+)$/);
    if (bracketMatch) {
      comments.push({
        timestamp: bracketMatch[1],
        user: bracketMatch[2]?.trim() || null,
        message: bracketMatch[3].trim()
      });
      return;
    }

    // Try to match timestamp - message
    const dashMatch = line.match(/^(\d{4}-\d{2}-\d{2}[^-]*)\s*-\s*(.+)$/);
    if (dashMatch) {
      comments.push({
        timestamp: dashMatch[1].trim(),
        user: null,
        message: dashMatch[2].trim()
      });
      return;
    }

    // Plain text
    comments.push({
      timestamp: null,
      user: null,
      message: line.trim()
    });
  });

  return comments;
}

export function ObservacionesLog({ logObservaciones, className }: ObservacionesLogProps) {
  const comments = parseObservaciones(logObservaciones);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="w-4 h-4" />
          Log de Observaciones
          <span className="text-sm font-normal text-muted-foreground">
            ({comments.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {comments.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Sin observaciones registradas</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {comments.map((comment, index) => (
              <div 
                key={index} 
                className="bg-muted/50 rounded-lg p-3 border-l-2 border-primary/30"
              >
                <p className="text-sm">{comment.message}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  {comment.timestamp && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {comment.timestamp}
                    </span>
                  )}
                  {comment.user && (
                    <span>{comment.user}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}