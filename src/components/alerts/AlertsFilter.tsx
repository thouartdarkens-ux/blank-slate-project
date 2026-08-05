
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AlertsFilterProps {
  activeTab: string;
  onTabChange: (value: string) => void;
}

export function AlertsFilter({ activeTab, onTabChange }: AlertsFilterProps) {
  return (
    <Tabs defaultValue="all" value={activeTab} onValueChange={onTabChange}>
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="all">All Alerts</TabsTrigger>
        <TabsTrigger value="inventory">Inventory</TabsTrigger>
        <TabsTrigger value="transaction">Transactions</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
