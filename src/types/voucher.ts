
export interface VoucherType {
  id: string;
  name: string;
  price: number;
  bulk_price: number | null;
  stock: number;
  description: string | null;
}
