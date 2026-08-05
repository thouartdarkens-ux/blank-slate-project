
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface InventoryCategory {
  name: string;
  stock: number;
}

interface InventoryData {
  total: number;
  categories: InventoryCategory[];
}

interface InventorySummaryProps {
  data: InventoryData;
}

export function InventorySummary({ data }: InventorySummaryProps) {
  // Ensure categories is always an array, even if it's undefined in the data
  const categories = data.categories || [];
  const totalStock = data.total || 0;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-muted p-4 rounded-lg">
            <div className="text-sm font-medium text-muted-foreground mb-1">Total Vouchers</div>
            <div className="text-2xl font-bold">{totalStock}</div>
          </div>
          
          {categories.slice(0, 3).map((category, index) => (
            <div key={index} className="bg-muted p-4 rounded-lg">
              <div className="text-sm font-medium text-muted-foreground mb-1">{category.name}</div>
              <div className="text-2xl font-bold">{category.stock}</div>
            </div>
          ))}
          
          {/* If we have more than 3 categories, show "Others" */}
          {categories.length > 3 && (
            <div className="bg-muted p-4 rounded-lg">
              <div className="text-sm font-medium text-muted-foreground mb-1">Others</div>
              <div className="text-2xl font-bold">
                {categories.slice(3).reduce((acc, curr) => acc + curr.stock, 0)}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
