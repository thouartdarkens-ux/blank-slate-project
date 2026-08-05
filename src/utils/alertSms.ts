
import { supabase } from "@/integrations/supabase/client";
import { sendSMS } from "@/utils/sms";
import { getSmsApiKey } from "./smsApiKey";
import { Alert } from "@/types/alerts";

// Define types of alerts that are related to vouchers
const VOUCHER_ALERT_TYPES = ["low_inventory", "inventory_available"];

export const sendAlertSms = async (alert: Alert, phoneNumber: string): Promise<void> => {
  if (!phoneNumber) return;
  
  try {
    // Determine which sender ID to use
    // Use MOVAconsult for voucher-related alerts, MOVAalerts for other alerts
    const senderId ='MOVAalerts';
    
    await sendSMS({
      message: alert.message,
      recipients: [phoneNumber],
      senderId,
      source: 'alert-system',
      context: `alert-${alert.type}`
    });
    
    console.log(`Alert SMS sent to ${phoneNumber} with sender ID: ${senderId}`);
  } catch (error) {
    console.error('Error sending alert SMS:', error);
  }
};

export const checkAndNotifyLowSmsBalance = async (): Promise<void> => {
  try {
    // Fetch the balance threshold setting
    const { data: thresholdSetting, error: thresholdError } = await supabase
      .from('alert_settings')
      .select('*')
      .eq('type', 'sms_balance')
      .single();
    
    if (thresholdError || !thresholdSetting) {
      console.error('Error fetching SMS balance threshold:', thresholdError);
      return;
    }
    
    // Fetch notification phone number
    const { data: notification, error: notificationError } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('type', 'sms_alerts')
      .single();
    
    if (notificationError || !notification || !notification.enabled) {
      console.error('Error fetching SMS notification settings:', notificationError);
      return;
    }
    
    // Check the current SMS balance
    const { data, error } = await supabase.functions.invoke('check-sms-balance');
    
    if (error) {
      console.error('Error checking SMS balance:', error);
      return;
    }
    
    const { balance } = data;
    
    // If balance is below threshold, create an alert
    if (balance <= thresholdSetting.threshold) {
      // Check if there's already an active low balance alert
      const { data: existingAlerts } = await supabase
        .from('alerts')
        .select('*')
        .eq('type', 'low_sms_balance')
        .eq('status', 'new')
        .limit(1);
      
      // Only create a new alert if there isn't one already
      if (!existingAlerts || existingAlerts.length === 0) {
        // Create the alert
        const { error: insertError } = await supabase
          .from('alerts')
          .insert({
            type: 'low_sms_balance',
            message: `Low SMS balance alert: only ${balance} credits remaining (threshold: ${thresholdSetting.threshold})`,
            data: { 
              current_balance: balance,
              threshold: thresholdSetting.threshold
            }
          });
        
        if (insertError) {
          console.error('Error creating low SMS balance alert:', insertError);
          return;
        }
        
        // Send SMS notification about low balance using the new authenticated method
        try {
          const apiKey = await getSmsApiKey();
          
          const { error: smsError } = await supabase.functions.invoke('send-sms', {
            body: {
              message: `Low SMS balance alert: only ${balance} credits remaining (threshold: ${thresholdSetting.threshold})`,
              recipients: [notification.phone_number],
              senderId: 'MOVAalerts',
              source: 'balance-monitor',
              context: 'low-sms-balance-alert'
            },
            headers: {
              'X-API-Key': apiKey
            }
          });
          
          if (smsError) {
            console.error('Error sending low balance SMS alert:', smsError);
          }
        } catch (smsError) {
          console.error('Error in low balance SMS notification:', smsError);
        }
      }
    }
  } catch (error) {
    console.error('Error in checkAndNotifyLowSmsBalance:', error);
  }
};
