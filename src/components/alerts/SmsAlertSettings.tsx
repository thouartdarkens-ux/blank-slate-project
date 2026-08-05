
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { PhoneIcon, RotateCw } from "lucide-react";

interface SmsAlertSettingsFormData {
  phoneNumber: string;
  extraAlertPhoneNumber: string;
  smsBalanceThreshold: number;
}

export function SmsAlertSettings() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [settings, setSettings] = useState<SmsAlertSettingsFormData | null>(null);
  
  const form = useForm<SmsAlertSettingsFormData>({
    defaultValues: {
      phoneNumber: "",
      extraAlertPhoneNumber: "",
      smsBalanceThreshold: 400
    }
  });

  // Fetch existing settings
  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        // Try to get notification settings for SMS alerts
        const { data: notificationData } = await supabase
          .from("notification_settings")
          .select("*")
          .eq("type", "sms_alerts")
          .single();

        // Try to get notification settings for extra alerts
        const { data: extraAlertData } = await supabase
          .from("notification_settings")
          .select("*")
          .eq("type", "extra_alerts")
          .single();

        // Try to get alert threshold for SMS balance
        const { data: alertData } = await supabase
          .from("alert_settings")
          .select("*")
          .eq("type", "sms_balance")
          .single();
          
        if (notificationData) {
          form.setValue("phoneNumber", notificationData.phone_number);
        }
        
        if (extraAlertData) {
          form.setValue("extraAlertPhoneNumber", extraAlertData.phone_number);
        }
        
        if (alertData) {
          form.setValue("smsBalanceThreshold", alertData.threshold);
        }
        
        setSettings({
          phoneNumber: notificationData?.phone_number || "",
          extraAlertPhoneNumber: extraAlertData?.phone_number || "",
          smsBalanceThreshold: alertData?.threshold || 400
        });
      } catch (error) {
        console.error("Error fetching SMS alert settings:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSettings();
  }, [form]);

  const checkBalance = async () => {
    setIsCheckingBalance(true);
    try {
      await supabase.functions.invoke('check-sms-balance-alert');
      toast({
        title: "Balance check completed",
        description: "SMS balance has been checked and alerts created if needed."
      });
    } catch (error) {
      console.error("Error checking SMS balance:", error);
      toast({
        title: "Error",
        description: "Failed to check SMS balance. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCheckingBalance(false);
    }
  };

  const onSubmit = async (data: SmsAlertSettingsFormData) => {
    setIsLoading(true);
    try {
      // Save notification settings
      const phoneResult = await supabase.from("notification_settings").upsert({
        type: "sms_alerts",
        phone_number: data.phoneNumber,
        enabled: true
      }, {
        onConflict: "type"
      });

      // Save extra alert settings
      const extraPhoneResult = await supabase.from("notification_settings").upsert({
        type: "extra_alerts",
        phone_number: data.extraAlertPhoneNumber,
        enabled: true
      }, {
        onConflict: "type"
      });

      // Save threshold settings
      const thresholdResult = await supabase.from("alert_settings").upsert({
        type: "sms_balance",
        threshold: data.smsBalanceThreshold,
        enabled: true
      }, {
        onConflict: "type"
      });
      
      if (phoneResult.error || thresholdResult.error || extraPhoneResult.error) {
        throw new Error(phoneResult.error?.message || thresholdResult.error?.message || extraPhoneResult.error?.message);
      }
      
      toast({
        title: "Settings saved",
        description: "SMS alert settings have been updated successfully."
      });
      
      setSettings(data);
      
      // Check balance after updating settings
      await checkBalance();
      
    } catch (error) {
      console.error("Error saving SMS alert settings:", error);
      toast({
        title: "Error",
        description: "Failed to save SMS alert settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>SMS Alert Settings</CardTitle>
          <CardDescription>Configure SMS notifications for system alerts</CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={checkBalance}
          disabled={isCheckingBalance}
        >
          <RotateCw className={`h-4 w-4 mr-2 ${isCheckingBalance ? 'animate-spin' : ''}`} />
          Check Balance Now
        </Button>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alert Phone Number</FormLabel>
                  <FormControl>
                    <div className="flex items-center space-x-2">
                      <div className="relative flex-1">
                        <PhoneIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="+233xxxxxxxxx" className="pl-10" {...field} />
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription>
                    All system alerts will be sent as SMS to this phone number
                  </FormDescription>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="extraAlertPhoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Extra Alert Phone Number (Optional)</FormLabel>
                  <FormControl>
                    <div className="flex items-center space-x-2">
                      <div className="relative flex-1">
                        <PhoneIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="+233xxxxxxxxx" className="pl-10" {...field} />
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Additional phone number for important alerts
                  </FormDescription>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="smsBalanceThreshold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SMS Balance Alert Threshold</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="1" 
                      {...field} 
                      onChange={e => field.onChange(parseInt(e.target.value))} 
                    />
                  </FormControl>
                  <FormDescription>
                    You'll receive an alert when SMS balance falls below this number
                  </FormDescription>
                </FormItem>
              )}
            />
            
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
