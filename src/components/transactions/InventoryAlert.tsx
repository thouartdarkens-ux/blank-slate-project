
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface InventoryAlertProps {
  message: string;
  product: string;
  quantity: number;
}

export function InventoryAlert({ message, product, quantity }: InventoryAlertProps) {
  return (
    <Alert variant="default" className="mb-4 bg-yellow-50 border-yellow-200">
      <AlertTriangle className="h-4 w-4 text-yellow-600" />
      <AlertTitle className="text-yellow-800">Inventory Alert</AlertTitle>
      <AlertDescription className="text-yellow-700">
        {message} ({quantity} {product} vouchers)
      </AlertDescription>
    </Alert>
  );
}
