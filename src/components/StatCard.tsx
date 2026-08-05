
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  children?: ReactNode;
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  children,
  className
}: StatCardProps) {
  return (
    <Card className={cn("transition-all duration-200 hover:scale-[1.02]", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <div className="mt-2 flex items-center text-xs">
            <span className={cn(
              "mr-1",
              trend.positive ? "text-green-500" : "text-red-500"
            )}>
              {trend.positive ? "+" : "-"}{trend.value}%
            </span>
            <span className="text-muted-foreground">{trend.label}</span>
          </div>
        )}
        {children}
      </CardContent>
    </Card>
  );
}
