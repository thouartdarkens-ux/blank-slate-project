import { useMemo, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, ShoppingCart, Activity, Wallet, AlertTriangle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BalanceAlertSettings } from "@/components/BalanceAlertSettings";
import { ManualProcessingSettings } from "@/components/ManualProcessingSettings";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, subDays, startOfWeek, endOfWeek, differenceInMinutes } from "date-fns";

interface BundlePrice {
  network: string;
  capacity: string;
  cost_price: number;
  selling_price: number;
}

const Dashboard = () => {
  const [balanceData, setBalanceData] = useState<{ balance: number; name: string; email: string } | null>(null);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("balance");
        if (!error && data?.status === "success") {
          const bal = data.data.balance;
          setBalanceData({
            balance: bal,
            name: data.data.user.name,
            email: data.data.user.email,
          });
          // Trigger balance alert check
          try {
            await supabase.functions.invoke("check-balance-alert", {
              body: { balance: bal },
            });
          } catch (alertErr) {
            console.error("Balance alert check failed:", alertErr);
          }
        }
      } catch (e) {
        console.error("Failed to fetch balance:", e);
      }
    };
    fetchBalance();
  }, []);

  const { data: transactions = [] } = useQuery({
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

  const priceMap = useMemo(
    () => new Map(bundlePrices.map((b) => [`${b.network}:${b.capacity}`, b])),
    [bundlePrices]
  );

  const getProfit = (network: string, capacity: string) => {
    const bundle = priceMap.get(`${network}:${capacity}`);
    if (bundle && bundle.selling_price > 0) {
      return bundle.selling_price - bundle.cost_price;
    }
    return 0;
  };

  const stats = useMemo(() => {
    const completed = transactions.filter((t) => t.status === "completed");
    const totalSales = completed.reduce((s, t) => s + Number(t.amount), 0);
    const grossProfit = completed.reduce(
      (s, t) => s + getProfit(t.network, t.capacity),
      0
    );
    const charges = grossProfit * 0.0195;
    const netProfit = grossProfit - charges;
    const totalOrders = completed.length;
    const pending = transactions.filter((t) => t.status === "pending").length;
    const failed = transactions.filter((t) => t.status === "failed").length;
    // Average processing time (completed transactions only)
    const processingTimes = completed
      .map((t) => differenceInMinutes(new Date(t.updated_at), new Date(t.created_at)))
      .filter((m) => m >= 0);
    const avgProcessingTime =
      processingTimes.length > 0
        ? processingTimes.reduce((s, m) => s + m, 0) / processingTimes.length
        : 0;

    return { totalSales, grossProfit, netProfit, charges, totalOrders, pending, failed, avgProcessingTime };
  }, [transactions, priceMap]);

  const chartData = useMemo(() => {
    const days = 7;
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, "yyyy-MM-dd");
      const dayTxns = transactions.filter(
        (t) =>
          t.status === "completed" &&
          format(new Date(t.created_at), "yyyy-MM-dd") === dateStr
      );
      data.push({
        day: format(date, "EEE"),
        sales: dayTxns.reduce((s, t) => s + Number(t.amount), 0),
        profit: dayTxns.reduce(
          (s, t) => s + getProfit(t.network, t.capacity),
          0
        ),
      });
    }
    return data;
  }, [transactions, priceMap]);

  const weeklyProcessingData = useMemo(() => {
    const weeks = 8;
    const data = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = startOfWeek(subDays(new Date(), i * 7), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(subDays(new Date(), i * 7), { weekStartsOn: 1 });
      const weekTxns = transactions.filter((t) => {
        if (t.status !== "completed") return false;
        const created = new Date(t.created_at);
        return created >= weekStart && created <= weekEnd;
      });
      const times = weekTxns
        .map((t) => differenceInMinutes(new Date(t.updated_at), new Date(t.created_at)))
        .filter((m) => m >= 0);
      const avg = times.length > 0 ? times.reduce((s, m) => s + m, 0) / times.length : 0;
      data.push({
        week: format(weekStart, "dd MMM"),
        avgTime: Math.round(avg * 10) / 10,
        count: weekTxns.length,
      });
    }
    return data;
  }, [transactions]);

  const formatProcessingTime = (minutes: number) => {
    if (minutes < 1) return "< 1 min";
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hrs = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hrs}h ${mins}m`;
  };

  const statCards = [
    {
      title: "Total Sales",
      value: `GH₵ ${stats.totalSales.toFixed(2)}`,
      icon: DollarSign,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Net Profit",
      value: `GH₵ ${stats.netProfit.toFixed(2)}`,
      icon: TrendingUp,
      color: "text-success",
      bg: "bg-success/10",
      subtitle: `Before charges: GH₵ ${stats.grossProfit.toFixed(2)} · 1.95% (GH₵ ${stats.charges.toFixed(2)}) deducted`,
    },
    {
      title: "Completed Orders",
      value: stats.totalOrders,
      icon: ShoppingCart,
      color: "text-secondary",
      bg: "bg-secondary/20",
    },
    {
      title: "Pending",
      value: stats.pending,
      icon: Activity,
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      title: "Failed Orders",
      value: stats.failed,
      icon: AlertTriangle,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
    {
      title: "Avg Processing",
      value: formatProcessingTime(stats.avgProcessingTime),
      icon: Clock,
      color: "text-accent-foreground",
      bg: "bg-accent/10",
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="rounded-xl p-3 bg-primary/10">
            <Wallet className="h-7 w-7 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Data Balance</p>
            <p className="text-3xl font-bold">
              GH₵ {balanceData ? balanceData.balance.toFixed(2) : "—"}
            </p>
            {balanceData && (
              <p className="text-xs text-muted-foreground mt-1">
                {balanceData.name} · {balanceData.email}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.title}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`rounded-xl p-3 ${s.bg}`}>
                <s.icon className={`h-6 w-6 ${s.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{s.title}</p>
                <p className="text-2xl font-bold">{s.value}</p>
                {"subtitle" in s && s.subtitle && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">{s.subtitle as string}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales & Profit (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `₵${v}`} />
                <Tooltip
                  formatter={(value: number) => `GH₵ ${value.toFixed(2)}`}
                  contentStyle={{
                    borderRadius: "0.75rem",
                    border: "1px solid hsl(var(--border))",
                  }}
                />
                <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="Sales" />
                <Bar dataKey="profit" fill="hsl(var(--secondary))" radius={[6, 6, 0, 0]} name="Profit" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Avg Processing Time per Week (minutes)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyProcessingData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="week" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `${v}m`} />
                <Tooltip
                  formatter={(value: number, name: string) =>
                    name === "avgTime" ? `${value} min` : `${value} orders`
                  }
                  contentStyle={{
                    borderRadius: "0.75rem",
                    border: "1px solid hsl(var(--border))",
                  }}
                />
                <Line type="monotone" dataKey="avgTime" stroke="hsl(var(--primary))" strokeWidth={2} name="avgTime" dot={{ fill: "hsl(var(--primary))" }} />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--muted-foreground))" strokeWidth={1} strokeDasharray="5 5" name="count" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      <BalanceAlertSettings />
      <ManualProcessingSettings />
    </div>
  );
};

export default Dashboard;
