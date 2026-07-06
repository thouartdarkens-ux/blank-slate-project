
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchVoucherHistory } from '@/services/voucherHistoryService';
import { toast } from "sonner";
import { SearchCheck } from "lucide-react";

export const VoucherHistory = () => {
  const [reference, setReference] = useState('');
  const [historyData, setHistoryData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleFetchHistory = async () => {
    if (!reference.trim()) {
      toast.error("Please enter a reference number");
      return;
    }

    setLoading(true);
    try {
      console.log("Fetching history for reference:", reference.trim());
      const response = await fetchVoucherHistory(reference.trim());
      console.log("History response:", response);
      
      if (response.success && response.data) {
        setHistoryData(response.data);
        toast.success("Voucher history retrieved successfully");
      } else {
        toast.error(response.message || "Failed to retrieve voucher history");
        setHistoryData(null);
      }
    } catch (error) {
      console.error("Error in component when fetching voucher history:", error);
      toast.error("An error occurred while retrieving voucher history");
      setHistoryData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleFetchHistory();
    }
  };

  return (
    <div className="py-16 bg-white" id="voucher-history">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Check Voucher History</h2>
        
        <div className="max-w-md mx-auto mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SearchCheck className="h-6 w-6 text-green-600" />
                <span>Voucher History Lookup</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium text-gray-700">Reference Number</label>
                  <Input
                    placeholder="Enter reference number"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleFetchHistory}
                  disabled={loading}
                >
                  {loading ? "Loading..." : "Check History"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {historyData && historyData.vouchers && historyData.vouchers.length > 0 && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Voucher Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Serial Number</TableHead>
                        <TableHead>PIN</TableHead>
                        <TableHead>Voucher Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyData.vouchers.map((voucher: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{voucher.serial}</TableCell>
                          <TableCell>{voucher.pin}</TableCell>
                          <TableCell>{voucher.type}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoucherHistory;
