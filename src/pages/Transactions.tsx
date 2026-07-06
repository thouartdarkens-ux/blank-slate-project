import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Loader2, RotateCcw, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const statusStyles: Record<string, string> = {
  completed: "bg-success/15 text-success border-success/30",
  pending: "bg-warning/15 text-warning border-warning/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
};

interface BundlePrice {
  network: string;
  capacity: string;
  cost_price: number;
  selling_price: number;
}

const Transactions = () => {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["data_transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_transactions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: bundlePrices = [] } = useQuery({
    queryKey: ["bundle_prices_lookup"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bundle_prices")
        .select("network, capacity, cost_price, selling_price");
      if (error) throw error;
      return data as BundlePrice[];
    },
  });

  const priceMap = new Map(
    bundlePrices.map((b) => [`${b.network}:${b.capacity}`, b])
  );

  const getProfit = (network: string, capacity: string) => {
    const bundle = priceMap.get(`${network}:${capacity}`);
    if (bundle && bundle.selling_price > 0) {
      return bundle.selling_price - bundle.cost_price;
    }
    return 0;
  };

  const retryMutation = useMutation({
    mutationFn: async (txn: (typeof transactions)[0]) => {
      const isTelecel = txn.network.toUpperCase() === "TELECEL";
      const targetFunction = isTelecel ? "apexdata" : "purchase-data";
      const { data, error } = await supabase.functions.invoke(targetFunction, {
        body: {
          phoneNumber: txn.phone_number,
          network: txn.network,
          capacity: txn.capacity,
          amount: txn.amount,
          paystackReference: txn.transaction_reference || txn.paystack_id || null,
          retryTransactionId: txn.id,
        },
      });
      if (error) {
        throw new Error(error.message || "Retry failed");
      }
      if (!data?.success && data?.status !== "success") {
        throw new Error(data?.message || data?.error || "Retry failed");
      }
      return data;
    },
    onSuccess: () => {
      toast.success("Retry successful!");
      queryClient.invalidateQueries({ queryKey: ["data_transactions"] });
    },
    onError: (err: Error) => {
      toast.error(`Retry failed: ${err.message}`);
    },
  });

  const apexStatusMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/check-apex-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to check apex status");
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Checked ${data.total} Telecel orders. ${data.updated} updated.`);
      queryClient.invalidateQueries({ queryKey: ["data_transactions"] });
    },
    onError: (err: Error) => {
      toast.error(`Apex status check failed: ${err.message}`);
    },
  });

  const filtered =
    filterStatus === "all"
      ? transactions
      : transactions.filter((t) => t.status === filterStatus);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          disabled={apexStatusMutation.isPending}
          onClick={() => apexStatusMutation.mutate()}
          className="gap-1.5"
        >
          {apexStatusMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Apex Status Update
        </Button>
        <span className="text-sm text-muted-foreground">
          {filtered.length} transaction{filtered.length !== 1 && "s"}
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Network</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Amount (GH₵)</TableHead>
                    <TableHead>Profit (GH₵)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Paystack ID</TableHead>
                    <TableHead>Order Ref</TableHead>
                    <TableHead>Transaction Ref</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => {
                    const profit = getProfit(t.network, t.capacity);
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(t.created_at), "dd MMM yyyy HH:mm")}
                        </TableCell>
                        <TableCell>{t.phone_number}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{t.network}</Badge>
                        </TableCell>
                        <TableCell>{t.capacity}</TableCell>
                        <TableCell>{Number(t.amount).toFixed(2)}</TableCell>
                        <TableCell className="text-success font-semibold">
                          {profit > 0 ? profit.toFixed(2) : "—"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${statusStyles[t.status] ?? ""}`}
                          >
                            {t.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground max-w-[140px] truncate" title={(t as any).paystack_id || ""}>
                          {(t as any).paystack_id || "—"}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground max-w-[140px] truncate" title={t.order_reference || ""}>
                          {t.order_reference || "—"}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground max-w-[140px] truncate" title={t.transaction_reference || ""}>
                          {t.transaction_reference || "—"}
                        </TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate" title={t.error_message || ""}>
                          {t.status === "failed" && t.error_message ? (
                            <span className="text-destructive">{t.error_message}</span>
                          ) : t.status === "completed" && t.error_message ? (
                            <span className="text-success">{t.error_message}</span>
                          ) : t.status === "completed" ? (
                            <span className="text-success">Delivered successfully</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {t.status === "failed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={retryMutation.isPending}
                              onClick={() => retryMutation.mutate(t)}
                              className="gap-1.5"
                            >
                              {retryMutation.isPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="h-3.5 w-3.5" />
                              )}
                              Retry
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Transactions;
