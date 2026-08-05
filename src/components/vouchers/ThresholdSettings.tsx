
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

interface VoucherType {
  id: string;
  name: string;
  low_stock_threshold: number;
}

export function ThresholdSettings({ voucherType, onUpdate }: { 
  voucherType: VoucherType;
  onUpdate: () => void;
}) {
  const [threshold, setThreshold] = useState(voucherType.low_stock_threshold);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleUpdateThreshold = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('voucher_types')
        .update({ low_stock_threshold: threshold })
        .eq('id', voucherType.id);

      if (error) throw error;

      toast({
        title: "Threshold Updated",
        description: `Alert threshold for ${voucherType.name} set to ${threshold}`
      });
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update threshold",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Input
        type="number"
        min="0"
        value={threshold}
        onChange={(e) => setThreshold(parseInt(e.target.value))}
        className="w-24"
      />
      <Button 
        variant="outline" 
        size="sm"
        onClick={handleUpdateThreshold}
        disabled={isUpdating || threshold === voucherType.low_stock_threshold}
      >
        {isUpdating ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}
