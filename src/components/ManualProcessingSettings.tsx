import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { HandMetal, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ManualConfig {
  id?: string;
  admin_phone: string;
  is_active: boolean;
}

export function ManualProcessingSettings() {
  const [config, setConfig] = useState<ManualConfig>({
    admin_phone: "",
    is_active: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("manual_processing_settings" as any)
        .select("*")
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setConfig({
          id: (data as any).id,
          admin_phone: (data as any).admin_phone || "",
          is_active: (data as any).is_active,
        });
      }
    } catch (e) {
      console.error("Failed to load manual processing config:", e);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      if (config.id) {
        const { error } = await supabase
          .from("manual_processing_settings" as any)
          .update({
            admin_phone: config.admin_phone,
            is_active: config.is_active,
          } as any)
          .eq("id", config.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("manual_processing_settings" as any)
          .insert({
            admin_phone: config.admin_phone,
            is_active: config.is_active,
          } as any)
          .select()
          .single();
        if (error) throw error;
        setConfig((prev) => ({ ...prev, id: (data as any).id }));
      }
      toast.success("Manual processing settings saved");
    } catch (e) {
      console.error("Failed to save manual processing config:", e);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
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
          <HandMetal className="h-5 w-5 text-primary" />
          Manual Processing Mode
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="manual-active">Enable manual processing</Label>
            <p className="text-xs text-muted-foreground">
              When active, orders are recorded but not sent to providers. You'll get an SMS notification instead.
            </p>
          </div>
          <Switch
            id="manual-active"
            checked={config.is_active}
            onCheckedChange={(checked) =>
              setConfig((prev) => ({ ...prev, is_active: checked }))
            }
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="admin-phone">Admin phone number</Label>
          <Input
            id="admin-phone"
            placeholder="e.g. 0241234567"
            value={config.admin_phone}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, admin_phone: e.target.value }))
            }
          />
          <p className="text-xs text-muted-foreground">
            This number will receive SMS notifications about pending orders
          </p>
        </div>

        <Button onClick={saveConfig} disabled={saving} className="w-full">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
}
