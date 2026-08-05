
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MainLayout } from "@/components/MainLayout";
import { Transaction, TransactionList } from "@/components/TransactionList";
import { CustomerList } from "@/components/CustomerList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Search, PlayCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { processPendingTransactions } from "@/utils/processPendingTransactions";
import { useAuth } from "@/context/AuthContext";
import { Table, TableHeader, TableRow, TableBody, TableCell, TableHead } from "@/components/ui/table";
import { Pencil } from "lucide-react";
import { CustomersTable } from "@/components/transactions/CustomersTable";
import { AnalyticsTab } from "@/components/transactions/AnalyticsTab";
import { PendingTransactionsTable } from "@/components/transactions/PendingTransactionsTable";

export default function TransactionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingEmailRow, setEditingEmailRow] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState<string>("");

  const [pendingTransactions, setPendingTransactions] = useState<any[]>([]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch transactions
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .select('*, customers(*)')
        .order('date', { ascending: false });
      
      if (transactionError) throw transactionError;
      
      console.log("Fetched transaction data:", transactionData);
      
      const formattedTransactions = (transactionData || []).map(t => ({
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
      
      console.log("Formatted transactions:", formattedTransactions);
      setTransactions(formattedTransactions);

      // Filter pending transactions with amount > 0
      const pending = (transactionData || []).filter(
        t => ['pending', 'awaiting_inventory'].includes(t.status) && Number(t.amount) > 0
      );
      setPendingTransactions(pending);
      
      // Aggregate customers by phone number, including email information
      const aggregatedCustomersMap = new Map<string, { 
        phone_number: string; 
        transaction_count: number; 
        total_spent: number;
        email?: string;
      }>();

      for (const transaction of transactionData || []) {
        const phone = transaction.phone_number;
        if (!phone) continue;
        
        const existing = aggregatedCustomersMap.get(phone);
        const amountNum = typeof transaction.amount === 'string' ? parseFloat(transaction.amount) : transaction.amount;
        
        if (!existing) {
          aggregatedCustomersMap.set(phone, {
            phone_number: phone,
            transaction_count: 1,
            total_spent: amountNum,
            email: transaction.email || undefined
          });
        } else {
          aggregatedCustomersMap.set(phone, {
            phone_number: phone,
            transaction_count: existing.transaction_count + 1,
            total_spent: existing.total_spent + amountNum,
            email: existing.email || transaction.email || undefined
          });
        }
      }

      const aggregatedCustomers = Array.from(aggregatedCustomersMap.values());
      setCustomers(aggregatedCustomers);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch = 
      transaction.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.amount.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (transaction.voucher?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      transaction.quantity.toString().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      statusFilter === "all" || transaction.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleProcessPending = async () => {
    setIsProcessing(true);
    try {
      const result = await processPendingTransactions();
      
      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        });
        await fetchData();
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process pending transactions",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const hasPendingTransactions = transactions.some(t => t.status === "awaiting_inventory");

  const handlePairEmail = async (phone_number: string, newEmail: string) => {
    if (!newEmail || !/^[\w\-.]+@[\w\-.]+\.\w+$/.test(newEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }
    try {
      const { error } = await supabase
        .from("transactions")
        .update({ email: newEmail })
        .eq("phone_number", phone_number);

      if (error) throw error;

      toast({
        title: "Success!",
        description: `Email "${newEmail}" paired to phone ${phone_number}`,
      });
      setEditingEmailRow(null);
      setEmailInput("");
      fetchData();
    } catch (err) {
      toast({
        title: "Error pairing email",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive"
      });
    }
  };

  return (
    <MainLayout title="Transactions">
      <div className="space-y-6 animate-fade-in">
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between space-y-2 md:space-y-0">
              <div>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>View and manage transactions and customer information.</CardDescription>
              </div>
              <div className="flex space-x-2">
                {hasPendingTransactions && (
                  <Button 
                    variant="secondary" 
                    onClick={handleProcessPending} 
                    disabled={isProcessing}
                    className="flex items-center gap-2"
                  >
                    <PlayCircle className="h-4 w-4" />
                    {isProcessing ? "Processing..." : "Process Pending Transactions"}
                  </Button>
                )}
                <Button variant="outline" onClick={fetchData} disabled={isProcessing}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="awaiting_inventory">Awaiting Stock</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="compromised">Security Alert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <PendingTransactionsTable transactions={pendingTransactions} onRefresh={fetchData} />

        <Tabs defaultValue="transactions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="customers">Customer Information</TabsTrigger>
            <TabsTrigger value="analytics">Income Analytics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="transactions">
            <TransactionList
              transactions={filteredTransactions}
              title={`${filteredTransactions.length} Transaction${filteredTransactions.length !== 1 ? "s" : ""} Found`}
            />
          </TabsContent>
          
          <TabsContent value="customers">
            <Card>
              <CardHeader>
                <CardTitle>
                  Customer Information
                </CardTitle>
                <CardDescription>
                  {customers.length} Unique Phone Number{customers.length !== 1 ? "s" : ""} Found
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CustomersTable
                  customers={customers}
                  user={user}
                  editingEmailRow={editingEmailRow}
                  emailInput={emailInput}
                  setEditingEmailRow={setEditingEmailRow}
                  setEmailInput={setEmailInput}
                  handlePairEmail={handlePairEmail}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsTab 
              onError={(message) => toast({
                title: "Error",
                description: message,
                variant: "destructive"
              })}
            />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
