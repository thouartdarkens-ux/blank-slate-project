import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Transaction = Record<string, any>;

interface ApiResponse {
  data: Transaction[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY environment variables.",
  );
}

const STATUS_ANY = "__any__";

function App() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageSizeInput, setPageSizeInput] = useState("10");

  // Inputs (what the user types) vs. applied filters (what the request uses)
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(STATUS_ANY);

  const [resp, setResp] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        });
        if (search) params.set("search", search);
        if (statusFilter !== STATUS_ANY) params.set("status", statusFilter);

        const url = `${SUPABASE_URL}/functions/v1/get-transactions?${params.toString()}`;
        const r = await fetch(url, {
          headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
        });
        if (!r.ok) throw new Error(`Request failed: ${r.status}`);
        const json: ApiResponse = await r.json();
        if (!cancelled) setResp(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, search, statusFilter]);

  const columns = resp?.data[0] ? Object.keys(resp.data[0]) : [];
  const totalPages = resp?.totalPages ?? 0;

  const applyPageSize = () => {
    const n = Math.max(1, Math.min(100, parseInt(pageSizeInput, 10) || 10));
    setPageSize(n);
    setPage(1);
  };

  const applySearch = () => {
    setSearch(searchInput.trim());
    setPage(1);
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatusFilter(STATUS_ANY);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search + filter bar */}
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[240px]">
                <label className="block text-sm text-muted-foreground mb-1">
                  Search
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Name, email, reference, phone, product"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") applySearch();
                    }}
                  />
                  <Button onClick={applySearch}>Search</Button>
                </div>
              </div>

              <div className="w-44">
                <label className="block text-sm text-muted-foreground mb-1">
                  Status
                </label>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => {
                    setStatusFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={STATUS_ANY}>Any</SelectItem>
                    <SelectItem value="pending">pending</SelectItem>
                    <SelectItem value="success">success</SelectItem>
                    <SelectItem value="failed">failed</SelectItem>
                    <SelectItem value="awaiting_inventory">
                      awaiting_inventory
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button variant="ghost" onClick={clearFilters}>
                Clear
              </Button>
            </div>

            {/* Page size + pagination */}
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">
                  Page size
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={pageSizeInput}
                    onChange={(e) => setPageSizeInput(e.target.value)}
                    className="w-24"
                  />
                  <Button onClick={applyPageSize} variant="secondary">
                    Apply
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  variant="outline"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {resp?.page ?? page} of {totalPages || "—"} (
                  {resp?.total ?? 0} total)
                </span>
                <Button
                  variant="outline"
                  disabled={loading || (totalPages > 0 && page >= totalPages)}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-destructive">Error: {error}</div>
            )}

            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((c) => (
                      <TableHead key={c}>{c}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={columns.length || 1}>
                        Loading...
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading &&
                    resp?.data.map((row, i) => (
                      <TableRow key={(row.id as string) ?? i}>
                        {columns.map((c) => (
                          <TableCell key={c} className="whitespace-nowrap">
                            {formatCell(row[c], c)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  {!loading && resp && resp.data.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={columns.length || 1}>
                        No transactions.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const DATE_COLUMNS = new Set(["date", "created_at", "updated_at", "sold_at"]);

function formatCell(v: unknown, column?: string): string {
  if (v === null || v === undefined || v === "") return "";
  if (column && DATE_COLUMNS.has(column) && typeof v === "string") {
    const d = new Date(v);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export default App;
