
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";

interface SalesData {
  name: string;
  total: number;
}

interface SalesOverviewChartProps {
  data: SalesData[];
}

export function SalesOverviewChart({ data }: SalesOverviewChartProps) {
  // Array of vibrant colors for the bars
  const barColors = ['#8B5CF6', '#D946EF', '#F97316', '#0EA5E9', '#10B981', '#EF4444', '#F59E0B'];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data} barSize={30}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip 
              formatter={(value) => [`₵${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Revenue']}
              labelStyle={{ color: '#374151' }}
            />
            <Legend />
            <Bar 
              dataKey="total" 
              name="Daily Revenue"
              radius={[4, 4, 0, 0]}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`}
                  fill={entry.total === 0 ? '#d1d5db' : barColors[index % barColors.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
