import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfitData } from "@/hooks/useProfitData";
import { StatCard } from "@/components/StatCard";
import { TrendingUp, Wallet } from "lucide-react";
import { DateRange, defaultDateRange } from "@/components/DateRangeFilter";

interface ProfitCardsProps {
  range?: DateRange;
}

export function ProfitCards({ range }: ProfitCardsProps) {
  const { calculateProfit } = useProfitData();
  const effectiveRange = range ?? defaultDateRange();
  const fromISO = new Date(`${effectiveRange.from}T00:00:00.000`).toISOString();
  const toISO = new Date(`${effectiveRange.to}T23:59:59.999`).toISOString();

  // Today's completed transactions
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

  // Completed transactions within the selected range
  const { data: rangeData } = useQuery({
    queryKey: ["range-profit-transactions", fromISO, toISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("product, quantity, amount, reference")
        .eq("status", "completed")
        .gte("date", fromISO)
        .lte("date", toISO);

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
  const rangeProfit = rangeData ? calculateProfit(rangeData) : null;

  const dailyRevenue = todayData
    ? todayData.reduce((sum, t) => sum + t.amount, 0)
    : 0;
  const rangeRevenue = rangeData
    ? rangeData.reduce((sum, t) => sum + t.amount, 0)
    : 0;

  const rangeTotalSales = rangeData
    ? rangeData.reduce((sum, t) => sum + t.quantity, 0)
    : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <StatCard
        title="Sales (Qty) — selected range"
        value={rangeTotalSales.toString()}
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
        title="Profit — selected range"
        value={`₵${(rangeProfit !== null ? rangeProfit : rangeRevenue).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        icon={Wallet}
        trend={
          rangeProfit === null
            ? { value: 0, label: "set cost prices in Voucher Types", positive: true }
            : undefined
        }
        className="bg-gradient-to-br from-lime-50 to-green-100 dark:from-lime-900/20 dark:to-green-800/30"
      />
    </div>
  );
}
