
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface VoucherTypeFormData {
  name: string;
  price: number;
  bulk_price: number | null;
  description: string | null;
}

interface AddVoucherTypeFormProps {
  onSuccess: () => void;
}

export function AddVoucherTypeForm({ onSuccess }: AddVoucherTypeFormProps) {
  const [newVoucherType, setNewVoucherType] = useState<VoucherTypeFormData>({
    name: "",
    price: 0,
    bulk_price: null,
    description: null
  });
  
  const { toast } = useToast();

  const handleAddVoucherType = async () => {
    // Validate inputs
    if (!newVoucherType.name || newVoucherType.price <= 0) {
      toast({
        title: "Validation Error",
        description: "Please provide a name and a valid price for the voucher type.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Insert new voucher type into Supabase
      const { error } = await supabase
        .from('voucher_types')
        .insert({
          name: newVoucherType.name,
          price: newVoucherType.price,
          bulk_price: newVoucherType.bulk_price,
          description: newVoucherType.description
        });

      if (error) throw error;

      // Reset form and show success toast
      setNewVoucherType({
        name: "",
        price: 0,
        bulk_price: null,
        description: null
      });
      
      toast({
        title: "Voucher Type Added",
        description: `${newVoucherType.name} has been added to the list.`
      });
      
      // Refresh the list
      onSuccess();
    } catch (error) {
      console.error("Error adding voucher type:", error);
      toast({
        title: "Error",
        description: "Failed to add voucher type",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add Voucher Type
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Voucher Type</DialogTitle>
          <DialogDescription>
            Enter the details for the new voucher type you want to add to your inventory.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input 
              id="name" 
              value={newVoucherType.name} 
              onChange={e => setNewVoucherType({
                ...newVoucherType,
                name: e.target.value
              })} 
              placeholder="e.g., WASSCE Voucher" 
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="price">Price</Label>
            <Input 
              id="price" 
              type="number" 
              value={newVoucherType.price} 
              onChange={e => setNewVoucherType({
                ...newVoucherType,
                price: parseFloat(e.target.value)
              })} 
              placeholder="25.00" 
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bulk_price">Bulk Price (Optional)</Label>
            <Input 
              id="bulk_price" 
              type="number" 
              value={newVoucherType.bulk_price || ''} 
              onChange={e => setNewVoucherType({
                ...newVoucherType,
                bulk_price: e.target.value ? parseFloat(e.target.value) : null
              })} 
              placeholder="20.00" 
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input 
              id="description" 
              value={newVoucherType.description || ''} 
              onChange={e => setNewVoucherType({
                ...newVoucherType,
                description: e.target.value || null
              })} 
              placeholder="Description of the voucher type" 
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleAddVoucherType}>Add Voucher Type</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
