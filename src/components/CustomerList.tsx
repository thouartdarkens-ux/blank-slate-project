import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { UserCircle, Download } from "lucide-react";
import { downloadAsCSV } from "@/utils/csvExport";
import { useToast } from "@/components/ui/use-toast";
interface Customer {
  id: string;
  name: string;
  phone_number: string;
  email?: string;
  transaction_count: number;
  total_spent: number;
}
interface CustomerListProps {
  customers: Customer[];
  title?: string;
}
export function CustomerList({
  customers,
  title = "Customer Information"
}: CustomerListProps) {
  const {
    toast
  } = useToast();
  const handleDownload = () => {
    try {
      if (!customers || customers.length === 0) {
        toast({
          title: "No data to download",
          description: "There are no customer records to export.",
          variant: "destructive"
        });
        return;
      }
      const csvData = customers.map(customer => ({
        Name: customer.name || "Unknown",
        "Phone Number": customer.phone_number || "N/A",
        Email: customer.email || "-",
        "Total Transactions": customer.transaction_count || 0,
        "Total Spent": `₵${(customer.total_spent || 0).toFixed(2)}`
      }));
      downloadAsCSV(csvData, "customer-transactions");
      toast({
        title: "Download successful",
        description: "Customer data has been downloaded as CSV"
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download failed",
        description: "There was an error downloading the data",
        variant: "destructive"
      });
    }
  };
  return <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <Button variant="outline" onClick={handleDownload} className="gap-2" disabled={!customers || customers.length === 0}>
          <Download className="h-4 w-4" />
          <span>Download CSV</span>
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Transactions</TableHead>
              <TableHead>Total Spent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers && customers.length > 0 ? customers.map(customer => <TableRow key={customer.id}>
                  
                  <TableCell>{customer.phone_number || "N/A"}</TableCell>
                  <TableCell>{customer.email || "-"}</TableCell>
                  <TableCell>{customer.transaction_count || 0}</TableCell>
                  <TableCell>₵{(customer.total_spent || 0).toFixed(2)}</TableCell>
                </TableRow>) : <TableRow>
                <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                  No customer information available
                </TableCell>
              </TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>;
}