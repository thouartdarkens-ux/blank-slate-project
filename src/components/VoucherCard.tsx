
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export interface VoucherProps {
  id: string;
  code: string;
  discount: string;
  used: number;
  limit: number;
  status: "active" | "expired" | "used";
  expiryDate: string;
}

export function VoucherCard({ voucher }: { voucher: VoucherProps }) {
  const percentage = (voucher.used / voucher.limit) * 100;
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">{voucher.code}</CardTitle>
          <Badge variant={
            voucher.status === "active" ? "default" :
            voucher.status === "expired" ? "destructive" : "secondary"
          }>
            {voucher.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold mb-2">{voucher.discount}</div>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Usage: {voucher.used} / {voucher.limit}
          </div>
          <Progress value={percentage} className="h-2" />
        </div>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Expires: {voucher.expiryDate}
      </CardFooter>
    </Card>
  );
}
