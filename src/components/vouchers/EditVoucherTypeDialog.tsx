
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Pencil } from "lucide-react";

interface VoucherType {
  id: string;
  name: string;
  price: number;
  bulk_price: number | null;
  description: string | null;
}

interface EditVoucherTypeDialogProps {
  voucherType: VoucherType;
  onSuccess: () => void;
}

export function EditVoucherTypeDialog({ voucherType, onSuccess }: EditVoucherTypeDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<VoucherType>({
    ...voucherType
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleChange = (field: keyof VoucherType, value: string | number | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    // Validate inputs
    if (formData.price <= 0) {
      toast({
        title: "Validation Error",
        description: "Please provide a valid price for the voucher type.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Update voucher type in Supabase
      const { error } = await supabase
        .from('voucher_types')
        .update({
          price: formData.price,
          bulk_price: formData.bulk_price,
          description: formData.description
        })
        .eq('id', voucherType.id);

      if (error) throw error;

      toast({
        title: "Voucher Type Updated",
        description: `${formData.name} has been updated successfully.`
      });
      
      setIsOpen(false);
      onSuccess();
    } catch (error) {
      console.error("Error updating voucher type:", error);
      toast({
        title: "Error",
        description: "Failed to update voucher type",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => setIsOpen(true)}
        title="Edit voucher type"
      >
        <Pencil className="h-4 w-4 text-blue-500" />
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {formData.name} Voucher Type</DialogTitle>
          <DialogDescription>
            Update the details of this voucher type.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="price">Price</Label>
            <Input 
              id="price" 
              type="number" 
              value={formData.price} 
              onChange={e => handleChange('price', parseFloat(e.target.value) || 0)} 
              placeholder="25.00" 
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bulk_price">Bulk Price (Optional)</Label>
            <Input 
              id="bulk_price" 
              type="number" 
              value={formData.bulk_price || ''} 
              onChange={e => handleChange('bulk_price', e.target.value ? parseFloat(e.target.value) : null)} 
              placeholder="20.00" 
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input 
              id="description" 
              value={formData.description || ''} 
              onChange={e => handleChange('description', e.target.value || null)} 
              placeholder="Description of the voucher type" 
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
            ) : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
