import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface BundleRow {
  capacity: string;
  mb: string;
  costPrice: number;
  network: string;
  inStock: boolean;
  sellingPrice: number;
  dirty: boolean;
}

const TABS = [
  { label: "MTN", network: "YELLO", color: "bg-yellow-500" },
  { label: "Telecel", network: "TELECEL", color: "bg-red-500" },
  { label: "AT", network: "AT_PREMIUM", color: "bg-blue-500" },
] as const;

function formatSize(mb: string) {
  const n = parseInt(mb);
  return n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)} GB` : `${n} MB`;
}

const Bundles = () => {
  const [activeTab, setActiveTab] = useState("YELLO");
  const [bundles, setBundles] = useState<Record<string, BundleRow[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const fetchBundles = async (network: string) => {
    if (bundles[network]) return;
    setLoading((p) => ({ ...p, [network]: true }));
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/data-packages?network=${network}`);
      const json = await res.json();
      const apiData = json.data ?? [];

      const { data: saved } = await supabase
        .from("bundle_prices")
        .select("capacity, selling_price")
        .eq("network", network);

      const savedMap = new Map(
        (saved ?? []).map((s: any) => [s.capacity, Number(s.selling_price)])
      );

      const rows: BundleRow[] = apiData.map((b: any) => ({
        capacity: b.capacity,
        mb: b.mb,
        costPrice: parseFloat(b.price),
        network: b.network,
        inStock: b.inStock,
        sellingPrice: savedMap.get(b.capacity) ?? 0,
        dirty: false,
      }));

      setBundles((p) => ({ ...p, [network]: rows }));
    } catch {
      toast.error("Failed to fetch bundles for " + network);
    } finally {
      setLoading((p) => ({ ...p, [network]: false }));
    }
  };

  useEffect(() => {
    fetchBundles(activeTab);
  }, [activeTab]);

  const updateSellingPrice = (network: string, capacity: string, value: string) => {
    setBundles((prev) => ({
      ...prev,
      [network]: (prev[network] ?? []).map((b) =>
        b.capacity === capacity
          ? { ...b, sellingPrice: parseFloat(value) || 0, dirty: true }
          : b
      ),
    }));
  };

  const savePrices = async (network: string) => {
    const rows = (bundles[network] ?? []).filter((b) => b.dirty);
    if (!rows.length) {
      toast.info("No changes to save");
      return;
    }
    setSaving(true);
    try {
      for (const row of rows) {
        await supabase
          .from("bundle_prices")
          .upsert(
            {
              network,
              capacity: row.capacity,
              mb: row.mb,
              cost_price: row.costPrice,
              selling_price: row.sellingPrice,
              in_stock: row.inStock,
            },
            { onConflict: "network,capacity" }
          );
      }
      setBundles((prev) => ({
        ...prev,
        [network]: (prev[network] ?? []).map((b) => ({ ...b, dirty: false })),
      }));
      toast.success("Prices saved!");
    } catch {
      toast.error("Failed to save prices");
    } finally {
      setSaving(false);
    }
  };

  const renderTable = (network: string) => {
    if (loading[network]) {
      return (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    const rows = bundles[network] ?? [];

    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => savePrices(network)} disabled={saving} size="sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Prices
          </Button>
        </div>
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Size</TableHead>
                <TableHead>Cost Price (GHS)</TableHead>
                <TableHead>Selling Price (GHS)</TableHead>
                <TableHead>Profit (GHS)</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((b) => (
                <TableRow key={b.capacity}>
                  <TableCell className="font-medium">{formatSize(b.mb)}</TableCell>
                  <TableCell>₵ {b.costPrice.toFixed(2)}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      className="w-28 h-8"
                      value={b.sellingPrice || ""}
                      placeholder="0.00"
                      onChange={(e) => updateSellingPrice(network, b.capacity, e.target.value)}
                    />
                  </TableCell>
                  <TableCell
                    className={
                      b.sellingPrice - b.costPrice > 0
                        ? "text-green-600 font-medium"
                        : "text-muted-foreground"
                    }
                  >
                    ₵ {(b.sellingPrice - b.costPrice).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={b.inStock ? "default" : "secondary"}>
                      {b.inStock ? "In Stock" : "Out"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No bundles available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Data Bundles</h2>
        <p className="text-muted-foreground">
          View cost prices and set your selling prices for each network.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          {TABS.map((t) => (
            <TabsTrigger key={t.network} value={t.network} className="gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${t.color}`} />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((t) => (
          <TabsContent key={t.network} value={t.network}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{t.label} Bundles</CardTitle>
              </CardHeader>
              <CardContent>{renderTable(t.network)}</CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default Bundles;
