
import { StatCard } from "@/components/StatCard";
import { CreditCard, DollarSign, PackageOpen, TrendingUp, Users } from "lucide-react";

interface DashboardMetrics {
  totalRevenue: number;
  totalSales: number;
  totalCustomers: number;
  monthlyRevenueTrend: number;
  monthlySalesTrend: number;
  monthlyCustomersTrend: number;
}

interface SalesDataPoint {
  name: string;
  total: number;
}

interface StatCardsProps {
  salesData: SalesDataPoint[];
  totalInventory: number;
  metrics: DashboardMetrics | undefined;
  rangeRevenue?: number;
}

export function StatCards({ salesData, totalInventory, metrics, rangeRevenue }: StatCardsProps) {
  // Today's revenue (only meaningful when today falls in the selected range)
  const today = new Date();
  const todayFormatted = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const todaySalesEntry = salesData.find(item => item.name === todayFormatted);
  const todayRevenue = todaySalesEntry ? todaySalesEntry.total : 0;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayFormatted = yesterday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const yesterdaySalesEntry = salesData.find(item => item.name === yesterdayFormatted);
  const yesterdayRevenue = yesterdaySalesEntry ? yesterdaySalesEntry.total : 0;

  let dailyRevenueTrend = 0;
  if (yesterdayRevenue > 0) {
    dailyRevenueTrend = ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100;
  }

  // Inventory trend (static value for now)
  const inventoryTrend = 8.5;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <StatCard 
        title="Daily Revenue" 
        value={`₵${todayRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        icon={DollarSign} 
        trend={{
          value: parseFloat(Math.abs(dailyRevenueTrend).toFixed(1)),
          label: "from yesterday",
          positive: dailyRevenueTrend >= 0
        }}
        className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-800/30"
      />
      <StatCard 
        title="Revenue — selected range" 
        value={`₵${Number(rangeRevenue ?? metrics?.totalRevenue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
        icon={CreditCard} 

        className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-800/30"
      />
      <StatCard 
        title="Sales" 
        value={metrics ? metrics.totalSales.toString() : "0"} 
        icon={TrendingUp} 
        trend={{
          value: Math.abs(metrics?.monthlySalesTrend || 0),
          label: "from last month",
          positive: (metrics?.monthlySalesTrend || 0) >= 0
        }}
        className="bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-900/20 dark:to-violet-800/30"
      />
      <StatCard 
        title="Vouchers in Stock" 
        value={totalInventory.toString()} 
        icon={PackageOpen} 
        trend={{
          value: Math.abs(inventoryTrend),
          label: "from last week",
          positive: inventoryTrend >= 0
        }}
        className="bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-900/20 dark:to-orange-800/30"
      />
      <StatCard 
        title="Unique Customers" 
        value={metrics ? metrics.totalCustomers.toString() : "0"} 
        icon={Users} 
        trend={{
          value: Math.abs(metrics?.monthlyCustomersTrend || 0),
          label: "from last month",
          positive: (metrics?.monthlyCustomersTrend || 0) >= 0
        }}
        className="bg-gradient-to-br from-pink-50 to-rose-100 dark:from-pink-900/20 dark:to-rose-800/30"
      />
    </div>
  );
}
