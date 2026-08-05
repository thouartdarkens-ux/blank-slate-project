
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { sendAlertSms } from "@/utils/alertSms";

export function useAlerts() {
  const queryClient = useQueryClient();

  // Fetch alerts
  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Send new alerts as SMS if configured
      const { data: notificationSettings } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('type', 'sms_alerts')
        .single();
        
      if (notificationSettings?.enabled && notificationSettings?.phone_number) {
        const newAlerts = data.filter(alert => alert.status === 'new');
        for (const newAlert of newAlerts) {
          await sendAlertSms(newAlert, notificationSettings.phone_number);
        }
      }
      
      return data;
    }
  });

  // Mark alert as read
  const { mutate: markAsRead } = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('alerts')
        .update({ status: 'read' })
        .eq('id', alertId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update alert status",
        variant: "destructive"
      });
    }
  });

  return {
    alerts,
    isLoading,
    markAsRead
  };
}
