
import { useState, useEffect } from "react";
import { MainLayout } from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { VoucherTypeTable } from "@/components/vouchers/VoucherTypeTable";
import { AddVoucherTypeForm } from "@/components/vouchers/AddVoucherTypeForm";
import { CostPriceSettings } from "@/components/vouchers/CostPriceSettings";
import { AggregatorPrefixSettings } from "@/components/vouchers/AggregatorPrefixSettings";

interface VoucherType {
  id: string;
  name: string;
  price: number;
  bulk_price: number | null;
  description: string | null;
  stock: number | null;
  low_stock_threshold: number;
}

interface VoucherTypeFromView {
  id: string;
  name: string;
  price: number;
  bulk_price: number | null;
  description: string | null;
  stock: number | null;
}

export default function ListPage() {
  const [voucherTypes, setVoucherTypes] = useState<VoucherType[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchVoucherTypes = async () => {
    setIsLoading(true);
    try {
      const { data: typesData, error: typesError } = await supabase
        .from('voucher_types_with_stock')
        .select('*');
      if (typesError) throw typesError;

      const { data: thresholdData, error: thresholdError } = await supabase
        .from('voucher_types')
        .select('id, low_stock_threshold');
      if (thresholdError) throw thresholdError;

      const combinedData = typesData.map((type: VoucherTypeFromView) => ({
        ...type,
        low_stock_threshold: thresholdData.find(t => t.id === type.id)?.low_stock_threshold || 10
      }));
      
      setVoucherTypes(combinedData);
      await checkLowStockLevels(combinedData);
    } catch (error) {
      console.error("Error fetching voucher types:", error);
      toast({ title: "Error", description: "Failed to load voucher types", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const checkLowStockLevels = async (types: VoucherType[]) => {
    try {
      const { data: settings } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('type', 'low_inventory')
        .single();

      if (!settings?.enabled) return;

      for (const type of types) {
        if ((type.stock || 0) <= type.low_stock_threshold) {
          await supabase.functions.invoke('send-low-stock-sms', {
            body: {
              voucherType: type.name,
              currentStock: type.stock || 0,
              threshold: type.low_stock_threshold,
              phone: settings.phone_number
            }
          });
        }
      }
    } catch (error) {
      console.error("Error checking stock levels:", error);
    }
  };

  useEffect(() => {
    fetchVoucherTypes();
  }, []);

  const handleDeleteVoucherType = async (id: string) => {
    if (confirm("Are you sure you want to delete this voucher type? This cannot be undone.")) {
      try {
        const { error } = await supabase.from('voucher_types').delete().eq('id', id);
        if (error) throw error;
        toast({ title: "Voucher Type Deleted", description: "The voucher type has been removed." });
        fetchVoucherTypes();
      } catch (error) {
        console.error("Error deleting voucher type:", error);
        toast({ title: "Error", description: "Failed to delete voucher type", variant: "destructive" });
      }
    }
  };

  return (
    <MainLayout title="Voucher Types">
      <div className="space-y-6 animate-fade-in">
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between space-y-2 md:space-y-0">
              <div>
                <CardTitle>Voucher Types</CardTitle>
                <CardDescription>Manage the types of vouchers you sell, their prices, and inventory levels.</CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={fetchVoucherTypes}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </Button>
                <AddVoucherTypeForm onSuccess={fetchVoucherTypes} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <Input 
                    placeholder="Search voucher types..." 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <VoucherTypeTable 
              voucherTypes={voucherTypes}
              isLoading={isLoading}
              onDelete={handleDeleteVoucherType}
              onRefresh={fetchVoucherTypes}
              searchQuery={searchQuery}
            />
          </CardContent>
        </Card>

        {/* Cost Price Settings */}
        <CostPriceSettings />

        {/* Aggregator Prefix Charges */}
        <AggregatorPrefixSettings />
      </div>
    </MainLayout>
  );
}
