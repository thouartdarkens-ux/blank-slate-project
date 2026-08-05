import { useState } from "react";
import { MainLayout } from "@/components/MainLayout";
import { TransactionList } from "@/components/TransactionList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboardData } from "@/hooks/useDashboardData";
import { StatCards } from "@/components/dashboard/StatCards";
import { SalesOverviewChart } from "@/components/dashboard/SalesOverviewChart";
import { InventorySummary } from "@/components/dashboard/InventorySummary";
import { ProfitCards } from "@/components/dashboard/ProfitCards";
import { AffiliateCommissionCards } from "@/components/dashboard/AffiliateCommissionCards";
import { DateRangeFilter, DateRange, defaultDateRange } from "@/components/DateRangeFilter";

export default function DashboardPage() {
  const [range, setRange] = useState<DateRange>(defaultDateRange);
  const { dailyRevenueData, salesData, inventoryData, transactions, dashboardMetrics } =
    useDashboardData(range);

  const emptyInventoryData = { 
    total: 0, 
    categories: [] 
  };

  return (
    <MainLayout title="Dashboard">
      <div className="space-y-6 animate-fade-in">
        <DateRangeFilter value={range} onChange={setRange} />

        <StatCards 
          salesData={salesData || []}
          totalInventory={inventoryData?.total || 0}
          metrics={dashboardMetrics}
          rangeRevenue={dailyRevenueData?.total_revenue}
        />
        
        <ProfitCards range={range} />

        <AffiliateCommissionCards range={range} onRangeChange={setRange} />

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            <SalesOverviewChart data={salesData || []} />
            <InventorySummary data={inventoryData || emptyInventoryData} />
            <TransactionList transactions={transactions || []} />
          </TabsContent>
          <TabsContent value="transactions">
            <TransactionList transactions={transactions || []} title="All Transactions" />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
