
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buyChecker, buyVoucherAPI } from "@/utils/checker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface BuyVoucherFormProps {
  onSuccess?: () => void;
  useDirectAPI?: boolean;
}

export function BuyVoucherForm({ onSuccess, useDirectAPI = false }: BuyVoucherFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    reference: "",
    phone_number: "",
    product: "WASSCE",
    quantity: 1,
    amount: 0
  });

  const productPrices: Record<string, number> = {
    "WASSCE": 10,
    "JAMB": 15,
    "NECO": 12,
    "UTME": 18,
    "BECE": 8
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate amount based on product and quantity
      if (field === "product" || field === "quantity") {
        const price = productPrices[updated.product as keyof typeof productPrices] || 0;
        updated.amount = price * Number(updated.quantity);
      }
      
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!formData.reference.trim()) {
      toast({ title: "Error", description: "Reference is required", variant: "destructive" });
      return;
    }
    
    if (!formData.phone_number.trim()) {
      toast({ title: "Error", description: "Phone number is required", variant: "destructive" });
      return;
    }
    
    if (formData.quantity <= 0) {
      toast({ title: "Error", description: "Quantity must be greater than zero", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    
    try {
      const params = {
        reference: formData.reference,
        phone_number: formData.phone_number,
        product: formData.product,
        quantity: Number(formData.quantity),
        amount: Number(formData.amount)
      };

      // Choose which API endpoint to use based on prop
      const result = useDirectAPI 
        ? await buyVoucherAPI(params)
        : await buyChecker(params);
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Vouchers sent successfully to customer's phone",
        });
        
        // Reset form
        setFormData({
          reference: "",
          phone_number: "",
          product: "WASSCE",
          quantity: 1,
          amount: productPrices["WASSCE"]
        });
        
        if (onSuccess) {
          onSuccess();
        }
      } else {
        // Check if the error is related to security validation
        if (result.error && result.error.includes("Security alert")) {
          toast({
            title: "Security Alert",
            description: "Transaction flagged for security reasons. Check the alerts page.",
            variant: "destructive"
          });
        } else {
          setError(result.error || "Failed to process request");
          toast({
            title: "Error",
            description: result.error || "Failed to process request",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error("Error processing voucher purchase:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Buy Vouchers</CardTitle>
        <CardDescription>Purchase vouchers for your customers</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="reference">Reference</Label>
            <Input
              id="reference"
              placeholder="Enter reference"
              value={formData.reference}
              onChange={(e) => handleChange("reference", e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone_number">Phone Number</Label>
            <Input
              id="phone_number"
              placeholder="Enter phone number"
              value={formData.phone_number}
              onChange={(e) => handleChange("phone_number", e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="product">Voucher Type</Label>
              <Select
                value={formData.product}
                onValueChange={(value) => handleChange("product", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WASSCE">WASSCE</SelectItem>
                  <SelectItem value="JAMB">JAMB</SelectItem>
                  <SelectItem value="NECO">NECO</SelectItem>
                  <SelectItem value="UTME">UTME</SelectItem>
                  <SelectItem value="BECE">BECE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => handleChange("quantity", parseInt(e.target.value) || 0)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                readOnly
                value={formData.amount}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                Processing...
              </>
            ) : (
              "Buy and Send Vouchers"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
