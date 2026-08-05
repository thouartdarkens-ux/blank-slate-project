
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InventoryAlert } from "./transactions/InventoryAlert";
export interface Transaction {
  id: string;
  customer: string;
  amount: string;
  status: "completed" | "pending" | "failed" | "awaiting_inventory" | "compromised";
  voucher?: string;
  date: string;
  customerId?: string;
  quantity: number; // Added quantity field
}
interface TransactionListProps {
  transactions: Transaction[];
  title?: string;
}
export function TransactionList({
  transactions,
  title = "Recent Transactions"
}: TransactionListProps) {
  const awaitingInventory = transactions.filter(t => t.status === "awaiting_inventory");
  return <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {awaitingInventory.length > 0 && <div className="mb-6">
            {awaitingInventory.map(transaction => <InventoryAlert key={transaction.id} message={`Transaction waiting for inventory to become available`} product={transaction.voucher || ""} quantity={transaction.quantity} />)}
          </div>}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference Id</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Voucher</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length > 0 ? transactions.map(transaction => <TableRow key={transaction.id}>
                  <TableCell className="font-medium">{transaction.customer}</TableCell>
                  <TableCell>{transaction.date}</TableCell>
                  <TableCell>{transaction.voucher || "-"}</TableCell>
                  <TableCell>{transaction.quantity}</TableCell>
                  <TableCell>₵{transaction.amount.replace('$', '')}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        transaction.status === "completed" ? "default" : 
                        transaction.status === "pending" ? "secondary" : 
                        transaction.status === "awaiting_inventory" ? "destructive" :
                        transaction.status === "compromised" ? "outline" :
                        "destructive"
                      }
                       className={
                        transaction.status === "completed" ? "bg-green-600" : 
                        transaction.status === "pending" ? "bg-blue-600" : 
                        transaction.status === "compromised" ? "bg-red-600 text-white border-red-600" :
                        ""
                      }
                    >
                      {transaction.status === "awaiting_inventory" ? "Awaiting Stock" : 
                       transaction.status === "compromised" ? "Security Alert" : 
                       transaction.status}
                    </Badge>
                  </TableCell>
                </TableRow>) : <TableRow>
                <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                  No transactions found
                </TableCell>
              </TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>;
}
