
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, AlertTriangle, BellRing } from "lucide-react";
import { Alert } from "@/types/alerts";

interface AlertsTableProps {
  alerts: Alert[];
  isLoading: boolean;
  onMarkAsRead: (id: string) => void;
}

export function AlertsTable({ alerts, isLoading, onMarkAsRead }: AlertsTableProps) {
  const getAlertIcon = (type: string) => {
    if (type.includes('inventory')) return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    if (type.includes('transaction')) return <AlertCircle className="h-4 w-4 text-red-500" />;
    return <BellRing className="h-4 w-4" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  Loading alerts...
                </TableCell>
              </TableRow>
            ) : alerts.length > 0 ? (
              alerts.map((alert) => (
                <TableRow 
                  key={alert.id} 
                  className={alert.status === 'new' ? 'bg-muted/50' : ''}
                  onClick={() => alert.status === 'new' && onMarkAsRead(alert.id)}
                >
                  <TableCell>{getAlertIcon(alert.type)}</TableCell>
                  <TableCell className="font-medium">{alert.message}</TableCell>
                  <TableCell>{formatDate(alert.created_at)}</TableCell>
                  <TableCell>
                    <Badge variant={alert.status === 'new' ? "default" : "outline"}>
                      {alert.status === 'new' ? 'New' : 'Read'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {alert.data ? JSON.stringify(alert.data) : '—'}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <BellRing className="h-8 w-8 text-muted-foreground opacity-50" />
                    <p>No alerts to display</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
