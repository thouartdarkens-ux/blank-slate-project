import { useEffect, useState } from "react";
import { MainLayout } from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { RefreshCw, Save, PlayCircle } from "lucide-react";
import { AffiliatesTable } from "@/components/affiliates/AffiliatesTable";
import { AffiliateDashboard } from "@/components/affiliates/AffiliateDashboard";
import { WebhookTransactionsTable } from "@/components/affiliates/WebhookTransactionsTable";
import { AffiliateIncomeAnalytics } from "@/components/affiliates/AffiliateIncomeAnalytics";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ENDPOINT =
  "https://ngqlvcbkbxoqpdvmofto.supabase.co/functions/v1/api-affiliate-withdrawals";

type Status = "pending" | "paid" | "rejected";

interface Withdrawal {
  id?: string;
  affiliate_id: string;
  amount: number | string;
  status: Status;
  note?: string | null;
  momo_number?: string | null;
  momo_name?: string | null;
  created_at?: string;
  [key: string]: any;
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

export default function AffiliatesControlPanelPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const processPending = async () => {
    setProcessing(true);
    try {
      const res = await fetch(
        "https://ngqlvcbkbxoqpdvmofto.supabase.co/functions/v1/process-pending-withdrawals",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "process" }),
        }
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed with ${res.status}`);
      }
      toast({ title: "Processing started", description: "Pending withdrawals are being processed." });
      load();
    } catch (err: any) {
      toast({
        title: "Failed to process",
        description: err?.message || String(err),
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(ENDPOINT, { method: "GET" });
      const data = await res.json();
      const list: Withdrawal[] = data?.withdrawals ?? data?.data ?? [];
      setRows(list);
    } catch (err: any) {
      toast({
        title: "Failed to load withdrawals",
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

  const updateField = (idx: number, field: keyof Withdrawal, value: any) => {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleSave = async (row: Withdrawal, idx: number) => {
    const key = row.id || `${idx}`;
    setSavingKey(key);
    try {
      const body = {
        id: row.id,
        affiliate_id: row.affiliate_id,
        amount: Number(row.amount),
        status: row.status,
        note: row.note ?? row.notes ?? "",
        momo_number: row.momo_number ?? "",
        momo_name: row.momo_name ?? "",
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
      toast({ title: "Saved", description: "Withdrawal updated successfully." });
    } catch (err: any) {
      toast({
        title: "Save failed",
        description: err?.message || String(err),
        variant: "destructive",
      });
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <MainLayout title="Affiliates Control Panel">
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="affiliates">Affiliates</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="income">Income Analytics</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard">
          <AffiliateDashboard />
        </TabsContent>
        <TabsContent value="transactions">
          <WebhookTransactionsTable />
        </TabsContent>
        <TabsContent value="income">
          <AffiliateIncomeAnalytics />
        </TabsContent>
        <TabsContent value="affiliates">
          <AffiliatesTable />
        </TabsContent>
        <TabsContent value="withdrawals">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Affiliate Withdrawals</CardTitle>
          <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={processing} className="gap-2">
                  <PlayCircle className={`h-4 w-4 ${processing ? "animate-pulse" : ""}`} />
                  {processing ? "Processing..." : "Process Pending Withdrawals"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Process pending withdrawals?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will trigger payouts for all pending affiliate withdrawals. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={processPending}>Yes, process</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="outline" onClick={load} disabled={loading} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Affiliate ID</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>MoMo Number</TableHead>
                <TableHead>MoMo Name</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No withdrawals found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, idx) => {
                  const key = row.id || `${idx}`;
                  return (
                    <TableRow key={key}>
                      <TableCell className="min-w-[180px]">
                        {row.affiliate_id ?? ""}
                         
                      </TableCell>
                      <TableCell className="min-w-[110px]">
                        {row.amount ?? ""}
                         
                      </TableCell>
                      <TableCell className="min-w-[140px]">
                        
                          {row.status}
                          
                      </TableCell>
                      <TableCell className="min-w-[150px]">
                      {row.momo_number ?? ""}
                      </TableCell>
                      <TableCell className="min-w-[150px]">  
                     {row.momo_name ?? ""}   
                      </TableCell>
                      <TableCell className="min-w-[200px]">    
                        {row.notes ?? row.note ?? ""}  
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(row.created_at)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
