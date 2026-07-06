import { useState, useEffect } from "react";
import { DataBundle, Transaction } from "@/lib/types";
import { defaultBundles, defaultTransactions } from "@/lib/seed-data";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function useBundles() {
  const [bundles, setBundles] = useState<DataBundle[]>(() =>
    load("movadata_bundles", defaultBundles)
  );

  useEffect(() => {
    localStorage.setItem("movadata_bundles", JSON.stringify(bundles));
  }, [bundles]);

  return { bundles, setBundles };
}

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    load("movadata_transactions", defaultTransactions)
  );

  useEffect(() => {
    localStorage.setItem("movadata_transactions", JSON.stringify(transactions));
  }, [transactions]);

  return { transactions, setTransactions };
}
