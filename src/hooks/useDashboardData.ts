import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Transaction } from "@/components/TransactionList";

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

interface DashboardMetrics {
  totalRevenue: number;
  totalSales: number;
  totalCustomers: number;
  monthlyRevenueTrend: number;
  monthlySalesTrend: number;
  monthlyCustomersTrend: number;
}

export function useDashboardData() {
  const { data: dailyRevenueData } = useQuery({
    queryKey: ['daily-revenue'],
    queryFn: async () => {
      // Get today's date at midnight (start of day)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const todayISOString = today.toISOString();
      const tomorrowISOString = tomorrow.toISOString();
      
      const { data, error } = await supabase
        .from('transactions')
        .select('amount')
        .eq('status', 'completed')
        .gte('date', todayISOString)
        .lt('date', tomorrowISOString);
      
      if (error) throw error;
      
      const totalRevenue = data.reduce((sum, transaction) => {
        return sum + (parseFloat(transaction.amount.toString()) || 0);
      }, 0);
      
      return {
        total_revenue: totalRevenue,
        day: todayISOString
      } as DailyRevenue;
    },
  });

  const { data: salesData } = useQuery({
    queryKey: ['sales-data'],
    queryFn: async () => {
      // Get the last 7 days of data
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // -6 to include today (total of 7 days)
      sevenDaysAgo.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('transactions')
        .select('date, amount')
        .eq('status', 'completed')
        .gte('date', sevenDaysAgo.toISOString())
        .order('date', { ascending: true });
      
      if (error) throw error;
      
      // Group transactions by day
      const dailyTotals = new Map<string, number>();
      
      // Initialize all days with 0 (for last 7 days)
      for (let i = 0; i < 7; i++) {
        const date = new Date(sevenDaysAgo);
        date.setDate(date.getDate() + i);
        const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dailyTotals.set(formattedDate, 0);
      }
      
      // Sum transactions by day
      data.forEach(transaction => {
        const transactionDate = new Date(transaction.date);
        const formattedDate = transactionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const amount = parseFloat(transaction.amount.toString()) || 0;
        
        const currentTotal = dailyTotals.get(formattedDate) || 0;
        dailyTotals.set(formattedDate, currentTotal + amount);
      });
      
      // Convert to array for chart
      const result: SalesDataPoint[] = Array.from(dailyTotals.entries()).map(([name, total]) => ({
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
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const { data: revenueData, error: revenueError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('status', 'completed');
      
      if (revenueError) throw revenueError;
      const totalRevenue = revenueData.reduce((acc, curr) => acc + (parseFloat(curr.amount.toString()) || 0), 0);
      
      const { count: totalSales, error: salesError } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true });
      
      if (salesError) throw salesError;

      const { data: phoneData, error: phoneError } = await supabase
        .from('transactions')
        .select('phone_number');
      
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
    queryKey: ['recent-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, customers(*)')
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
