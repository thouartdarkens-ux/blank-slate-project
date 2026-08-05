
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface VoucherData {
  id: string;
  serial: string;
  pin: string;
  type: string;
  created_at?: string;
}

interface InventoryTableProps {
  inventory: VoucherData[];
  isLoading: boolean;
}
 const formatPin = (pin: string) => {
    if (!pin) return "";
    if (pin.length <= 4) return "****";
    return pin.substring(0, 2) + "*".repeat(pin.length - 4) + pin.substring(pin.length - 2);
  };

export function InventoryTable({ inventory, isLoading }: InventoryTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Serial</TableHead>
          <TableHead>PIN</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {!isLoading && inventory.length > 0 ? (
          inventory.map(item => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.serial}</TableCell>
              <TableCell>{formatPin(item.pin)}</TableCell>
              <TableCell>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  item.type === 'WASSCE' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                }`}>
                  {item.type}
                </span>
              </TableCell>
              <TableCell>{new Date(item.created_at || '').toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
              {isLoading ? 'Loading inventory data...' : 'No inventory data found. Upload data to get started.'}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
