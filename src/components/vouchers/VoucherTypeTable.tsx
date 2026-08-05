
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, PackageOpen, Bell } from "lucide-react";
import { ThresholdSettings } from "./ThresholdSettings";
import { DownloadVouchersDialog } from "./DownloadVouchersDialog";
import { EditVoucherTypeDialog } from "./EditVoucherTypeDialog";

interface VoucherType {
  id: string;
  name: string;
  price: number;
  bulk_price: number | null;
  description: string | null;
  stock: number | null;
  low_stock_threshold: number;
}

interface VoucherTypeTableProps {
  voucherTypes: VoucherType[];
  isLoading: boolean;
  onDelete: (id: string) => Promise<void>;
  onRefresh: () => void;
  searchQuery: string;
}

export function VoucherTypeTable({ voucherTypes, isLoading, onDelete, onRefresh, searchQuery }: VoucherTypeTableProps) {
  const filteredVoucherTypes = voucherTypes.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (item.description?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>Bulk Price (20+ vouchers)</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>In Stock</TableHead>
          <TableHead>Alert Threshold</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-4">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
              </div>
            </TableCell>
          </TableRow>
        ) : filteredVoucherTypes.length > 0 ? (
          filteredVoucherTypes.map(item => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell>₵{item.price.toFixed(2)}</TableCell>
              <TableCell>{item.bulk_price ? `₵${item.bulk_price.toFixed(2)}` : "-"}</TableCell>
              <TableCell className="max-w-xs truncate">{item.description || "-"}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <PackageOpen className="h-4 w-4 text-muted-foreground" />
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    (item.stock || 0) > (item.low_stock_threshold || 10) ? "bg-green-100 text-green-800" : 
                    (item.stock || 0) > Math.floor((item.low_stock_threshold || 10) / 2) ? "bg-yellow-100 text-yellow-800" : 
                    "bg-red-100 text-red-800"
                  }`}>
                    {item.stock || 0} available
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <ThresholdSettings 
                  voucherType={item} 
                  onUpdate={onRefresh}
                />
              </TableCell>
              <TableCell className="text-right space-x-2 flex items-center justify-end">
                <EditVoucherTypeDialog 
                  voucherType={item} 
                  onSuccess={onRefresh}
                />
                <DownloadVouchersDialog voucherType={item} />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onDelete(item.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
              No voucher types found. Add a new voucher type to get started.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
