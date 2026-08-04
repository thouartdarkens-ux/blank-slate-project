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
import { LogOut, Wallet, TrendingUp, DollarSign, Hash, ArrowLeft, Clock, Smartphone, Pencil, RefreshCw } from "lucide-react";
import BackgroundImageSlider from "@/components/BackgroundImageSlider";
import { Link } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DashboardData = {
  profile: any;
  transactions: any[];
  withdrawals: any[];
  stats: {
    totalSales: number;
    totalCommissions: number;
    availableBalance: number;
    transactionCount: number;
    pendingWithdrawals: number;
  };
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n || 0);

const statusVariant = (status: string): "default" | "secondary" | "destructive" => {
  const s = (status || "").toLowerCase();
  if (s === "completed" || s === "paid" || s === "approved") return "default";
  if (s === "failed" || s === "rejected") return "destructive";
  return "secondary";
};

const AffiliateDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [wdOpen, setWdOpen] = useState(false);
  const [wdAmount, setWdAmount] = useState("");
  const [wdNotes, setWdNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [momoOpen, setMomoOpen] = useState(false);
  const [momoNumber, setMomoNumber] = useState("");
  const [momoName, setMomoName] = useState("");
  const [momoNetwork, setMomoNetwork] = useState("");
  const [savingMomo, setSavingMomo] = useState(false);
  const [txSearch, setTxSearch] = useState("");
  const [txStatus, setTxStatus] = useState<string>("all");
  const [txProduct, setTxProduct] = useState<string>("all");

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
    if (!data?.profile?.momo_number || !data?.profile?.momo_name) {
      toast.error("Set your Mobile Money payout details before requesting a withdrawal");
      return;
    }
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

  const openMomoEditor = () => {
    setMomoNumber(data?.profile?.momo_number || "");
    setMomoName(data?.profile?.momo_name || "");
    setMomoNetwork(data?.profile?.momo_network || "");
    setMomoOpen(true);
  };

  const saveMomo = async () => {
    if (!/^0\d{9}$/.test(momoNumber.trim()))
      return toast.error("Enter a valid 10-digit Momo number starting with 0");
    if (momoName.trim().length < 2) return toast.error("Enter the Momo account name");
    if (!momoNetwork) return toast.error("Select a mobile money network");
    setSavingMomo(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("affiliate-update-momo", {
        body: { token, momo_number: momoNumber.trim(), momo_name: momoName.trim(), momo_network: momoNetwork },
      });
      if (error || res?.error) throw new Error(res?.error || error?.message);
      toast.success("Momo details saved");
      setMomoOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSavingMomo(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center relative">
        <BackgroundImageSlider />
        <p className="relative z-10 text-gray-100 drop-shadow">Loading dashboard...</p>
      </div>
    );
  }

  const { profile, stats, transactions, withdrawals } = data;

  return (
    <div className="min-h-screen w-full overflow-x-hidden relative">
      <BackgroundImageSlider />
      <div className="relative z-10 w-full">
        {/* Account under review banner */}
        {!profile.ussd_code && (
          <div className="bg-amber-600/90 border-b border-amber-400/50 px-4 py-2.5 text-center text-white text-sm font-medium">
            Your account is under review. Your USSD code will be assigned once approved.
          </div>
        )}
        {/* Header */}
        <header className="border-b border-white/10 bg-black/50 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white drop-shadow">Affiliate Dashboard</h1>
              <p className="text-sm text-gray-200">Welcome, {profile.full_name}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/affiliate"
                className="hidden sm:inline-flex items-center gap-1.5 text-sm text-gray-200 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Affiliate Info
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={load}
                disabled={loading}
                className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white"
              >
                <LogOut className="w-4 h-4 mr-2" /> Logout
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* Profile */}
          <Card className="bg-black/50 backdrop-blur-md border border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Profile Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <ProfileItem label="Full Name" value={profile.full_name} />
              <ProfileItem label="Username" value={profile.username} />
              <ProfileItem label="Email" value={profile.email || "-"} />
              <ProfileItem
                label="Assigned USSD Code"
                value={profile.ussd_code || "Account under review"}
                icon={<Hash className="w-3 h-3" />}
              />
              <ProfileItem label="Agent Code" value={profile.source_hook ? profile.source_hook.toUpperCase() : "-"} />
            </CardContent>
          </Card>

          {/* Momo Payout Details */}
          <Card className="bg-black/50 backdrop-blur-md border border-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5" /> Mobile Money Payout Details
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={openMomoEditor}
                className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white"
              >
                <Pencil className="w-4 h-4 mr-2" />
                {profile.momo_number ? "Edit" : "Set Details"}
              </Button>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <ProfileItem label="Momo Number" value={profile.momo_number || "Not set"} />
              <ProfileItem label="Momo Name" value={profile.momo_name || "Not set"} />
              <ProfileItem label="Network" value={profile.momo_network || "Not set"} />
            </CardContent>
          </Card>

          <Dialog open={momoOpen} onOpenChange={setMomoOpen}>
            <DialogContent className="bg-white">
              <DialogHeader>
                <DialogTitle>Mobile Money Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Withdrawals will be sent to this Mobile Money account.
                </p>
                <div>
                  <Label htmlFor="momo-number">Momo Number</Label>
                  <Input
                    id="momo-number"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="0551234567"
                    value={momoNumber}
                    onChange={(e) => setMomoNumber(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
                <div>
                  <Label htmlFor="momo-name">Account Name</Label>
                  <Input
                    id="momo-name"
                    placeholder="Full name on Momo account"
                    value={momoName}
                    onChange={(e) => setMomoName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Network</Label>
                  <Select value={momoNetwork} onValueChange={setMomoNetwork}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select network" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MTN">MTN</SelectItem>
                      <SelectItem value="TELECEL">TELECEL</SelectItem>
                      <SelectItem value="AT">AT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={saveMomo}
                  disabled={savingMomo}
                  className="bg-green-700 hover:bg-green-800 text-white"
                >
                  {savingMomo ? "Saving..." : "Save Details"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={TrendingUp} label="Total Sales" value={fmt(stats.totalSales)} />
            <StatCard icon={DollarSign} label="Total Commissions" value={fmt(stats.totalCommissions)} />
            <StatCard icon={Wallet} label="Available Balance" value={fmt(stats.availableBalance)} highlight />
            <StatCard icon={Hash} label="Transactions" value={String(stats.transactionCount)} />
          </div>

          {stats.pendingWithdrawals > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-yellow-900/40 border border-yellow-500/30 px-4 py-3 text-sm text-yellow-100">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span>
                Pending withdrawal requests: <span className="font-semibold">{fmt(stats.pendingWithdrawals)}</span>
              </span>
            </div>
          )}

          {/* Withdrawal action */}
          <div className="flex justify-end">
            <Dialog open={wdOpen} onOpenChange={setWdOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-700 hover:bg-green-800 text-white border border-green-500/50">
                  <Wallet className="w-4 h-4 mr-2" /> Request Withdrawal
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white">
                <DialogHeader>
                  <DialogTitle>Request Withdrawal</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Available: <span className="font-semibold">{fmt(stats.availableBalance)}</span>
                  </p>
                  <div className="rounded-md border bg-muted/50 p-3 text-sm space-y-1">
                    <p className="font-medium">Payout Mobile Money Details</p>
                    <p>
                      <span className="text-muted-foreground">Number: </span>
                      <span className="font-mono">{profile.momo_number || "Not set"}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Name: </span>
                      <span>{profile.momo_name || "Not set"}</span>
                    </p>
                    {(!profile.momo_number || !profile.momo_name) && (
                      <p className="text-xs text-destructive">
                        Contact support to set your Momo details before requesting a withdrawal.
                      </p>
                    )}
                  </div>
                  <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-xs text-yellow-900">
                    All withdrawals are processed between <span className="font-semibold">10:00 AM and 5:00 PM</span>.
                  </div>
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
                      placeholder="Any additional details..."
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
            <CardContent className="overflow-x-auto space-y-3">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="Search reference or phone..."
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                />
                <select
                  value={txStatus}
                  onChange={(e) => setTxStatus(e.target.value)}
                  className="rounded-md bg-white/10 border border-white/20 text-white text-sm px-3 py-2"
                >
                  <option value="all" className="text-black">All statuses</option>
                  <option value="completed" className="text-black">Completed</option>
                  <option value="pending" className="text-black">Pending</option>
                  <option value="failed" className="text-black">Failed</option>
                </select>
                <select
                  value={txProduct}
                  onChange={(e) => setTxProduct(e.target.value)}
                  className="rounded-md bg-white/10 border border-white/20 text-white text-sm px-3 py-2"
                >
                  <option value="all" className="text-black">All products</option>
                  {Array.from(new Set(transactions.map((t) => (t.product || "").toUpperCase()).filter(Boolean))).map(
                    (p) => (
                      <option key={p} value={p} className="text-black">
                        {p}
                      </option>
                    ),
                  )}
                </select>
              </div>
              {(() => {
                const q = txSearch.trim().toLowerCase();
                const filtered = transactions.filter((t) => {
                  const matchesQ =
                    !q ||
                    (t.reference || "").toLowerCase().includes(q) ||
                    (t.phone_number || "").toLowerCase().includes(q);
                  const matchesStatus =
                    txStatus === "all" || (t.status || "").toLowerCase() === txStatus;
                  const matchesProduct =
                    txProduct === "all" || (t.product || "").toUpperCase() === txProduct;
                  return matchesQ && matchesStatus && matchesProduct;
                });
                if (filtered.length === 0) {
                  return <p className="text-sm text-gray-200">No transactions match your filters.</p>;
                }
                return (
                <div className="rounded-lg overflow-hidden border border-white/10">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-transparent">
                        <TableHead className="text-gray-200">Date</TableHead>
                        <TableHead className="text-gray-200">Reference</TableHead>
                        <TableHead className="text-gray-200">Product</TableHead>
                        <TableHead className="text-gray-200">Qty</TableHead>
                        <TableHead className="text-gray-200">Amount</TableHead>
                        <TableHead className="text-gray-200">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.slice(0, 50).map((t) => (
                        <TableRow key={t.id} className="border-white/10 hover:bg-white/5">
                          <TableCell className="text-xs text-gray-100">
                            {t.created_at ? new Date(t.created_at).toLocaleString() : "-"}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-gray-100">
                            {t.reference || "-"}
                          </TableCell>
                          <TableCell className="text-gray-100">{t.product || "-"}</TableCell>
                          <TableCell className="text-gray-100">{t.quantity ?? "-"}</TableCell>
                          <TableCell className="text-gray-100">{fmt(Number(t.amount))}</TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(t.status)}>
                              {t.status || "—"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                );
              })()}
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
                <div className="rounded-lg overflow-hidden border border-white/10">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-transparent">
                        <TableHead className="text-gray-200">Requested</TableHead>
                        <TableHead className="text-gray-200">Amount</TableHead>
                        <TableHead className="text-gray-200">Status</TableHead>
                        <TableHead className="text-gray-200">Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {withdrawals.map((w) => (
                        <TableRow key={w.id} className="border-white/10 hover:bg-white/5">
                          <TableCell className="text-xs text-gray-100">
                            {new Date(w.requested_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-gray-100">{fmt(Number(w.amount))}</TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(w.status)}>{w.status}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-gray-100">
                            <div className="max-w-[200px] max-h-16 overflow-y-auto whitespace-normal break-words">
                              {w.notes || "-"}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

const ProfileItem = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) => (
  <div>
    <p className="text-gray-300 flex items-center gap-1">
      {icon}
      {label}
    </p>
    <p className="font-medium text-white">{value}</p>
  </div>
);

const StatCard = ({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: any;
  label: string;
  value: string;
  highlight?: boolean;
}) => (
  <Card
    className={
      highlight
        ? "bg-green-900/50 backdrop-blur-md border border-green-500/40"
        : "bg-black/50 backdrop-blur-md border border-white/10"
    }
  >
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div
          className={
            "w-10 h-10 rounded-lg flex items-center justify-center " +
            (highlight ? "bg-green-500/30 border border-green-400/40" : "bg-white/10 border border-white/20")
          }
        >
          <Icon className={"w-5 h-5 " + (highlight ? "text-green-300" : "text-gray-100")} />
        </div>
        <div>
          <p className="text-xs text-gray-300">{label}</p>
          <p className={"text-lg font-bold " + (highlight ? "text-green-300" : "text-white")}>{value}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default AffiliateDashboard;
