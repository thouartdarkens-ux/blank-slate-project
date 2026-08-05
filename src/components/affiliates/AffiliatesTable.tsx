import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { RefreshCw, Save } from "lucide-react";

const ENDPOINT =
  "https://ngqlvcbkbxoqpdvmofto.supabase.co/functions/v1/api-affiliates";

interface Affiliate {
  id: string;
  username?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  ussd_code?: string | null;
  commission_rate?: number | string | null;
  balance?: number | null;
  momo_number?: string | null;
  momo_name?: string | null;
  source_hook?: string | null;
  created_at?: string;
  updated_at?: string;
  [k: string]: any;
}

const formatDate = (d?: string) =>
  d
    ? new Date(d).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

export function AffiliatesTable() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(ENDPOINT, { method: "GET" });
      const data = await res.json();
      const list: Affiliate[] = data?.affiliates ?? data?.data ?? [];
      setRows(list);
    } catch (err: any) {
      toast({
        title: "Failed to load affiliates",
        description: err?.message || String(err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateField = (idx: number, field: keyof Affiliate, value: any) => {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleSave = async (row: Affiliate) => {
    setSavingId(row.id);
    try {
      const body = {
        id: row.id,
        username: row.username ?? "",
        full_name: row.full_name ?? "",
        email: row.email ?? "",
        phone: row.phone ?? "",
        ussd_code: row.ussd_code ?? "",
        commission_rate:
          row.commission_rate === "" || row.commission_rate == null
            ? null
            : Number(row.commission_rate),
        momo_number: row.momo_number ?? "",
        momo_name: row.momo_name ?? "",
        source_hook: row.source_hook ?? "",
      };
      const res = await fetch(ENDPOINT, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed with ${res.status}`);
      }
      toast({ title: "Saved", description: "Affiliate updated successfully." });
    } catch (err: any) {
      toast({
        title: "Save failed",
        description: err?.message || String(err),
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Affiliates</CardTitle>
        <Button variant="outline" onClick={load} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>USSD Code</TableHead>
              <TableHead>Commission %</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Lifetime Commissions</TableHead>
              <TableHead>Sales Qty</TableHead>
              <TableHead>Sales Amount</TableHead>
              <TableHead>MoMo Number</TableHead>
              <TableHead>MoMo Name</TableHead>
              <TableHead>Source Hook</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={15} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={15} className="text-center py-8 text-muted-foreground">
                  No affiliates found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, idx) => (
                <TableRow key={row.id}>
                  <TableCell className="min-w-[160px]">
                    <Input
                      value={row.username ?? ""}
                      onChange={(e) => updateField(idx, "username", e.target.value)}
                    />
                  </TableCell>
                  <TableCell className="min-w-[180px]">
                    <Input
                      value={row.full_name ?? ""}
                      onChange={(e) => updateField(idx, "full_name", e.target.value)}
                    />
                  </TableCell>
                  <TableCell className="min-w-[200px]">
                    <Input
                      type="email"
                      value={row.email ?? ""}
                      onChange={(e) => updateField(idx, "email", e.target.value)}
                    />
                  </TableCell>
                  <TableCell className="min-w-[130px]">
                    <Input
                      value={row.phone ?? ""}
                      onChange={(e) => updateField(idx, "phone", e.target.value)}
                    />
                  </TableCell>
                  <TableCell className="min-w-[130px]">
                    <Input
                      value={row.ussd_code ?? ""}
                      onChange={(e) => updateField(idx, "ussd_code", e.target.value)}
                    />
                  </TableCell>
                  <TableCell className="min-w-[100px]">
                    <Input
                      type="number"
                      step="0.01"
                      value={row.commission_rate ?? ""}
                      onChange={(e) => updateField(idx, "commission_rate", e.target.value)}
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    ₵{Number(row.balance ?? 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    ₵{Number(row.lifetime_commissions ?? 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {Number(row.sales_quantity ?? 0)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    ₵{Number(row.sales_amount ?? 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="min-w-[150px]">
                    <Input
                      value={row.momo_number ?? ""}
                      onChange={(e) => updateField(idx, "momo_number", e.target.value)}
                    />
                  </TableCell>
                  <TableCell className="min-w-[150px]">
                    <Input
                      value={row.momo_name ?? ""}
                      onChange={(e) => updateField(idx, "momo_name", e.target.value)}
                    />
                  </TableCell>
                  <TableCell className="min-w-[130px]">
                    <Input
                      value={row.source_hook ?? ""}
                      onChange={(e) => updateField(idx, "source_hook", e.target.value)}
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(row.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() => handleSave(row)}
                      disabled={savingId === row.id}
                      className="gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {savingId === row.id ? "Saving..." : "Save"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
