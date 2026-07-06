import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Bell, Plus, X, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AlertConfig {
  id?: string;
  threshold: number;
  phone_numbers: string[];
  is_active: boolean;
}

export function BalanceAlertSettings() {
  const [config, setConfig] = useState<AlertConfig>({
    threshold: 50,
    phone_numbers: [],
    is_active: true,
  });
  const [newPhone, setNewPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("balance_alerts")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setConfig({
          id: data.id,
          threshold: Number(data.threshold),
          phone_numbers: data.phone_numbers || [],
          is_active: data.is_active,
        });
      }
    } catch (e) {
      console.error("Failed to load alert config:", e);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      if (config.id) {
        const { error } = await supabase
          .from("balance_alerts")
          .update({
            threshold: config.threshold,
            phone_numbers: config.phone_numbers,
            is_active: config.is_active,
          })
          .eq("id", config.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("balance_alerts")
          .insert({
            threshold: config.threshold,
            phone_numbers: config.phone_numbers,
            is_active: config.is_active,
          })
          .select()
          .single();
        if (error) throw error;
        setConfig((prev) => ({ ...prev, id: data.id }));
      }
      toast.success("Alert settings saved");
    } catch (e) {
      console.error("Failed to save alert config:", e);
      toast.error("Failed to save alert settings");
    } finally {
      setSaving(false);
    }
  };

  const addPhone = () => {
    const cleaned = newPhone.trim();
    if (!cleaned) return;
    if (config.phone_numbers.includes(cleaned)) {
      toast.error("Number already added");
      return;
    }
    setConfig((prev) => ({
      ...prev,
      phone_numbers: [...prev.phone_numbers, cleaned],
    }));
    setNewPhone("");
  };

  const removePhone = (phone: string) => {
    setConfig((prev) => ({
      ...prev,
      phone_numbers: prev.phone_numbers.filter((p) => p !== phone),
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-5 w-5 text-primary" />
          Balance Alert Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="alert-active">Enable alerts</Label>
          <Switch
            id="alert-active"
            checked={config.is_active}
            onCheckedChange={(checked) =>
              setConfig((prev) => ({ ...prev, is_active: checked }))
            }
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="threshold">Alert threshold (GH₵)</Label>
          <Input
            id="threshold"
            type="number"
            min={1}
            step={1}
            value={config.threshold}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, threshold: Number(e.target.value) }))
            }
          />
          <p className="text-xs text-muted-foreground">
            SMS will be sent when balance drops below this amount
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Recipient phone numbers</Label>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. 0241234567"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPhone()}
            />
            <Button size="icon" variant="outline" onClick={addPhone}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {config.phone_numbers.map((phone) => (
              <Badge key={phone} variant="secondary" className="gap-1 pr-1">
                {phone}
                <button
                  onClick={() => removePhone(phone)}
                  className="rounded-full hover:bg-muted p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {config.phone_numbers.length === 0 && (
              <p className="text-xs text-muted-foreground">No numbers added yet</p>
            )}
          </div>
        </div>

        <Button onClick={saveConfig} disabled={saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Alert Settings
        </Button>
      </CardContent>
    </Card>
  );
}
