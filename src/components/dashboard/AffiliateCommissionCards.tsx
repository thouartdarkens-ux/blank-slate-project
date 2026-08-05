import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Percent, Trophy, Users } from "lucide-react";
import { useAffiliateAnalytics } from "@/hooks/useAffiliateAnalytics";
import { DateRangeFilter, DateRange, defaultDateRange } from "@/components/DateRangeFilter";

const cedis = (n: number) =>
  `₵${Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export function AffiliateCommissionCards() {
  const [range, setRange] = useState<DateRange>(defaultDateRange);
  const { totals, leaderboard, isLoading } = useAffiliateAnalytics(range);
  const top = leaderboard.slice(0, 3);

  return (
    <div className="space-y-4">
      <DateRangeFilter value={range} onChange={setRange} />
      <div className="grid gap-4 md:grid-cols-3">
      <Card className="bg-gradient-to-br from-teal-50 to-cyan-100 dark:from-teal-900/20 dark:to-cyan-800/30">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Affiliate Commissions</CardTitle>
          <Percent className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {isLoading ? "…" : cedis(totals.totalCommission)}
          </div>
          <p className="text-xs text-muted-foreground">Across all affiliates</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-sky-50 to-blue-100 dark:from-sky-900/20 dark:to-blue-800/30">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Affiliate Sales</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {isLoading ? "…" : cedis(totals.affiliateSalesAmount)}
          </div>
          <p className="text-xs text-muted-foreground">
            {totals.affiliateSalesCount} orders · {totals.activeAffiliates} affiliates
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Top Affiliates</CardTitle>
          <Trophy className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-1">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : top.length === 0 ? (
            <p className="text-sm text-muted-foreground">No affiliate sales yet.</p>
          ) : (
            top.map((e, i) => (
              <Link
                key={e.sourceHook}
                to="/affiliates-control-panel"
                className="flex items-center justify-between rounded px-1 py-0.5 text-sm hover:bg-muted"
              >
                <span className="truncate">
                  {i + 1}. {e.name}
                </span>
                <Badge variant="secondary">{cedis(e.commission)}</Badge>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
