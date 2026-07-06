import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LogOut, Wallet, TrendingUp, DollarSign, Hash } from "lucide-react";

type DashboardData = {
  profile: any;
  transactions: any[];
  withdrawals: any[];
  stats: {
    totalSales: number;
    totalCommissions: number;
    availableBalance: number;
    transactionCount: number;
  };
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n || 0);

const AffiliateDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [wdOpen, setWdOpen] = useState(false);
  const [wdAmount, setWdAmount] = useState("");
  const [wdNotes, setWdNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem("affiliate_token");

  const load = async () => {
    if (!token) {
      navigate("/affiliate/login");
      return;
    }
    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("affiliate-dashboard", {
        body: { token },
      });
      if (error || res?.error) throw new Error(res?.error || error?.message);
      setData(res);
    } catch (e: any) {
      toast.error(e.message || "Failed to load");
      localStorage.removeItem("affiliate_token");
      navigate("/affiliate/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = () => {
    localStorage.removeItem("affiliate_token");
    localStorage.removeItem("affiliate_profile");
    navigate("/affiliate");
  };

  const submitWithdrawal = async () => {
    const amt = Number(wdAmount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (data && amt > data.stats.availableBalance)
      return toast.error("Amount exceeds available balance");
    setSubmitting(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("affiliate-withdraw", {
        body: { token, amount: amt, notes: wdNotes },
      });
      if (error || res?.error) throw new Error(res?.error || error?.message);
      toast.success("Withdrawal requested");
      setWdOpen(false);
      setWdAmount("");
      setWdNotes("");
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  const { profile, stats, transactions, withdrawals } = data;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Affiliate Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome, {profile.full_name}</p>
          </div>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Full Name</p>
              <p className="font-medium">{profile.full_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Username</p>
              <p className="font-medium">{profile.username}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Phone</p>
              <p className="font-medium">{profile.phone || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium">{profile.email || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground flex items-center gap-1">
                <Hash className="w-3 h-3" /> Assigned USSD Code
              </p>
              <p className="font-medium">{profile.ussd_code || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Commission Rate</p>
              <p className="font-medium">{profile.commission_rate}%</p>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={TrendingUp} label="Total Sales" value={fmt(stats.totalSales)} />
          <StatCard icon={DollarSign} label="Total Commissions" value={fmt(stats.totalCommissions)} />
          <StatCard icon={Wallet} label="Available Balance" value={fmt(stats.availableBalance)} />
          <StatCard icon={Hash} label="Transactions" value={String(stats.transactionCount)} />
        </div>

        <div className="flex justify-end">
          <Dialog open={wdOpen} onOpenChange={setWdOpen}>
            <DialogTrigger asChild>
              <Button>Request Withdrawal</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Withdrawal</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Available: <span className="font-semibold">{fmt(stats.availableBalance)}</span>
                </p>
                <div>
                  <Label htmlFor="amount">Amount (GHS)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={wdAmount}
                    onChange={(e) => setWdAmount(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    value={wdNotes}
                    onChange={(e) => setWdNotes(e.target.value)}
                    placeholder="Momo number, bank details, etc."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={submitWithdrawal} disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Request"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Recent transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transactions yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.slice(0, 50).map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs">
                        {new Date(t.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{t.reference}</TableCell>
                      <TableCell>{t.phone_number}</TableCell>
                      <TableCell>{t.product}</TableCell>
                      <TableCell>{t.quantity}</TableCell>
                      <TableCell>{fmt(Number(t.amount))}</TableCell>
                      <TableCell>
                        <Badge variant={t.status === "success" ? "default" : "secondary"}>
                          {t.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Withdrawal history */}
        <Card>
          <CardHeader>
            <CardTitle>Withdrawal History</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {withdrawals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No withdrawal requests yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requested</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Processed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="text-xs">
                        {new Date(w.requested_at).toLocaleString()}
                      </TableCell>
                      <TableCell>{fmt(Number(w.amount))}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            w.status === "paid"
                              ? "default"
                              : w.status === "rejected"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {w.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{w.notes || "-"}</TableCell>
                      <TableCell className="text-xs">
                        {w.processed_at ? new Date(w.processed_at).toLocaleString() : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

const StatCard = ({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default AffiliateDashboard;
