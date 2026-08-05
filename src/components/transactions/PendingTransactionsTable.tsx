import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableBody, TableCell, TableHead } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PlayCircle, RefreshCw, Loader2, ChevronDown } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { retrySingleTransaction } from "@/utils/retrySingleTransaction";
import { processPendingTransactions } from "@/utils/processPendingTransactions";

// ... keep existing code (interfaces)
interface PendingTransaction {
  id: string;
  reference: string | null;
  phone_number: string;
  product: string | null;
  quantity: number;
  amount: number;
  date: string;
  status: string;
}

interface PendingTransactionsTableProps {
  transactions: PendingTransaction[];
  onRefresh: () => void;
}

export function PendingTransactionsTable({ transactions, onRefresh }: PendingTransactionsTableProps) {
  const { toast } = useToast();
  const [processingAll, setProcessingAll] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);

  if (transactions.length === 0) return null;

  // ... keep existing code (handleRetrySingle and handleProcessAll)
  const handleRetrySingle = async (id: string) => {
    setProcessingIds(prev => new Set(prev).add(id));
    try {
      const result = await retrySingleTransaction(id);
      if (result.success) {
        toast({ title: "Success", description: result.message });
        onRefresh();
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to process transaction", variant: "destructive" });
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleProcessAll = async () => {
    setProcessingAll(true);
    try {
      const result = await processPendingTransactions();
      if (result.success) {
        toast({ title: "Success", description: result.message });
        onRefresh();
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to process pending transactions", variant: "destructive" });
    } finally {
      setProcessingAll(false);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-orange-200 dark:border-orange-800">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between space-y-2 md:space-y-0">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 text-left cursor-pointer">
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-0" : "-rotate-90"}`} />
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <PlayCircle className="h-5 w-5 text-orange-500" />
                    Pending Transactions ({transactions.length})
                  </CardTitle>
                  <CardDescription>Transactions awaiting processing with amount greater than zero</CardDescription>
                </div>
              </button>
            </CollapsibleTrigger>
            <Button
              onClick={handleProcessAll}
              disabled={processingAll}
              size="sm"
              className="flex items-center gap-2"
            >
              {processingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
              {processingAll ? "Processing All..." : "Process All"}
            </Button>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">{t.reference || "-"}</TableCell>
                      <TableCell>{t.phone_number}</TableCell>
                      <TableCell>{t.product || "-"}</TableCell>
                      <TableCell>{t.quantity}</TableCell>
                      <TableCell>GHC {Number(t.amount).toFixed(2)}</TableCell>
                      <TableCell>{new Date(t.date).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                          {t.status === 'awaiting_inventory' ? 'Awaiting Stock' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRetrySingle(t.id)}
                          disabled={processingIds.has(t.id) || processingAll}
                        >
                          {processingIds.has(t.id) ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                          <span className="ml-1">Retry</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}