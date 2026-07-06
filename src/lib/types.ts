export interface DataBundle {
  id: string;
  network: string;
  name: string;
  sizeMB: number;
  costPrice: number; // GHS
  sellingPrice: number; // GHS
}

export interface Transaction {
  id: string;
  date: string;
  customerName: string;
  customerPhone: string;
  bundle: string;
  network: string;
  amount: number; // GHS
  profit: number;
  status: "completed" | "pending" | "failed";
}

export const NETWORKS = ["MTN", "Vodafone", "AirtelTigo", "Glo"] as const;

export type Network = (typeof NETWORKS)[number];

export const networkColors: Record<Network, string> = {
  MTN: "hsl(45, 100%, 50%)",
  Vodafone: "hsl(0, 72%, 51%)",
  AirtelTigo: "hsl(200, 70%, 50%)",
  Glo: "hsl(130, 60%, 40%)",
};
