import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Placeholder NotificationBadge
 * The notificaciones table schema doesn't have required fields (user_id, leido, metadata)
 */
export function NotificationBadge() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Notificaciones</h4>
          </div>
          <div className="text-sm text-muted-foreground text-center py-6">
            Sin notificaciones pendientes
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
