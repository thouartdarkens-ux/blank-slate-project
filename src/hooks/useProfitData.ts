import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { extractReferencePrefix, normalizePrefix, OTHER_PREFIX } from "@/utils/referencePrefix";

interface VoucherPricing {
  name: string;
  price: number;
  cost_price: number;
  bulk_price: number | null;
}

interface AggregatorPrefix {
  prefix: string;
  charge_percentage: number;
}

export function useProfitData() {
  const { data: voucherPricing } = useQuery({
    queryKey: ["voucher-pricing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voucher_types")
        .select("name, price, cost_price, bulk_price");
      if (error) throw error;
      return (data || []).map((v: any) => ({
        name: v.name,
        price: Number(v.price ?? 0),
        cost_price: Number(v.cost_price ?? 0),
        bulk_price: v.bulk_price != null ? Number(v.bulk_price) : null,
      })) as VoucherPricing[];
    },
  });

  const { data: aggregatorPrefixes } = useQuery({
    queryKey: ["aggregator-prefixes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aggregator_prefixes")
        .select("prefix, charge_percentage");
      if (error) throw error;
      return (data || []).map((prefix: any) => ({
        prefix: prefix.prefix,
        charge_percentage: Number(prefix.charge_percentage ?? 0),
      })) as AggregatorPrefix[];
    },
  });

  const pricingMap = useMemo(
    () => new Map((voucherPricing || []).map((voucher) => [voucher.name.trim().toLowerCase(), voucher])),
    [voucherPricing]
  );

  const prefixChargeMap = useMemo(
    () =>
      new Map(
        (aggregatorPrefixes || []).map((prefix) => [
          normalizePrefix(prefix.prefix),
          Number(prefix.charge_percentage ?? 0),
        ])
      ),
    [aggregatorPrefixes]
  );

  const getAggregatorCharge = useCallback((reference: string | null): number => {
    if (!aggregatorPrefixes || aggregatorPrefixes.length === 0) return 0;
    const prefix = extractReferencePrefix(reference);
    return prefixChargeMap.get(prefix) ?? prefixChargeMap.get(OTHER_PREFIX) ?? 0;
  }, [aggregatorPrefixes, prefixChargeMap]);

  const calculateProfit = useCallback((
    transactions: {
      product: string | null;
      quantity: number;
      amount: number;
      reference?: string | null;
    }[]
  ) => {
    if (!voucherPricing || voucherPricing.length === 0) return null;
    if (!aggregatorPrefixes) return null;

    let totalProfit = 0;
    let hasPricing = false;

    for (const t of transactions) {
      const quantity = t.quantity > 0 ? t.quantity : 1;
      const pricing = pricingMap.get((t.product || "").trim().toLowerCase());

      if (pricing && pricing.cost_price > 0) {
        hasPricing = true;

        const fallbackUnitPrice = quantity >= 20 && pricing.bulk_price != null
          ? pricing.bulk_price
          : pricing.price;
        const totalRevenue = t.amount > 0 ? t.amount : fallbackUnitPrice * quantity;
        const sellingPrice = quantity > 0 ? totalRevenue / quantity : fallbackUnitPrice;
        const aggregatorPct = getAggregatorCharge(t.reference ?? null);
        const aggregatorAmount = (aggregatorPct / 100) * sellingPrice;

        const profitPerVoucher = sellingPrice - pricing.cost_price - aggregatorAmount;
        totalProfit += profitPerVoucher * quantity;
      }
    }

    return hasPricing ? totalProfit : null;
  }, [voucherPricing, aggregatorPrefixes, pricingMap, getAggregatorCharge]);

  return { voucherPricing, aggregatorPrefixes, calculateProfit };
}
