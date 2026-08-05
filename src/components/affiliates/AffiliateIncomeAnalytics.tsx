import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAffiliateAnalytics } from "@/hooks/useAffiliateAnalytics";

const cedis = (n: number) =>
  `₵${Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

export function AffiliateIncomeAnalytics() {
  const { daily, totals, isLoading } = useAffiliateAnalytics();

  const chartData = [...daily]
    .slice(0, 14)
    .reverse()
    .map((d) => ({
      name: dayLabel(d.date),
      revenue: Number(d.revenue.toFixed(2)),
      commission: Number(d.commission.toFixed(2)),
      net: Number((d.revenue - d.commission).toFixed(2)),
    }));

  const netIncome = totals.affiliateSalesAmount - totals.totalCommission;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gross Affiliate Revenue
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {isLoading ? "…" : cedis(totals.affiliateSalesAmount)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Commissions Payable
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {isLoading ? "…" : cedis(totals.totalCommission)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net After Commissions
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-primary">
            {isLoading ? "…" : cedis(netIncome)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Revenue vs Commission (last 14 days)</CardTitle>
        </CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(v: number) => cedis(Number(v))} />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="commission" name="Commission" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Sales</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : daily.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No affiliate income yet.
                  </TableCell>
                </TableRow>
              ) : (
                daily.map((d) => (
                  <TableRow key={d.date}>
                    <TableCell className="whitespace-nowrap">{dayLabel(d.date)}</TableCell>
                    <TableCell>{d.sales}</TableCell>
                    <TableCell>{cedis(d.revenue)}</TableCell>
                    <TableCell>{cedis(d.commission)}</TableCell>
                    <TableCell className="font-medium">
                      {cedis(d.revenue - d.commission)}
                    </TableCell>
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
