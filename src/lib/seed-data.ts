import { DataBundle, Transaction } from "./types";

// Seed bundles
export const defaultBundles: DataBundle[] = [
  { id: "1", network: "MTN", name: "Daily 1GB", sizeMB: 1024, costPrice: 3.5, sellingPrice: 5 },
  { id: "2", network: "MTN", name: "Weekly 5GB", sizeMB: 5120, costPrice: 15, sellingPrice: 22 },
  { id: "3", network: "MTN", name: "Monthly 10GB", sizeMB: 10240, costPrice: 45, sellingPrice: 60 },
  { id: "4", network: "Vodafone", name: "Daily 1.5GB", sizeMB: 1536, costPrice: 4, sellingPrice: 6 },
  { id: "5", network: "Vodafone", name: "Weekly 7GB", sizeMB: 7168, costPrice: 18, sellingPrice: 28 },
  { id: "6", network: "AirtelTigo", name: "Daily 2GB", sizeMB: 2048, costPrice: 4.5, sellingPrice: 7 },
  { id: "7", network: "AirtelTigo", name: "Monthly 15GB", sizeMB: 15360, costPrice: 50, sellingPrice: 70 },
  { id: "8", network: "Glo", name: "Weekly 3GB", sizeMB: 3072, costPrice: 10, sellingPrice: 15 },
];

// Seed transactions
const now = new Date();
const day = (d: number) => {
  const date = new Date(now);
  date.setDate(date.getDate() - d);
  return date.toISOString();
};

export const defaultTransactions: Transaction[] = [
  { id: "t1", date: day(0), customerName: "Kwame Asante", customerPhone: "024 123 4567", bundle: "Daily 1GB", network: "MTN", amount: 5, profit: 1.5, status: "completed" },
  { id: "t2", date: day(0), customerName: "Ama Serwaa", customerPhone: "020 987 6543", bundle: "Weekly 5GB", network: "MTN", amount: 22, profit: 7, status: "completed" },
  { id: "t3", date: day(0), customerName: "Kofi Mensah", customerPhone: "027 555 1234", bundle: "Daily 1.5GB", network: "Vodafone", amount: 6, profit: 2, status: "pending" },
  { id: "t4", date: day(1), customerName: "Abena Osei", customerPhone: "026 444 7890", bundle: "Monthly 10GB", network: "MTN", amount: 60, profit: 15, status: "completed" },
  { id: "t5", date: day(1), customerName: "Yaw Boateng", customerPhone: "024 333 2222", bundle: "Daily 2GB", network: "AirtelTigo", amount: 7, profit: 2.5, status: "completed" },
  { id: "t6", date: day(1), customerName: "Efua Darko", customerPhone: "020 111 3333", bundle: "Weekly 7GB", network: "Vodafone", amount: 28, profit: 10, status: "failed" },
  { id: "t7", date: day(2), customerName: "Nana Addo", customerPhone: "027 999 8888", bundle: "Weekly 3GB", network: "Glo", amount: 15, profit: 5, status: "completed" },
  { id: "t8", date: day(2), customerName: "Akua Manu", customerPhone: "024 777 6666", bundle: "Daily 1GB", network: "MTN", amount: 5, profit: 1.5, status: "completed" },
  { id: "t9", date: day(3), customerName: "Kwesi Appiah", customerPhone: "026 222 1111", bundle: "Monthly 15GB", network: "AirtelTigo", amount: 70, profit: 20, status: "completed" },
  { id: "t10", date: day(3), customerName: "Adjoa Poku", customerPhone: "020 888 4444", bundle: "Weekly 5GB", network: "MTN", amount: 22, profit: 7, status: "pending" },
  { id: "t11", date: day(4), customerName: "Kojo Annan", customerPhone: "024 666 5555", bundle: "Daily 1.5GB", network: "Vodafone", amount: 6, profit: 2, status: "completed" },
  { id: "t12", date: day(5), customerName: "Esi Quaye", customerPhone: "027 444 3333", bundle: "Daily 2GB", network: "AirtelTigo", amount: 7, profit: 2.5, status: "completed" },
  { id: "t13", date: day(6), customerName: "Papa Mensah", customerPhone: "020 555 2222", bundle: "Monthly 10GB", network: "MTN", amount: 60, profit: 15, status: "completed" },
];
