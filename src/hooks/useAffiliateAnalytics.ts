import { useQuery } from "@tanstack/react-query";

const TRANSACTIONS_ENDPOINT =
  "https://ngqlvcbkbxoqpdvmofto.supabase.co/functions/v1/api-webhook-transactions";
const AFFILIATES_ENDPOINT =
  "https://ngqlvcbkbxoqpdvmofto.supabase.co/functions/v1/api-affiliates";

export interface WebhookTransaction {
  id: string;
  reference: string | null;
  phone_number: string | null;
  product: string | null;
  quantity: number | null;
  amount: number | null;
  status: string | null;
  source_hook: string | null;
  full_name?: string | null;
  created_at: string;
  raw_payload?: unknown;
}

export interface Affiliate {
  id: string;
  username?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  ussd_code?: string | null;
  commission_rate?: number | null;
  balance?: number | null;
  momo_number?: string | null;
  momo_name?: string | null;
  source_hook?: string | null;
  lifetime_commissions?: number | null;
  sales_quantity?: number | null;
  sales_amount?: number | null;
  created_at?: string;
}

export interface LeaderboardEntry {
  sourceHook: string;
  affiliate?: Affiliate;
  name: string;
  sales: number;
  quantity: number;
  amount: number;
  commission: number;
  commissionRate: number;
}

const PAGE_SIZE = 1000;

async function fetchAllTransactions(): Promise<WebhookTransaction[]> {
  const all: WebhookTransaction[] = [];
  let page = 1;
  let total = Infinity;

  while (all.length < total && page <= 10) {
    const res = await fetch(
      `${TRANSACTIONS_ENDPOINT}?page=${page}&limit=${PAGE_SIZE}`,
      { method: "GET" }
    );
    if (!res.ok) throw new Error(`Failed to load transactions (${res.status})`);
    const data = await res.json();
    const list: WebhookTransaction[] = data?.transactions ?? [];
    total = Number(data?.total ?? list.length);
    all.push(...list);
    if (list.length === 0) break;
    page += 1;
  }

  return all;
}

async function fetchAffiliates(): Promise<Affiliate[]> {
  const res = await fetch(AFFILIATES_ENDPOINT, { method: "GET" });
  if (!res.ok) throw new Error(`Failed to load affiliates (${res.status})`);
  const data = await res.json();
  return data?.affiliates ?? data?.data ?? [];
}

export const isAffiliateTransaction = (t: WebhookTransaction) =>
  !!t.source_hook && String(t.source_hook).trim() !== "";

export const isSuccessful = (t: WebhookTransaction) =>
  ["completed", "success", "successful", "paid"].includes(
    String(t.status ?? "").toLowerCase()
  );

export function useAffiliateAnalytics() {
  const transactionsQuery = useQuery({
    queryKey: ["webhook-transactions"],
    queryFn: fetchAllTransactions,
    staleTime: 60_000,
  });

  const affiliatesQuery = useQuery({
    queryKey: ["affiliates-list"],
    queryFn: fetchAffiliates,
    staleTime: 60_000,
  });

  const transactions = transactionsQuery.data ?? [];
  const affiliates = affiliatesQuery.data ?? [];

  const affiliateByHook = new Map<string, Affiliate>();
  affiliates.forEach((a) => {
    if (a.source_hook) affiliateByHook.set(String(a.source_hook).trim(), a);
  });

  const affiliateTx = transactions.filter(isAffiliateTransaction);
  const successfulTx = affiliateTx.filter(isSuccessful);

  const groups = new Map<string, WebhookTransaction[]>();
  successfulTx.forEach((t) => {
    const hook = String(t.source_hook).trim();
    const list = groups.get(hook) ?? [];
    list.push(t);
    groups.set(hook, list);
  });

  const leaderboard: LeaderboardEntry[] = Array.from(groups.entries())
    .map(([sourceHook, list]) => {
      const affiliate = affiliateByHook.get(sourceHook);
      const commissionRate = Number(affiliate?.commission_rate ?? 0);
      const amount = list.reduce((s, t) => s + Number(t.amount ?? 0), 0);
      const quantity = list.reduce((s, t) => s + Number(t.quantity ?? 0), 0);
      return {
        sourceHook,
        affiliate,
        name:
          affiliate?.full_name ||
          affiliate?.username ||
          `Unassigned (${sourceHook})`,
        sales: list.length,
        quantity,
        amount,
        commission: (amount * commissionRate) / 100,
        commissionRate,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  const totals = {
    affiliateSalesCount: successfulTx.length,
    affiliateSalesAmount: successfulTx.reduce(
      (s, t) => s + Number(t.amount ?? 0),
      0
    ),
    affiliateQuantity: successfulTx.reduce(
      (s, t) => s + Number(t.quantity ?? 0),
      0
    ),
    totalCommission: leaderboard.reduce((s, e) => s + e.commission, 0),
    activeAffiliates: leaderboard.length,
    pendingBalance: affiliates.reduce((s, a) => s + Number(a.balance ?? 0), 0),
  };

  // Daily breakdown for income analytics
  const dayMap = new Map<
    string,
    { date: string; sales: number; revenue: number; commission: number }
  >();
  successfulTx.forEach((t) => {
    const key = new Date(t.created_at).toISOString().slice(0, 10);
    const hook = String(t.source_hook).trim();
    const rate = Number(affiliateByHook.get(hook)?.commission_rate ?? 0);
    const amount = Number(t.amount ?? 0);
    const entry =
      dayMap.get(key) ?? { date: key, sales: 0, revenue: 0, commission: 0 };
    entry.sales += 1;
    entry.revenue += amount;
    entry.commission += (amount * rate) / 100;
    dayMap.set(key, entry);
  });

  const daily = Array.from(dayMap.values()).sort((a, b) =>
    a.date < b.date ? 1 : -1
  );

  return {
    transactions,
    affiliateTx,
    affiliates,
    leaderboard,
    totals,
    daily,
    isLoading: transactionsQuery.isLoading || affiliatesQuery.isLoading,
    refetch: () => {
      transactionsQuery.refetch();
      affiliatesQuery.refetch();
    },
  };
}
