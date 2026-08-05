import { MainLayout } from "@/components/MainLayout";
import { TransactionList } from "@/components/TransactionList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboardData } from "@/hooks/useDashboardData";
import { StatCards } from "@/components/dashboard/StatCards";
import { SalesOverviewChart } from "@/components/dashboard/SalesOverviewChart";
import { InventorySummary } from "@/components/dashboard/InventorySummary";
import { ProfitCards } from "@/components/dashboard/ProfitCards";
import { AffiliateCommissionCards } from "@/components/dashboard/AffiliateCommissionCards";

export default function DashboardPage() {
  const { dailyRevenueData, salesData, inventoryData, transactions, dashboardMetrics } = useDashboardData();

  const emptyInventoryData = { 
    total: 0, 
    categories: [] 
  };

  return (
    <MainLayout title="Dashboard">
      <div className="space-y-6 animate-fade-in">
        <StatCards 
          salesData={salesData || []}
          totalInventory={inventoryData?.total || 0}
          metrics={dashboardMetrics}
        />
        
        <ProfitCards />

        <AffiliateCommissionCards />

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
