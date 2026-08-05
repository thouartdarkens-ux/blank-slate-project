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
}

export function CostPriceSettings() {
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
      .select("id, name, price, cost_price")
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
        }))
      );
    }
    setLoading(false);
  };

  const handleChange = (id: string, value: string) => {
    setVoucherTypes((prev) =>
      prev.map((v) => (v.id === id ? { ...v, cost_price: parseFloat(value) || 0 } : v))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const v of voucherTypes) {
        const { error } = await supabase
          .from("voucher_types")
          .update({ cost_price: v.cost_price })
          .eq("id", v.id);
        if (error) throw error;
      }
      toast({ title: "Success", description: "Cost prices updated successfully" });
    } catch {
      toast({ title: "Error", description: "Failed to save cost prices", variant: "destructive" });
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
        <CardTitle>Voucher Cost Prices</CardTitle>
        <CardDescription>
          Set the original cost price for each voucher type. This is used for profit calculations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {voucherTypes.map((v) => (
            <div key={v.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end border-b pb-3 last:border-0">
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
                  onChange={(e) => handleChange(v.id, e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Margin/Voucher</Label>
                <p className="font-semibold text-green-600">
                  ₵{(v.price - v.cost_price).toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Cost Prices"}
        </Button>
      </CardFooter>
    </Card>
  );
}
