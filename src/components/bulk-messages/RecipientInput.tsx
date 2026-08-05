import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserCircle, Database } from "lucide-react";
import { useState } from "react";

interface RecipientInputProps {
  messageType: 'sms' | 'email' | 'scheduled-sms';
  recipients: string;
  onRecipientsChange: (value: string) => void;
}

export function RecipientInput({ messageType, recipients, onRecipientsChange }: RecipientInputProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [uniqueCount, setUniqueCount] = useState(0);

  const [isLoadingData, setIsLoadingData] = useState(false);

  const handleLoadDataContacts = async () => {
    setIsLoadingData(true);
    try {
      const response = await fetch("https://ngqlvcbkbxoqpdvmofto.supabase.co/functions/v1/distinct-phones");
      const result = await response.json();

      if (result.success && result.phone_numbers?.length > 0) {
        const phones = result.phone_numbers.join(', ');
        onRecipientsChange(phones);
        setUniqueCount(result.phone_numbers.length);
        toast({
          title: "Data contacts loaded",
          description: `${result.phone_numbers.length} phone number(s) loaded successfully`
        });
      } else {
        setUniqueCount(0);
        toast({
          title: "No contacts found",
          description: "No phone numbers returned from data endpoint",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error loading data contacts:", error);
      setUniqueCount(0);
      toast({
        title: "Error loading data contacts",
        description: "Failed to fetch phone numbers from data endpoint",
        variant: "destructive"
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleLoadContacts = async () => {
    setIsLoading(true);
    try {
      if (messageType === 'email') {
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('email')
          .not('email', 'is', null);

        if (customerError) {
          throw customerError;
        }
        
        console.log(`Fetched customers with emails:`, customerData);
        
        if (customerData && customerData.length > 0) {
          const uniqueContacts = [...new Set(customerData
            .map(d => d.email)
            .filter(Boolean))];
          
          if (uniqueContacts.length > 0) {
            const contacts = uniqueContacts.join(', ');
            onRecipientsChange(contacts);
            setUniqueCount(uniqueContacts.length);
            
            toast({
              title: "Contacts loaded",
              description: `${uniqueContacts.length} unique email(s) loaded successfully`
            });
          } else {
            setUniqueCount(0);
            toast({
              title: "No valid contacts found",
              description: "No contacts with email addresses found",
              variant: "destructive"
            });
          }
        } else {
          setUniqueCount(0);
          toast({
            title: "No contacts found",
            description: "There are no contacts with email addresses",
            variant: "destructive"
          });
        }
      } else {
        const { data: transactionData, error: transactionError } = await supabase
          .from('transactions')
          .select('phone_number')
          .not('phone_number', 'is', null);
          
        if (transactionError) {
          throw transactionError;
        }
        
        console.log(`Fetched phone numbers from transactions:`, transactionData);
        
        if (transactionData && transactionData.length > 0) {
          const uniquePhones = [...new Set(transactionData
            .map(t => t.phone_number)
            .filter(Boolean))];
          
          if (uniquePhones.length > 0) {
            const phones = uniquePhones.join(', ');
            onRecipientsChange(phones);
            setUniqueCount(uniquePhones.length);
            
            toast({
              title: "Phone numbers loaded",
              description: `${uniquePhones.length} unique phone number(s) loaded successfully`
            });
          } else {
            setUniqueCount(0);
            toast({
              title: "No valid phone numbers found",
              description: "No phone numbers found in transactions",
              variant: "destructive"
            });
          }
        } else {
          setUniqueCount(0);
          toast({
            title: "No transactions found",
            description: "There are no transactions with phone numbers",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error("Error loading contacts:", error);
      setUniqueCount(0);
      toast({
        title: "Error loading contacts",
        description: "Failed to load contacts from the database",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label htmlFor="recipients">
          {messageType === 'email' ? 'Email Addresses' : 'Phone Numbers'} (comma-separated) count:({uniqueCount})
        </Label>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadContacts}
            className="gap-2"
            disabled={isLoading || isLoadingData}
          >
            <UserCircle className="h-4 w-4" />
            {isLoading ? "Loading..." : "Load Contacts"}
          </Button>
          {messageType !== 'email' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleLoadDataContacts}
              className="gap-2"
              disabled={isLoading || isLoadingData}
            >
              <Database className="h-4 w-4" />
              {isLoadingData ? "Loading..." : "Load Data Contacts"}
            </Button>
          )}
        </div>
      </div>
      
      <Input 
        id="recipients"
        placeholder={messageType === 'email' ? "Enter email addresses" : "Enter phone numbers"} 
        value={recipients}
        onChange={(e) => onRecipientsChange(e.target.value)}
      />
    </div>
  );
}

