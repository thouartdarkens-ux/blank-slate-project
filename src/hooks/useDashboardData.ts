import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Transaction } from "@/components/TransactionList";
import { DateRange, defaultDateRange } from "@/components/DateRangeFilter";

interface DailyRevenue {
  total_revenue: number;
  day: string;
}

interface SalesDataPoint {
  name: string;
  total: number;
}

interface InventoryData {
  total: number;
  categories: {
    name: string;
    stock: number;
  }[];
}

const rangeBounds = (range: DateRange) => ({
  fromISO: new Date(`${range.from}T00:00:00.000`).toISOString(),
  toISO: new Date(`${range.to}T23:59:59.999`).toISOString(),
});

export function useDashboardData(range?: DateRange) {
  const effectiveRange = range ?? defaultDateRange();
  const { fromISO, toISO } = rangeBounds(effectiveRange);

  const { data: dailyRevenueData } = useQuery({
    queryKey: ['daily-revenue', fromISO, toISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('amount')
        .eq('status', 'completed')
        .gte('date', fromISO)
        .lte('date', toISO);

      if (error) throw error;

      const totalRevenue = (data || []).reduce((sum, transaction) => {
        return sum + (parseFloat(transaction.amount.toString()) || 0);
      }, 0);

      return {
        total_revenue: totalRevenue,
        day: toISO
      } as DailyRevenue;
    },
  });

  const { data: salesData } = useQuery({
    queryKey: ['sales-data', fromISO, toISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('date, amount')
        .eq('status', 'completed')
        .gte('date', fromISO)
        .lte('date', toISO)
        .order('date', { ascending: true });

      if (error) throw error;

      const spanDays =
        (new Date(toISO).getTime() - new Date(fromISO).getTime()) / 86_400_000;
      const groupByMonth = spanDays > 62;

      const label = (d: Date) =>
        groupByMonth
          ? d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      const totals = new Map<string, number>();
      (data || []).forEach(transaction => {
        const key = label(new Date(transaction.date));
        const amount = parseFloat(transaction.amount.toString()) || 0;
        totals.set(key, (totals.get(key) || 0) + amount);
      });

      const result: SalesDataPoint[] = Array.from(totals.entries()).map(([name, total]) => ({
        name,
        total
      }));

      return result;
    },
  });

  const { data: inventoryData } = useQuery({
    queryKey: ['inventory-summary'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('voucher_types_with_stock')
          .select('*');

        if (error) throw error;

        const safeData = data || [];

        const totalStock = safeData.reduce((acc, item) => acc + (item.stock || 0), 0);

        const categories = safeData.map(item => ({
          name: item.name || 'Unknown',
          stock: item.stock || 0
        }));

        return {
          total: totalStock,
          categories: categories
        } as InventoryData;
      } catch (error) {
        console.error("Error fetching inventory data:", error);
        return {
          total: 0,
          categories: []
        } as InventoryData;
      }
    }
  });

  const { data: dashboardMetrics } = useQuery({
    queryKey: ['dashboard-metrics', fromISO, toISO],
    queryFn: async () => {
      const { data: revenueData, error: revenueError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('status', 'completed')
        .gte('date', fromISO)
        .lte('date', toISO);

      if (revenueError) throw revenueError;
      const totalRevenue = revenueData.reduce((acc, curr) => acc + (parseFloat(curr.amount.toString()) || 0), 0);

      const { count: totalSales, error: salesError } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .gte('date', fromISO)
        .lte('date', toISO);

      if (salesError) throw salesError;

      const { data: phoneData, error: phoneError } = await supabase
        .from('transactions')
        .select('phone_number')
        .gte('date', fromISO)
        .lte('date', toISO);

      if (phoneError) throw phoneError;

      const uniquePhoneNumbers = new Set(phoneData.map(t => t.phone_number)).size;

      return {
        totalRevenue,
        totalSales: totalSales || 0,
        totalCustomers: uniquePhoneNumbers,
        monthlyRevenueTrend: 14.2,
        monthlySalesTrend: 5.1,
        monthlyCustomersTrend: 8.3
      };
    }
  });

  const { data: transactions } = useQuery({
    queryKey: ['recent-transactions', fromISO, toISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, customers(*)')
        .gte('date', fromISO)
        .lte('date', toISO)
        .order('date', { ascending: false })
        .limit(5);

      if (error) throw error;

      return data.map(t => ({
        id: t.id,
        customer: t.customers?.name || t.reference || 'Unknown',
        amount: `$${t.amount.toFixed(2)}`,
        status: (t.status as "completed" | "pending" | "failed" | "awaiting_inventory") || "pending",
        voucher: t.product,
        date: new Date(t.date).toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        quantity: t.quantity || 1
      })) as Transaction[];
    }
  });

  return {
    dailyRevenueData,
    salesData,
    inventoryData,
    transactions,
    dashboardMetrics
  };
}
