
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, RefreshCw, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

export function SmsBalanceCard() {
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const checkBalance = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // First check the balance
      const { data, error } = await supabase.functions.invoke('check-sms-balance');
      
      if (error) throw error;
      if (data?.balance !== undefined) {
        setBalance(data.balance);
        
        // Then check if we need to trigger an alert
        await supabase.functions.invoke('check-sms-balance-alert');
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching SMS balance:', err);
      setError('Failed to fetch SMS balance');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    checkBalance();
    
    // Check balance every 30 minutes
    const intervalId = setInterval(checkBalance, 30 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  const handleTopUp = () => {
    window.open('https://sms.arkesel.com/user/billing/make-payment', '_blank');
  };

  return <Card className="bg-gradient-to-br from-indigo-50 to-blue-100 dark:from-indigo-900/20 dark:to-blue-800/30">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>SMS Balance</CardTitle>
            <CardDescription>Your current SMS credit balance</CardDescription>
          </div>
          {!isLoading && <Button size="sm" variant="ghost" onClick={checkBalance} title="Refresh balance">
              <RefreshCw className="h-4 w-4" />
            </Button>}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-8 w-24" /> : error ? <div className="flex items-center text-red-500 gap-2">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div> : <div className="space-y-4">
            <div className="text-3xl font-bold">
              {balance?.toLocaleString() ?? 0} credits
            </div>
            <Button onClick={handleTopUp} variant="outline" className="w-full text-slate-50 bg-sky-600 hover:bg-sky-500">
              <ArrowUp className="mr-2 h-4 w-4" />
              Top Up
            </Button>
          </div>}
      </CardContent>
    </Card>;
}
