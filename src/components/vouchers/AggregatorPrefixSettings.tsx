import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { extractReferencePrefix, normalizePrefix, OTHER_PREFIX } from "@/utils/referencePrefix";

interface AggregatorPrefix {
  id: string;
  prefix: string;
  title: string;
  charge_percentage: number;
}

export function AggregatorPrefixSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [prefixes, setPrefixes] = useState<AggregatorPrefix[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchPrefixes();
  }, []);

  const fetchPrefixes = async () => {
    const { data, error } = await supabase
      .from("aggregator_prefixes")
      .select("*")
      .order("prefix");

    if (error) {
      toast({ title: "Error", description: "Failed to load aggregator prefixes", variant: "destructive" });
    } else {
      setPrefixes(data || []);
    }
    setLoading(false);
  };

  const syncPrefixesFromDB = async () => {
    setSyncing(true);
    try {
      const discoveredPrefixes = new Set<string>([OTHER_PREFIX]);
      const pageSize = 1000;

      for (let from = 0; ; from += pageSize) {
        const { data: transactions, error } = await supabase
          .from("transactions")
          .select("reference")
          .not("reference", "is", null)
          .eq("status", "completed")
          .range(from, from + pageSize - 1);

        if (error) throw error;

        (transactions || []).forEach((transaction: { reference: string | null }) => {
          discoveredPrefixes.add(extractReferencePrefix(transaction.reference));
        });

        if (!transactions || transactions.length < pageSize) {
          break;
        }
      }

      const existingPrefixes = new Set(prefixes.map((prefix) => normalizePrefix(prefix.prefix)));
      const newPrefixes = Array.from(discoveredPrefixes).filter(
        (prefix) => !existingPrefixes.has(normalizePrefix(prefix))
      );

      if (newPrefixes.length > 0) {
        const { error: insertError } = await supabase
          .from("aggregator_prefixes")
          .insert(
            newPrefixes.map((p) => ({
              prefix: normalizePrefix(p),
              title: p === OTHER_PREFIX ? "Others (No Prefix)" : normalizePrefix(p),
              charge_percentage: 0,
            }))
          );
        if (insertError) throw insertError;
      }

      await fetchPrefixes();
      await queryClient.invalidateQueries({ queryKey: ["aggregator-prefixes"] });
      toast({
        title: "Synced",
        description: `Found ${newPrefixes.length} new prefix(es) from transactions`,
      });
    } catch {
      toast({ title: "Error", description: "Failed to sync prefixes", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const handleChange = (id: string, field: "title" | "charge_percentage", value: string) => {
    setPrefixes((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, [field]: field === "charge_percentage" ? parseFloat(value) || 0 : value }
          : p
      )
    );
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("aggregator_prefixes").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete prefix", variant: "destructive" });
    } else {
      setPrefixes((prev) => prev.filter((p) => p.id !== id));
      await queryClient.invalidateQueries({ queryKey: ["aggregator-prefixes"] });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = prefixes.map((prefix) => ({
        id: prefix.id,
        prefix: normalizePrefix(prefix.prefix),
        title: prefix.title.trim() || normalizePrefix(prefix.prefix),
        charge_percentage: Number(prefix.charge_percentage) || 0,
      }));

      const { error } = await supabase.from("aggregator_prefixes").upsert(payload);
      if (error) throw error;

      await fetchPrefixes();
      await queryClient.invalidateQueries({ queryKey: ["aggregator-prefixes"] });
      toast({ title: "Success", description: "Aggregator charges updated successfully" });
    } catch {
      toast({ title: "Error", description: "Failed to save aggregator charges", variant: "destructive" });
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <CardTitle>Aggregator Charges by Reference Prefix</CardTitle>
            <CardDescription>
              Each transaction reference has a prefix that determines the aggregator fee.
              Set the charge as a percentage of the selling price.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={syncPrefixesFromDB} disabled={syncing}>
            {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Sync from Transactions
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {prefixes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No prefixes found. Click "Sync from Transactions" to discover them.
            </p>
          ) : (
            prefixes.map((p) => (
              <div key={p.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end border-b pb-3 last:border-0">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Prefix</Label>
                  <p className="font-mono font-medium text-sm">{p.prefix}</p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`title-${p.id}`}>Title</Label>
                  <Input
                    id={`title-${p.id}`}
                    value={p.title}
                    onChange={(e) => handleChange(p.id, "title", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`charge-${p.id}`}>Charge (%)</Label>
                  <Input
                    id={`charge-${p.id}`}
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={p.charge_percentage}
                    onChange={(e) => handleChange(p.id, "charge_percentage", e.target.value)}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(p.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Charges"}
        </Button>
      </CardFooter>
    </Card>
  );
}
