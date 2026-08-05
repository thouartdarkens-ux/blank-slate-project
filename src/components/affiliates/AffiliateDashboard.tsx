import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw, Trophy, Users, DollarSign, Percent } from "lucide-react";
import { useAffiliateAnalytics, LeaderboardEntry } from "@/hooks/useAffiliateAnalytics";
import { DateRangeFilter, DateRange, defaultDateRange } from "@/components/DateRangeFilter";

const cedis = (n: number) =>
  `₵${Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function AffiliateBadgeCard({ entry }: { entry: LeaderboardEntry }) {
  const a = entry.affiliate;
  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-4 w-4 text-primary" />
          {entry.name}
          <Badge variant="secondary">Hook {entry.sourceHook}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-muted-foreground">Username</p>
          <p className="font-medium">{a?.username ?? "-"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Phone</p>
          <p className="font-medium">{a?.phone ?? "-"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Email</p>
          <p className="font-medium break-all">{a?.email ?? "-"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">USSD Code</p>
          <p className="font-medium">{a?.ussd_code ?? "-"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Commission Rate</p>
          <p className="font-medium">{entry.commissionRate}%</p>
        </div>
        <div>
          <p className="text-muted-foreground">MoMo</p>
          <p className="font-medium">
            {a?.momo_number ?? "-"} {a?.momo_name ? `(${a.momo_name})` : ""}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Balance</p>
          <p className="font-medium">{cedis(Number(a?.balance ?? 0))}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Lifetime Commissions</p>
          <p className="font-medium">
            {cedis(Number(a?.lifetime_commissions ?? 0))}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Sales (webhook)</p>
          <p className="font-medium">
            {entry.sales} orders · {entry.quantity} vouchers
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Sales Amount</p>
          <p className="font-medium">{cedis(entry.amount)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Earned Commission</p>
          <p className="font-medium text-primary">{cedis(entry.commission)}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function AffiliateDashboard() {
  const [range, setRange] = useState<DateRange>(defaultDateRange);
  const { leaderboard, totals, isLoading, refetch } = useAffiliateAnalytics(range);
  const [selected, setSelected] = useState<string | null>(null);

  const selectedEntry = leaderboard.find((e) => e.sourceHook === selected);

  const stats = [
    {
      title: "Affiliate Sales",
      value: totals.affiliateSalesCount.toString(),
      icon: Users,
      hint: `${totals.affiliateQuantity} vouchers`,
    },
    {
      title: "Affiliate Revenue",
      value: cedis(totals.affiliateSalesAmount),
      icon: DollarSign,
      hint: "Successful transactions",
    },
    {
      title: "Total Commissions",
      value: cedis(totals.totalCommission),
      icon: Percent,
      hint: "Based on commission rates",
    },
    {
      title: "Active Affiliates",
      value: totals.activeAffiliates.toString(),
      icon: Trophy,
      hint: `${cedis(totals.pendingBalance)} unpaid balance`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <DateRangeFilter value={range} onChange={setRange} />
        <Button variant="outline" onClick={refetch} disabled={isLoading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {s.title}
              </CardTitle>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "…" : s.value}</div>
              <p className="text-xs text-muted-foreground">{s.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedEntry && <AffiliateBadgeCard entry={selectedEntry} />}

      <Card>
        <CardHeader>
          <CardTitle>Top Performing Affiliates</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Affiliate</TableHead>
                <TableHead>Hook</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Vouchers</TableHead>
                <TableHead>Sales Amount</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Commission</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : leaderboard.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No affiliate transactions found.
                  </TableCell>
                </TableRow>
              ) : (
                leaderboard.map((e, i) => (
                  <TableRow
                    key={e.sourceHook}
                    onClick={() =>
                      setSelected(selected === e.sourceHook ? null : e.sourceHook)
                    }
                    className={`cursor-pointer ${
                      selected === e.sourceHook ? "bg-muted" : ""
                    }`}
                  >
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{e.sourceHook}</Badge>
                    </TableCell>
                    <TableCell>{e.sales}</TableCell>
                    <TableCell>{e.quantity}</TableCell>
                    <TableCell>{cedis(e.amount)}</TableCell>
                    <TableCell>{e.commissionRate}%</TableCell>
                    <TableCell className="font-semibold">{cedis(e.commission)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
