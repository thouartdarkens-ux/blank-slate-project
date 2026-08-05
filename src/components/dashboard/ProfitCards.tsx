import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfitData } from "@/hooks/useProfitData";
import { StatCard } from "@/components/StatCard";
import { TrendingUp, Wallet } from "lucide-react";

export function ProfitCards() {
  const { calculateProfit } = useProfitData();

  // Fetch today's completed transactions
  const { data: todayData } = useQuery({
    queryKey: ["today-profit-transactions"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data, error } = await supabase
        .from("transactions")
        .select("product, quantity, amount, reference")
        .eq("status", "completed")
        .gte("date", today.toISOString())
        .lt("date", tomorrow.toISOString());

      if (error) throw error;
      return (data || []).map((t: any) => ({
        product: t.product,
        quantity: t.quantity || 1,
        amount: parseFloat(t.amount?.toString() || "0"),
        reference: t.reference,
      }));
    },
  });

  // Fetch total completed transactions
  const { data: totalData } = useQuery({
    queryKey: ["total-profit-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("product, quantity, amount, reference")
        .eq("status", "completed");

      if (error) throw error;
      return (data || []).map((t: any) => ({
        product: t.product,
        quantity: t.quantity || 1,
        amount: parseFloat(t.amount?.toString() || "0"),
        reference: t.reference,
      }));
    },
  });

  const dailyProfit = todayData ? calculateProfit(todayData) : null;
  const totalProfit = totalData ? calculateProfit(totalData) : null;

  const dailyRevenue = todayData
    ? todayData.reduce((sum, t) => sum + t.amount, 0)
    : 0;
  const totalRevenue = totalData
    ? totalData.reduce((sum, t) => sum + t.amount, 0)
    : 0;

  const dailyTotalSales = todayData
    ? todayData.reduce((sum, t) => sum + t.quantity, 0)
    : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <StatCard
        title="Daily Sales (Qty)"
        value={dailyTotalSales.toString()}
        icon={TrendingUp}
        className="bg-gradient-to-br from-cyan-50 to-teal-100 dark:from-cyan-900/20 dark:to-teal-800/30"
      />
      <StatCard
        title="Daily Profit"
        value={`₵${(dailyProfit !== null ? dailyProfit : dailyRevenue).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        icon={Wallet}
        trend={
          dailyProfit === null
            ? { value: 0, label: "set cost prices in Voucher Types", positive: true }
            : undefined
        }
        className="bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/20 dark:to-green-800/30"
      />
      <StatCard
        title="Total Profit"
        value={`₵${(totalProfit !== null ? totalProfit : totalRevenue).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        icon={Wallet}
        trend={
          totalProfit === null
            ? { value: 0, label: "set cost prices in Voucher Types", positive: true }
            : undefined
        }
        className="bg-gradient-to-br from-lime-50 to-green-100 dark:from-lime-900/20 dark:to-green-800/30"
      />
    </div>
  );
}
