
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

interface AlertsHeaderProps {
  newAlertsCount: number;
  onMarkAllRead: () => void;
}

export function AlertsHeader({ newAlertsCount, onMarkAllRead }: AlertsHeaderProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between space-y-2 md:space-y-0">
          <div className="flex items-center gap-2">
            <CardTitle>Notification Center</CardTitle>
            {newAlertsCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {newAlertsCount} New
              </Badge>
            )}
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onMarkAllRead}
            disabled={newAlertsCount === 0}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Mark All as Read
          </Button>
        </div>
        <CardDescription>
          View system alerts and notifications
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
