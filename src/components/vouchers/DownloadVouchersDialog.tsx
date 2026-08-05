import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { downloadAsCSV } from "@/utils/csvExport";
import { Download, Mail } from "lucide-react";

interface DownloadVouchersDialogProps {
  voucherType: {
    id: string;
    name: string;
    stock: number | null;
  };
}

interface TransactionData {
  product: string;
  quantity: number;
  reference: string;
  status: string;
  email?: string;
}

export function DownloadVouchersDialog({ voucherType }: DownloadVouchersDialogProps) {
  const [quantity, setQuantity] = useState<number>(1);
  const [reference, setReference] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isCheckingReference, setIsCheckingReference] = useState(false);
  const [transactionData, setTransactionData] = useState<TransactionData | null>(null);
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const { toast } = useToast();

  // Clear form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setReference("");
      setQuantity(1);
      setTransactionData(null);
      setReferenceError(null);
    }
  }, [isOpen]);

  // Fetch transaction data when reference changes
  useEffect(() => {
    const fetchTransactionData = async () => {
      if (!reference.trim()) {
        setReferenceError(null);
        setTransactionData(null);
        return;
      }
      
      setIsCheckingReference(true);
      setReferenceError(null);
      
      try {
        // Check if this reference corresponds to a completed transaction
        // This is a critical fix - we need to check the status in the transactions table
        // rather than just looking for existence in sold_vouchers
        const { data: soldData, error: soldError } = await supabase
          .from('sold_vouchers')
          .select('reference')
          .eq('reference', reference.trim())
          .limit(1);
          
        if (soldData && soldData.length > 0) {
          // Get the transaction status to verify if it's truly completed
          const { data: transactionData } = await supabase
            .from('transactions')
            .select('status')
            .eq('reference', reference.trim())
            .single();
            
          // Only consider the reference used if the transaction is completed
          if (transactionData && transactionData.status === 'completed') {
            setReferenceError("This reference has already been used to download vouchers");
            toast({
              title: "Reference already used",
              description: "This reference has already been used to download vouchers",
              variant: "destructive"
            });
            setTransactionData(null);
            setIsCheckingReference(false);
            return;
          }
        }
        
        // Now check the transaction in the transactions table
        const { data, error } = await supabase
          .from('transactions')
          .select('product, quantity, reference, status')
          .eq('reference', reference.trim())
          .single();
        
        if (error) {
          console.error("Error fetching transaction:", error);
          toast({
            title: "Reference not found",
            description: "No transaction found with this reference number",
            variant: "destructive"
          });
          setTransactionData(null);
          return;
        }
        
        if (data) {
          // Validate that the voucher type matches the one in the transaction
          if (data.product.toLowerCase() !== voucherType.name.toLowerCase()) {
            toast({
              title: "Voucher type mismatch",
              description: `This reference belongs to "${data.product}" vouchers, not "${voucherType.name}"`,
              variant: "destructive"
            });
            setReferenceError(`This reference belongs to "${data.product}" vouchers`);
            setTransactionData(null);
            return;
          }
          
          setTransactionData(data);
          setQuantity(data.quantity || 1);
          toast({
            title: "Reference found",
            description: `Found transaction for ${data.quantity} ${data.product} voucher${data.quantity !== 1 ? 's' : ''}`
          });
        }
      } catch (error) {
        console.error("Error in fetchTransactionData:", error);
        toast({
          title: "Error",
          description: "Failed to check reference",
          variant: "destructive"
        });
      } finally {
        setIsCheckingReference(false);
      }
    };
    
    const debounceTimer = setTimeout(() => {
      if (reference.trim()) {
        fetchTransactionData();
      }
    }, 500);
    
    return () => clearTimeout(debounceTimer);
  }, [reference, voucherType.name, toast]);

  const generateCSVContent = (vouchers: any[]) => {
    const csvData = vouchers.map(voucher => ({
      Type: voucher.type,
      Serial: voucher.serial,
      PIN: voucher.pin,
    }));
    
    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => 
        headers.map(header => {
          const value = row[header]?.toString() ?? '';
          return value.includes(',') ? `"${value.replace(/"/g, '""')}"` : value;
        }).join(',')
      )
    ].join('\n');
    
    return csvContent;
  };

  const uploadCSVToStorage = async (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv' });
    
    const { data, error } = await supabase.storage
      .from('email-attachments')
      .upload(filename, blob);

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('email-attachments')
      .getPublicUrl(filename);

    return {
      filename: filename,
      url: urlData.publicUrl
    };
  };

  const sendViaEmail = async () => {
    if (!quantity || quantity <= 0) {
      toast({
        title: "Invalid quantity",
        description: "Please enter a valid number of vouchers to send",
        variant: "destructive"
      });
      return;
    }

    if (!reference.trim()) {
      toast({
        title: "Missing reference",
        description: "Please enter a reference number for this transaction",
        variant: "destructive"
      });
      return;
    }

    if (!transactionData?.email) {
      toast({
        title: "No email address found",
        description: "No email address found for this transaction reference",
        variant: "destructive"
      });
      return;
    }

    if (quantity > (voucherType.stock || 0)) {
      toast({
        title: "Insufficient stock",
        description: `Only ${voucherType.stock} vouchers available`,
        variant: "destructive"
      });
      return;
    }

    setIsSendingEmail(true);
    try {
      // Double-check if reference already exists in sold_vouchers
      const { data: existingReference, error: refError } = await supabase
        .from('sold_vouchers')
        .select('id')
        .eq('reference', reference.trim())
        .limit(1);
        
      if (existingReference && existingReference.length > 0) {
        const { data: transactionData } = await supabase
          .from('transactions')
          .select('status')
          .eq('reference', reference.trim())
          .single();
          
        if (transactionData && transactionData.status === 'completed') {
          toast({
            title: "Reference already used",
            description: "This reference has already been used to send vouchers",
            variant: "destructive"
          });
          setIsSendingEmail(false);
          return;
        }
      }

      // 1. Fetch vouchers
      const { data: vouchers, error } = await supabase
        .from('inventory')
        .select('id, serial, pin, type, created_at')
        .eq('type', voucherType.name)
        .limit(quantity);

      if (error) throw error;

      if (!vouchers || vouchers.length === 0) {
        toast({
          title: "No vouchers found",
          description: "There are no vouchers available to send",
          variant: "destructive"
        });
        setIsSendingEmail(false);
        return;
      }

      // 2. Generate CSV content
      const csvContent = generateCSVContent(vouchers);
      const filename = `vouchers_${reference.trim()}.csv`;

      // 3. Upload CSV to storage
      const attachment = await uploadCSVToStorage(csvContent, filename);

      // 4. Send email
      const { data: emailData, error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          to: [transactionData.email],
          subject: `Your Vouchers - Reference: ${reference.trim()}`,
          template_data: {
            product: voucherType.name,
            quantity: quantity,
            reference_id: reference.trim()
          },
          attachments: [attachment]
        }
      });

      if (emailError) throw new Error(`Email sending failed: ${emailError.message}`);

      // 5. Only if email sent successfully, record vouchers
      const soldVouchersData = vouchers.map(voucher => ({
        serial: voucher.serial,
        pin: voucher.pin,
        type: voucher.type,
        phone_number: 'admin-email',
        reference: reference
      }));
      
      const { error: insertError } = await supabase
        .from('sold_vouchers')
        .insert(soldVouchersData);
        
      if (insertError) throw insertError;
        
      // 6. Delete vouchers from inventory
      const voucherIds = vouchers.map(v => v.id);
      const { error: deleteError } = await supabase
        .from('inventory')
        .delete()
        .in('id', voucherIds);
        
      if (deleteError) throw deleteError;
      
      // 7. Update transaction status to completed
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ status: 'completed' })
        .eq('reference', reference.trim());
          
      if (updateError) {
        console.error("Error updating transaction status:", updateError);
      }

      setIsOpen(false);
      toast({
        title: "Email sent successfully",
        description: `${vouchers.length} vouchers have been sent to ${transactionData.email}`
      });
    } catch (error) {
      console.error("Email sending error:", error);
      toast({
        title: "Email sending failed",
        description: error.message || "There was an error sending the vouchers via email",
        variant: "destructive"
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleDownload = async () => {
    if (!quantity || quantity <= 0) {
      toast({
        title: "Invalid quantity",
        description: "Please enter a valid number of vouchers to download",
        variant: "destructive"
      });
      return;
    }

    if (!reference.trim()) {
      toast({
        title: "Missing reference",
        description: "Please enter a reference number for this download",
        variant: "destructive"
      });
      return;
    }

    if (quantity > (voucherType.stock || 0)) {
      toast({
        title: "Insufficient stock",
        description: `Only ${voucherType.stock} vouchers available`,
        variant: "destructive"
      });
      return;
    }

    setIsDownloading(true);
    try {
      // Double-check if reference already exists in sold_vouchers and has a completed transaction
      const { data: existingReference, error: refError } = await supabase
        .from('sold_vouchers')
        .select('id')
        .eq('reference', reference.trim())
        .limit(1);
        
      if (existingReference && existingReference.length > 0) {
        const { data: transactionData } = await supabase
          .from('transactions')
          .select('status')
          .eq('reference', reference.trim())
          .single();
          
        if (transactionData && transactionData.status === 'completed') {
          toast({
            title: "Reference already used",
            description: "This reference has already been used to download vouchers",
            variant: "destructive"
          });
          setIsDownloading(false);
          return;
        }
      }

      // 1. Fetch vouchers to download
      const { data: vouchers, error } = await supabase
        .from('inventory')
        .select('id, serial, pin, type, created_at')
        .eq('type', voucherType.name)
        .limit(quantity);

      if (error) throw error;

      if (!vouchers || vouchers.length === 0) {
        toast({
          title: "No vouchers found",
          description: "There are no vouchers available for download",
          variant: "destructive"
        });
        setIsDownloading(false);
        return;
      }

      // 2. Prepare CSV data
      const csvData = vouchers.map(voucher => ({
        Type: voucher.type,
        Serial: voucher.serial,
        PIN: voucher.pin,
      }));

      // 3. Download as CSV with reference as filename
      downloadAsCSV(csvData, reference.trim());
      
      // 4. Move vouchers to sold_vouchers table with the provided reference
      const soldVouchersData = vouchers.map(voucher => ({
        serial: voucher.serial,
        pin: voucher.pin,
        type: voucher.type,
        phone_number: 'admin-download',
        reference: reference
      }));
      
      const { error: insertError } = await supabase
        .from('sold_vouchers')
        .insert(soldVouchersData);
        
      if (insertError) throw insertError;
        
      // 5. Delete vouchers from inventory
      const voucherIds = vouchers.map(v => v.id);
      const { error: deleteError } = await supabase
        .from('inventory')
        .delete()
        .in('id', voucherIds);
        
      if (deleteError) throw deleteError;
      
      // 6. Update transaction status to completed
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ status: 'completed' })
        .eq('reference', reference.trim());
          
      if (updateError) {
        console.error("Error updating transaction status:", updateError);
      }

      setIsOpen(false);
      toast({
        title: "Download successful",
        description: `${vouchers.length} vouchers have been downloaded and removed from inventory`
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download failed",
        description: "There was an error downloading the vouchers",
        variant: "destructive"
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          <span>Download Vouchers</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Download {voucherType.name} Vouchers</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Reference Number</label>
            <Input
              type="text"
              placeholder="Enter reference number"
              value={reference}
              onChange={e => setReference(e.target.value)}
              disabled={isCheckingReference}
              className={referenceError ? "border-red-500" : ""}
            />
            {isCheckingReference && (
              <div className="text-sm text-muted-foreground flex items-center">
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent mr-2" />
                Checking reference...
              </div>
            )}
            {referenceError && (
              <p className="text-sm text-red-500">{referenceError}</p>
            )}
            {transactionData && !referenceError && (
              <div className="space-y-1">
                <p className="text-sm text-green-600">
                  Found transaction for {transactionData.quantity} {voucherType.name} voucher{transactionData.quantity !== 1 ? 's' : ''}
                </p>
                {transactionData.email && (
                  <p className="text-sm text-blue-600">
                    Email available: {transactionData.email}
                  </p>
                )}
                {!transactionData.email && (
                  <p className="text-sm text-orange-600">
                    No email address found for this reference
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Number of vouchers</label>
            <Input
              type="number"
              min="1"
              max={voucherType.stock || undefined}
              value={quantity}
              onChange={e => setQuantity(parseInt(e.target.value) || 0)}
              disabled={!!transactionData}
            />
            <p className="text-sm text-muted-foreground">
              Available stock: {voucherType.stock || 0} vouchers
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              className="flex-1 gap-2" 
              onClick={handleDownload} 
              disabled={isDownloading || isSendingEmail || quantity <= 0 || quantity > (voucherType.stock || 0) || !reference.trim() || !!referenceError}
            >
              {isDownloading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download {quantity} voucher{quantity !== 1 ? 's' : ''}
            </Button>
            
            <Button 
              variant="outline"
              className="flex-1 gap-2" 
              onClick={sendViaEmail} 
              disabled={isDownloading || isSendingEmail || quantity <= 0 || quantity > (voucherType.stock || 0) || !reference.trim() || !!referenceError || !transactionData?.email}
            >
              {isSendingEmail ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              Send via Email
            </Button>
          </div>
          
          {!transactionData?.email && reference.trim() && transactionData && (
            <p className="text-sm text-muted-foreground text-center">
              Email option disabled - no email address found for this reference
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
