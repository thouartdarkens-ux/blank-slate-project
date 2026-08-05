import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { PackageOpen, Download, Search, Filter, Calendar } from "lucide-react";
import { downloadAsCSV } from "@/utils/csvExport";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
interface VoucherHistory {
  id?: string;
  serial: string;
  pin: string;
  type: string;
  reference?: string;
  amount?: number;
  status?: string;
  quantity?: number;
  phone_number?: string;
  sold_at?: string;
}
interface SoldVoucher {
  id: string;
  serial: string;
  pin: string;
  type: string;
  reference: string;
  sold_at: string;
  amount: number;
  status: string;
  quantity: number;
  phone_number: string;
}
export function SoldVouchersDialog() {
  const [soldVouchers, setSoldVouchers] = useState<SoldVoucher[]>([]);
  const [voucherHistory, setVoucherHistory] = useState<VoucherHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showVoucherHistory, setShowVoucherHistory] = useState(false);
  const [searchReference, setSearchReference] = useState("");
  const [searchFilter, setSearchFilter] = useState(""); // For filtering vouchers
  const [voucherTypeFilter, setVoucherTypeFilter] = useState("all"); // Filter for voucher types
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const {
    toast
  } = useToast();
  const fetchSoldVouchers = async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('sold_vouchers_with_transactions').select('*');

      // Apply date filters if they exist
      if (startDate) {
        query = query.gte('sold_at', startDate);
      }
      if (endDate) {
        // Add a day to include the entire end date
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        query = query.lt('sold_at', nextDay.toISOString().split('T')[0]);
      }
      query = query.order('sold_at', {
        ascending: false
      });
      const {
        data,
        error
      } = await query;
      if (error) throw error;
      setSoldVouchers(data || []);
      setShowVoucherHistory(false);
    } catch (error) {
      console.error("Error fetching sold vouchers:", error);
      toast({
        title: "Error",
        description: "Could not fetch sold vouchers.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const fetchVoucherHistory = async (reference: string) => {
    if (!reference.trim()) {
      toast({
        title: "Reference Required",
        description: "Please enter a reference number to search",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    try {
      // Directly query the sold_vouchers table using Supabase
      const {
        data,
        error
      } = await supabase.from('sold_vouchers').select('*').ilike('reference', `%${reference}%`);
      if (error) throw error;
      if (!data || data.length === 0) {
        toast({
          title: "No Results Found",
          description: "No voucher history was found for the provided reference.",
          variant: "destructive"
        });
        setVoucherHistory([]);
        setShowVoucherHistory(true);
        return;
      }

      // Process the vouchers data
      const processedVouchers = data.map((voucher: VoucherHistory, index: number) => ({
        ...voucher,
        id: `history-${index}-${voucher.serial}`
      }));
      setVoucherHistory(processedVouchers);
      setShowVoucherHistory(true);
      toast({
        title: "Voucher History Fetched",
        description: `Retrieved ${data.length} vouchers from history.`,
        variant: "default"
      });

      // Check if a phone number exists and send SMS notification
      const phoneNumbers = [...new Set(data.map(v => v.phone_number).filter(Boolean))];
      if (phoneNumbers.length > 0) {
        toast({
          title: "Information",
          description: "Voucher information is available for the customer."
        });
      }
    } catch (error) {
      console.error("Error fetching voucher history:", error);
      toast({
        title: "Error",
        description: "Could not fetch voucher history. " + (error instanceof Error ? error.message : "Unknown error"),
        variant: "destructive"
      });
      setVoucherHistory([]);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    if (isOpen) {
      fetchSoldVouchers();
    }
  }, [isOpen]);
  useEffect(() => {
    if (isOpen && (startDate || endDate)) {
      fetchSoldVouchers();
    }
  }, [startDate, endDate]);
  const formatTime = (dateString: string | undefined) => {
    if (!dateString) return "Unknown date";
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true
      });
    } catch (e) {
      return "Invalid date";
    }
  };
  const formatPin = (pin: string) => {
    if (!pin) return "";
    if (pin.length <= 4) return "****";
    return pin.substring(0, 2) + "*".repeat(pin.length - 4) + pin.substring(pin.length - 2);
  };
  const handleDownload = () => {
    try {
      if (soldVouchers.length === 0) {
        toast({
          title: "No data to download",
          description: "There are no sold vouchers to export.",
          variant: "destructive"
        });
        return;
      }

      // Get filtered vouchers
      const downloadData = getFilteredVouchers();
      const csvData = downloadData.map(voucher => ({
        Type: voucher.type,
        Serial: voucher.serial,
        PIN: voucher.pin,
        Reference: voucher.reference || 'N/A',
        Amount: voucher.amount || 'N/A',
        Status: voucher.status || 'N/A',
        Quantity: voucher.quantity || 1,
        Phone: voucher.phone_number || 'N/A',
        "Sold Date": new Date(voucher.sold_at).toLocaleString()
      }));

      // Include date range in the filename if applicable
      let filename = "sold-vouchers";
      if (startDate && endDate) {
        filename = `sold-vouchers-${startDate}-to-${endDate}`;
      } else if (startDate) {
        filename = `sold-vouchers-from-${startDate}`;
      } else if (endDate) {
        filename = `sold-vouchers-to-${endDate}`;
      }
      downloadAsCSV(csvData, filename);
      toast({
        title: "Download successful",
        description: "Sold vouchers have been downloaded as CSV"
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
  const handleSearchReference = () => {
    if (!searchReference.trim()) {
      toast({
        title: "Reference Required",
        description: "Please enter a reference number to search",
        variant: "destructive"
      });
      return;
    }
    fetchVoucherHistory(searchReference);
  };

  // Filter function for sold vouchers
  const getFilteredVouchers = () => {
    if (!soldVouchers) return [];
    let filtered = soldVouchers;

    // First filter by voucher type
    if (voucherTypeFilter !== "all") {
      filtered = filtered.filter(voucher => voucher.type?.toLowerCase() === voucherTypeFilter.toLowerCase());
    }

    // Then filter by search text if provided
    if (searchFilter) {
      filtered = filtered.filter(voucher => voucher.serial?.toLowerCase().includes(searchFilter.toLowerCase()) || voucher.reference?.toLowerCase().includes(searchFilter.toLowerCase()) || voucher.type?.toLowerCase().includes(searchFilter.toLowerCase()) || voucher.phone_number?.toLowerCase().includes(searchFilter.toLowerCase()));
    }
    return filtered;
  };

  // Filter function for voucher history
  const getFilteredHistory = () => {
    if (!voucherHistory) return [];
    let filtered = voucherHistory;

    // First filter by voucher type
    if (voucherTypeFilter !== "all") {
      filtered = filtered.filter(voucher => voucher.type?.toLowerCase() === voucherTypeFilter.toLowerCase());
    }

    // Then filter by search text if provided
    if (searchFilter) {
      filtered = filtered.filter(voucher => voucher.serial?.toLowerCase().includes(searchFilter.toLowerCase()) || voucher.reference?.toLowerCase().includes(searchFilter.toLowerCase()) || voucher.type?.toLowerCase().includes(searchFilter.toLowerCase()) || voucher.phone_number?.toLowerCase().includes(searchFilter.toLowerCase()));
    }
    return filtered;
  };
  const clearDateFilters = () => {
    setStartDate("");
    setEndDate("");
    fetchSoldVouchers();
  };

  // Get the filtered data depending on which view is active
  const filteredVouchers = showVoucherHistory ? getFilteredHistory() : getFilteredVouchers();
  return <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <PackageOpen className="h-4 w-4" />
          <span>View Sold Vouchers</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Sold Vouchers History</DialogTitle>
          <div className="flex space-x-2">
            {!showVoucherHistory && <>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2 mx-0">
                      <Calendar className="h-4 w-4" />
                      <span>Date Range</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-4">
                    <div className="space-y-4">
                      <div>
                        <Label>Start Date</Label>
                        <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                      </div>
                      <div>
                        <Label>End Date</Label>
                        <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                      </div>
                      <div className="flex justify-between">
                        <Button variant="outline" onClick={clearDateFilters}>Clear</Button>
                        <Button onClick={() => fetchSoldVouchers()}>Apply</Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <Button variant="outline" onClick={handleDownload} disabled={isLoading || soldVouchers.length === 0} className="gap-2 mx-[50px]">
                  <Download className="h-4 w-4" />
                  <span>Download CSV</span>
                </Button>
              </>}
          </div>
        </DialogHeader>
        
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col md:flex-row gap-2 md:space-x-2">
            <div className="flex flex-1 items-center space-x-2 my-0 mx-[30px]">
              <Input placeholder="Enter reference number..." value={searchReference} onChange={e => setSearchReference(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearchReference()} className="mx-0" />
              <Button variant="secondary" onClick={handleSearchReference} className="gap-2 whitespace-nowrap" disabled={isLoading || !searchReference.trim()}>
                <Search className="h-4 w-4" />
                Search Ref
              </Button>
            </div>
          </div>
          
          {/* Add voucher type filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Filter by type:</span>
            <Select value={voucherTypeFilter} onValueChange={setVoucherTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vouchers</SelectItem>
                <SelectItem value="wassce">WASSCE</SelectItem>
                <SelectItem value="bece">BECE</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Filter by date range info text */}
            {(startDate || endDate) && <span className="text-sm text-muted-foreground">
                Filtered by date: {startDate ? startDate : "Any"} to {endDate ? endDate : "Now"}
                <Button variant="ghost" size="sm" onClick={clearDateFilters} className="h-5 w-5 ml-1">×</Button>
              </span>}
          </div>
          
          {isLoading ? <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div> : <div className="max-h-[60vh] overflow-auto">
              {showVoucherHistory ? filteredVouchers.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                    {searchFilter || voucherTypeFilter !== "all" ? "No matching vouchers found" : "No voucher history found for this reference"}
                  </div> : <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Serial</TableHead>
                        <TableHead>PIN</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Phone</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVouchers.map(voucher => <TableRow key={voucher.id || `${voucher.serial}-${Math.random().toString(36).substr(2, 9)}`}>
                          <TableCell>{voucher.type}</TableCell>
                          <TableCell>{voucher.serial}</TableCell>
                          <TableCell>{formatPin(voucher.pin)}</TableCell>
                          <TableCell>{voucher.reference || 'N/A'}</TableCell>
                          <TableCell>{voucher.phone_number || 'N/A'}</TableCell>
                        </TableRow>)}
                    </TableBody>
                  </Table> : filteredVouchers.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                    {searchFilter || voucherTypeFilter !== "all" ? "No matching vouchers found" : "No sold vouchers found"}
                  </div> : <Table>
                    <TableHeader>
                      <TableRow>
                        
                        <TableHead>Serial</TableHead>
                        <TableHead>PIN</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Sold</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVouchers.map(voucher => <TableRow key={voucher.id || `${voucher.serial}-${Math.random().toString(36).substr(2, 9)}`}>
                          
                          <TableCell>{voucher.serial}</TableCell>
                          <TableCell>{formatPin(voucher.pin)}</TableCell>
                          <TableCell>{voucher.reference || 'N/A'}</TableCell>
                          <TableCell>{voucher.phone_number}</TableCell>
                          <TableCell>{formatTime(voucher.sold_at)}</TableCell>
                        </TableRow>)}
                    </TableBody>
                  </Table>}
            </div>}
        </div>
      </DialogContent>
    </Dialog>;
}

// Define the Label component since it was used but not imported
function Label({
  children,
  htmlFor
}: {
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return <label htmlFor={htmlFor} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
      {children}
    </label>;
}