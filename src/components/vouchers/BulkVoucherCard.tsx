
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BadgeDollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PriceDisplay } from "./PriceDisplay";
import { VoucherType } from "@/types/voucher";

interface BulkVoucherCardProps {
  bulkType: string;
  bulkQuantity: string;
  voucherInfo: VoucherType;
  onTypeChange: (type: string) => void;
  onQuantityChange: (quantity: string) => void;
  onBuy: () => void;
}

export const BulkVoucherCard = ({
  bulkType,
  bulkQuantity,
  voucherInfo,
  onTypeChange,
  onQuantityChange,
  onBuy
}: BulkVoucherCardProps) => {
  const price = voucherInfo.bulk_price || voucherInfo.price;
  const quantity = parseInt(bulkQuantity) || 0;
  
  return <Card className="border-2 hover:border-green-500 transition-all duration-300 bg-green-500/70 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-white">Bulk Purchase</span>
          <BadgeDollarSign className="h-6 w-6 text-white" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="p-4 rounded-lg bg-green-400/80">
            <PriceDisplay amount={price} quantity={quantity} />
          </div>
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-white">Voucher Type</label>
              <select 
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm" 
                value={bulkType} 
                onChange={e => onTypeChange(e.target.value)}
              >
                <option value="WASSCE">WASSCE</option>
                <option value="BECE">BECE</option>
              </select>
            </div>
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-white">Quantity (Minimum 20)</label>
              <Input 
                type="number" 
                min="20" 
                value={bulkQuantity} 
                onChange={e => onQuantityChange(e.target.value)} 
                placeholder="Enter quantity (min. 20)" 
              />
            </div>
          </div>
          <Button 
            className="w-full mt-4" 
            onClick={onBuy} 
            disabled={!bulkQuantity || parseInt(bulkQuantity) < 20}
          >
            Buy Bulk
          </Button>
        </div>
      </CardContent>
    </Card>;
};
