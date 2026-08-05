import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw } from "lucide-react";
import { useAffiliateAnalytics, isAffiliateTransaction } from "@/hooks/useAffiliateAnalytics";

const formatDateTime = (d?: string) =>
  d
    ? new Date(d).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

const statusVariant = (status?: string | null) => {
  const s = String(status ?? "").toLowerCase();
  if (["completed", "success", "successful", "paid"].includes(s)) return "default";
  if (s === "failed") return "destructive";
  return "secondary";
};

export function WebhookTransactionsTable() {
  const { transactions, isLoading, refetch } = useAffiliateAnalytics();
  const [search, setSearch] = useState("");
  const [affiliatesOnly, setAffiliatesOnly] = useState(false);
  const [limit, setLimit] = useState(100);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions
      .filter((t) => (affiliatesOnly ? isAffiliateTransaction(t) : true))
      .filter((t) =>
        q
          ? [t.reference, t.phone_number, t.product, t.status, t.source_hook]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(q))
          : true
      );
  }, [transactions, search, affiliatesOnly]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Webhook Transactions ({filtered.length})</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Search reference, phone, hook..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64"
          />
          <Button
            variant={affiliatesOnly ? "default" : "outline"}
            onClick={() => setAffiliatesOnly((v) => !v)}
          >
            Affiliates only
          </Button>
          <Button variant="outline" onClick={refetch} disabled={isLoading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source Hook</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  No transactions found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.slice(0, limit).map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs">{t.reference ?? "-"}</TableCell>
                  <TableCell>{t.phone_number ?? "-"}</TableCell>
                  <TableCell>{t.product ?? "-"}</TableCell>
                  <TableCell>{t.quantity ?? 0}</TableCell>
                  <TableCell>₵{Number(t.amount ?? 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(t.status) as any}>
                      {t.status ?? "unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell>{t.source_hook ? t.source_hook : "-"}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDateTime(t.created_at)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {filtered.length > limit && (
          <div className="mt-4 flex justify-center">
            <Button variant="outline" onClick={() => setLimit((l) => l + 100)}>
              Load more
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
