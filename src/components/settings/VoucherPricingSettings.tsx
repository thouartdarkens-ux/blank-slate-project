import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

interface VoucherType {
  id: string;
  name: string;
  price: number;
  cost_price: number;
  aggregator_charge: number;
}

export function VoucherPricingSettings() {
  const { toast } = useToast();
  const [voucherTypes, setVoucherTypes] = useState<VoucherType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchVoucherTypes();
  }, []);

  const fetchVoucherTypes = async () => {
    const { data, error } = await supabase
      .from("voucher_types")
      .select("id, name, price, cost_price, aggregator_charge")
      .order("name");

    if (error) {
      toast({ title: "Error", description: "Failed to load voucher types", variant: "destructive" });
    } else {
      setVoucherTypes(
        (data || []).map((v: any) => ({
          id: v.id,
          name: v.name,
          price: v.price,
          cost_price: v.cost_price ?? 0,
          aggregator_charge: v.aggregator_charge ?? 0,
        }))
      );
    }
    setLoading(false);
  };

  const handleChange = (id: string, field: "cost_price" | "aggregator_charge", value: string) => {
    setVoucherTypes((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: parseFloat(value) || 0 } : v))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const v of voucherTypes) {
        const { error } = await supabase
          .from("voucher_types")
          .update({ cost_price: v.cost_price, aggregator_charge: v.aggregator_charge })
          .eq("id", v.id);
        if (error) throw error;
      }
      toast({ title: "Success", description: "Voucher pricing updated successfully" });
    } catch {
      toast({ title: "Error", description: "Failed to save pricing", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Voucher Cost & Charges</CardTitle>
        <CardDescription>
          Set the cost price and aggregator charge per voucher type to calculate profit.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {voucherTypes.map((v) => (
            <div key={v.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end border-b pb-4 last:border-0">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Voucher Type</Label>
                <p className="font-medium">{v.name}</p>
                <p className="text-xs text-muted-foreground">Selling: ₵{v.price.toFixed(2)}</p>
              </div>
              <div className="space-y-1">
                <Label htmlFor={`cost-${v.id}`}>Cost Price (₵)</Label>
                <Input
                  id={`cost-${v.id}`}
                  type="number"
                  step="0.01"
                  min="0"
                  value={v.cost_price}
                  onChange={(e) => handleChange(v.id, "cost_price", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`charge-${v.id}`}>Aggregator Charge (%)</Label>
                <Input
                  id={`charge-${v.id}`}
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={v.aggregator_charge}
                  onChange={(e) => handleChange(v.id, "aggregator_charge", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  = ₵{((v.aggregator_charge / 100) * v.price).toFixed(2)} per voucher
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Profit/Voucher</Label>
                <p className="font-semibold text-green-600">
                  ₵{(v.price - v.cost_price - (v.aggregator_charge / 100) * v.price).toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Pricing"}
        </Button>
      </CardFooter>
    </Card>
  );
}
