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
import BackgroundImageSlider from "@/components/BackgroundImageSlider";

type DashboardData = {
  profile: any;
  transactions: any[];
  withdrawals: any[];
  stats: {
    totalSales: number;
    totalCommissions: number;
    availableBalance: number;
    transactionCount: number;
    successfulCount: number;
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
      <div className="min-h-screen w-full relative flex items-center justify-center">
        <BackgroundImageSlider />
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-green-500 border-t-transparent animate-spin" />
          <p className="text-gray-100 drop-shadow">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const { profile, stats, transactions, withdrawals } = data;

  return (
    <div className="min-h-screen w-full relative">
      <BackgroundImageSlider />
      <div className="relative z-10">
        <header className="bg-black/55 backdrop-blur-md border-b border-white/15">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white drop-shadow">Affiliate Dashboard</h1>
              <p className="text-sm text-gray-200">Welcome, {profile.full_name}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white"
            >
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* Profile */}
          <Card className="bg-black/50 backdrop-blur-md border border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Profile Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <ProfileField label="Full Name" value={profile.full_name} />
              <ProfileField label="Username" value={profile.username} />
              <ProfileField label="Phone" value={profile.phone || "-"} />
              <ProfileField label="Email" value={profile.email || "-"} />
              <div>
                <p className="text-gray-300 flex items-center gap-1">
                  <Hash className="w-3 h-3" /> Assigned USSD Code
                </p>
                <p className="font-medium text-white">{profile.ussd_code || "-"}</p>
              </div>
              <div>
                <p className="text-gray-300">Commission Rate</p>
                <p className="font-medium text-white">{profile.commission_rate}%</p>
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
                <Button className="bg-green-700 hover:bg-green-800 text-white border border-green-500/50">
                  <Wallet className="w-4 h-4 mr-2" /> Request Withdrawal
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-white/20">
                <DialogHeader>
                  <DialogTitle className="text-white">Request Withdrawal</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <p className="text-sm text-gray-200">
                    Available: <span className="font-semibold text-white">{fmt(stats.availableBalance)}</span>
                  </p>
                  <div>
                    <Label htmlFor="amount" className="text-gray-100">Amount (GHS)</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={wdAmount}
                      onChange={(e) => setWdAmount(e.target.value)}
                      className="bg-white/10 border-white/25 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes" className="text-gray-100">Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      value={wdNotes}
                      onChange={(e) => setWdNotes(e.target.value)}
                      placeholder="Momo number, bank details, etc."
                      className="bg-white/10 border-white/25 text-white placeholder:text-gray-400"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={submitWithdrawal}
                    disabled={submitting}
                    className="bg-green-700 hover:bg-green-800 text-white"
                  >
                    {submitting ? "Submitting..." : "Submit Request"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Recent transactions */}
          <Card className="bg-black/50 backdrop-blur-md border border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {transactions.length === 0 ? (
                <p className="text-sm text-gray-200">No transactions yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-gray-200">Date</TableHead>
                      <TableHead className="text-gray-200">Reference</TableHead>
                      <TableHead className="text-gray-200">Phone</TableHead>
                      <TableHead className="text-gray-200">Product</TableHead>
                      <TableHead className="text-gray-200">Qty</TableHead>
                      <TableHead className="text-gray-200">Amount</TableHead>
                      <TableHead className="text-gray-200">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.slice(0, 50).map((t) => (
                      <TableRow key={t.id} className="border-white/10">
                        <TableCell className="text-xs text-gray-100">
                          {new Date(t.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-gray-100">{t.reference}</TableCell>
                        <TableCell className="text-gray-100">{t.phone_number}</TableCell>
                        <TableCell className="text-gray-100">{t.product}</TableCell>
                        <TableCell className="text-gray-100">{t.quantity}</TableCell>
                        <TableCell className="text-gray-100">{fmt(Number(t.amount))}</TableCell>
                        <TableCell>
                          <Badge
                            variant={String(t.status).toLowerCase() === "success" ? "default" : "secondary"}
                            className={
                              String(t.status).toLowerCase() === "success"
                                ? "bg-green-700 text-white hover:bg-green-700"
                                : "bg-white/15 text-gray-100 hover:bg-white/15"
                            }
                          >
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
          <Card className="bg-black/50 backdrop-blur-md border border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Withdrawal History</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {withdrawals.length === 0 ? (
                <p className="text-sm text-gray-200">No withdrawal requests yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-gray-200">Requested</TableHead>
                      <TableHead className="text-gray-200">Amount</TableHead>
                      <TableHead className="text-gray-200">Status</TableHead>
                      <TableHead className="text-gray-200">Notes</TableHead>
                      <TableHead className="text-gray-200">Processed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawals.map((w) => (
                      <TableRow key={w.id} className="border-white/10">
                        <TableCell className="text-xs text-gray-100">
                          {new Date(w.requested_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-gray-100">{fmt(Number(w.amount))}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              w.status === "paid"
                                ? "bg-green-700 text-white hover:bg-green-700"
                                : w.status === "rejected"
                                  ? "bg-red-600 text-white hover:bg-red-600"
                                  : "bg-white/15 text-gray-100 hover:bg-white/15"
                            }
                          >
                            {w.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-gray-100">{w.notes || "-"}</TableCell>
                        <TableCell className="text-xs text-gray-100">
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
    </div>
  );
};

const ProfileField = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-gray-300">{label}</p>
    <p className="font-medium text-white">{value}</p>
  </div>
);

const StatCard = ({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) => (
  <Card className="bg-black/50 backdrop-blur-md border border-white/10 hover:border-green-500/60 transition-all duration-300">
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-green-600/30 border border-green-500/40 flex items-center justify-center">
          <Icon className="w-5 h-5 text-green-400" />
        </div>
        <div>
          <p className="text-xs text-gray-200">{label}</p>
          <p className="text-lg font-bold text-white">{value}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default AffiliateDashboard;
