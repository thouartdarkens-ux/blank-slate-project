
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { PriceDisplay } from "./PriceDisplay";
import { VoucherType } from "@/types/voucher";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";

interface BeceVoucherCardProps {
  voucherInfo: VoucherType;
  quantity: number[];
  onQuantityChange: (value: number[]) => void;
  onBuy: (type: string, quantity: number, amount: number) => void;
}

export const BeceVoucherCard = ({
  voucherInfo,
  quantity,
  onQuantityChange,
  onBuy
}: BeceVoucherCardProps) => {
  const [inputValue, setInputValue] = useState(quantity[0].toString());

  // Keep input value in sync with external quantity changes
  useEffect(() => {
    setInputValue(quantity[0].toString());
  }, [quantity[0]]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Convert to number and validate
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 19) {
      onQuantityChange([numValue]);
    }
  };

  return <Card className="border-2 hover:border-green-500 transition-all duration-300 bg-yellow-500/70 backdrop-blur-md">
      <CardHeader className="mx-[60px]">
        <CardTitle className="flex items-center justify-between">
          <span className="text-white">Buy BECE Voucher</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="p-4 rounded-lg bg-yellow-400/80">
            <PriceDisplay amount={voucherInfo.price} quantity={quantity[0]} />
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-900">Quantity:</p>
              <span className="text-lg font-semibold text-zinc-900">{quantity[0]}</span>
            </div>
          </div>
          <div className="py-4">
            <div className="space-y-2">
              <label htmlFor="bece-quantity" className="text-sm font-medium text-white">Set Quantity (1-19):</label>
              <Input id="bece-quantity" type="number" min={1} max={19} value={inputValue} onChange={handleInputChange} className="w-full" />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-white">Minimum: 1</span>
              <span className="text-white">Maximum: 19</span>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-white">
            <li className="flex items-center">
              <Check className="h-4 w-4 text-green-300 mr-2" />
              Access to BECE examination portal
            </li>
            <li className="flex items-center">
              <Check className="h-4 w-4 text-green-300 mr-2" />
              Instant digital delivery
            </li>
          </ul>
          <Button className="w-full mt-4" onClick={() => onBuy('BECE', quantity[0], quantity[0] * voucherInfo.price)}>
            Buy Now
          </Button>
        </div>
      </CardContent>
    </Card>;
};
