import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarIcon, Download } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Transaction } from "@/components/TransactionList";
import { useProfitData } from "@/hooks/useProfitData";
import jsPDF from 'jspdf';

interface AnalyticsTabProps {
  onError: (message: string) => void;
}

export function AnalyticsTab({ onError }: AnalyticsTabProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filterType, setFilterType] = useState<"day" | "month" | "year">("day");
  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [totalProfit, setTotalProfit] = useState<number | null>(null);
  const [totalSalesQty, setTotalSalesQty] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { calculateProfit } = useProfitData();

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      let startDate: Date;
      let endDate: Date;

      // Calculate date range based on filter type
      if (filterType === "day") {
        startDate = new Date(selectedDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(selectedDate);
        endDate.setHours(23, 59, 59, 999);
      } else if (filterType === "month") {
        startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
      } else { // year
        startDate = new Date(selectedDate.getFullYear(), 0, 1);
        endDate = new Date(selectedDate.getFullYear(), 11, 31);
        endDate.setHours(23, 59, 59, 999);
      }

      // Fetch transactions for the date range
      const { data, error } = await supabase
        .from('transactions')
        .select('*, customers(*)')
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString())
        .eq('status', 'completed')
        .order('date', { ascending: false });

      if (error) throw error;

      // Calculate total income
      const income = (data || []).reduce((sum, transaction) => {
        const amount = typeof transaction.amount === 'string' ? parseFloat(transaction.amount) : transaction.amount;
        return sum + amount;
      }, 0);

      const salesQty = (data || []).reduce((sum, t) => sum + (t.quantity || 1), 0);

      // Calculate profit
      const profitTransactions = (data || []).map((t: any) => ({
        product: t.product,
        quantity: t.quantity || 1,
        amount: typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount,
        reference: t.reference,
      }));
      const profit = calculateProfit(profitTransactions);

      setTotalIncome(income);
      setTotalProfit(profit);
      setTotalSalesQty(salesQty);

      // Format transactions for display
      const formattedTransactions = (data || []).map(t => ({
        id: t.id,
        customer: t.customers?.name || t.reference || 'Unknown',
        amount: t.amount.toString(),
        status: t.status as "completed" | "pending" | "failed" | "awaiting_inventory" | "compromised",
        voucher: t.product,
        date: new Date(t.date).toLocaleString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        customerId: t.customer_id,
        quantity: t.quantity || 1
      }));

      setTransactions(formattedTransactions);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      onError("Failed to load analytics data");
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, filterType, calculateProfit, onError]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const getDateRangeText = () => {
    if (filterType === "day") {
      return format(selectedDate, "MMMM d, yyyy");
    } else if (filterType === "month") {
      return format(selectedDate, "MMMM yyyy");
    } else {
      return format(selectedDate, "yyyy");
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('Income Analytics Report', 20, 20);
    
    // Add period info
    doc.setFontSize(14);
    doc.text(`Period: ${getDateRangeText()}`, 20, 40);
    doc.text(`Total Income: GHS ${totalIncome.toFixed(2)}`, 20, 55);
    doc.text(`Total Transactions: ${transactions.length}`, 20, 70);
    
    // Add transactions table header
    doc.setFontSize(12);
    doc.text('Transactions:', 20, 90);
    
    // Define column positions and widths
    const colPositions = {
      customer: 20,
      voucher: 70,
      amount: 120,
      date: 150
    };
    
    let yPosition = 105;
    
    // Table headers with proper alignment
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Customer', colPositions.customer, yPosition);
    doc.text('Voucher', colPositions.voucher, yPosition);
    doc.text('Amount', colPositions.amount, yPosition);
    doc.text('Date', colPositions.date, yPosition);
    yPosition += 5;
    
    // Add a line under headers
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 10;
    
    // Reset font to normal for data rows
    doc.setFont('helvetica', 'normal');
    
    // Add transaction rows with proper column alignment
    transactions.forEach((transaction, index) => {
      if (yPosition > 270) { // Check if we need a new page
        doc.addPage();
        yPosition = 20;
        
        // Re-add headers on new page
        doc.setFont('helvetica', 'bold');
        doc.text('Customer', colPositions.customer, yPosition);
        doc.text('Voucher', colPositions.voucher, yPosition);
        doc.text('Amount', colPositions.amount, yPosition);
        doc.text('Date', colPositions.date, yPosition);
        yPosition += 5;
        doc.line(20, yPosition, 190, yPosition);
        yPosition += 10;
        doc.setFont('helvetica', 'normal');
      }
      
      // Add data with proper column alignment
      doc.text(transaction.customer.slice(0, 18), colPositions.customer, yPosition);
      doc.text((transaction.voucher || 'N/A').slice(0, 18), colPositions.voucher, yPosition);
      doc.text(parseFloat(transaction.amount).toFixed(2), colPositions.amount, yPosition);
      doc.text(transaction.date, colPositions.date, yPosition);
      yPosition += 12;
    });
    
    // Generate filename with current date and time
    const now = new Date();
    const filename = `analytics-report-${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}.pdf`;
    
    doc.save(filename);
  };

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Analytics Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Filter Type</label>
              <Select value={filterType} onValueChange={(value: "day" | "month" | "year") => setFilterType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="year">Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Select Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? getDateRangeText() : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Actions</label>
              <Button onClick={fetchAnalytics} disabled={isLoading} className="w-full">
                {isLoading ? "Loading..." : "Refresh Data"}
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Export</label>
              <Button 
                onClick={downloadPDF} 
                disabled={isLoading || transactions.length === 0} 
                variant="outline"
                className="w-full"
              >
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Income Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Income Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Period</p>
              <p className="text-2xl font-bold">{getDateRangeText()}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Sales</p>
              <p className="text-2xl font-bold">{totalSalesQty} vouchers</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-3xl font-bold text-blue-600">₵{totalIncome.toFixed(2)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Profit</p>
              <p className="text-3xl font-bold text-green-600">
                ₵{(totalProfit !== null ? totalProfit : totalIncome).toFixed(2)}
              </p>
              {totalProfit === null && (
                <p className="text-xs text-muted-foreground">Set cost prices in Voucher Types page</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Transactions ({transactions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] w-full">
            <div className="space-y-2">
              {transactions.length > 0 ? (
                transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{transaction.customer}</span>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground">{transaction.voucher}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {transaction.date} • Qty: {transaction.quantity}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">
                        ₵{parseFloat(transaction.amount).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions found for the selected period
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
