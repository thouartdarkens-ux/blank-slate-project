
interface PriceDisplayProps {
  amount: number;
  quantity: number;
}

export const PriceDisplay = ({
  amount,
  quantity
}: PriceDisplayProps) => <p className="text-3xl font-bold mb-2 text-white">
    GH₵ {(amount * quantity).toFixed(2)}
  </p>;
