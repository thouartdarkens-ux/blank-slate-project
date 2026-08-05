
import { Upload, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
interface FileUploadSectionProps {
  selectedVoucherType: string;
  onVoucherTypeChange: (value: string) => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadTemplate: () => void;
  onClearInventory: () => void;
  isLoading: boolean;
}
export function FileUploadSection({
  selectedVoucherType,
  onVoucherTypeChange,
  onFileUpload,
  onDownloadTemplate,
  onClearInventory,
  isLoading
}: FileUploadSectionProps) {
  return <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex-1">
        <h3 className="text-sm font-medium mb-1">Import Inventory Data</h3>
        <p className="text-xs text-muted-foreground">Upload CSV or Excel files with serial codes and pins.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={selectedVoucherType} onValueChange={onVoucherTypeChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="WASSCE">WASSCE</SelectItem>
            <SelectItem value="BECE">BECE</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative">
          <Input type="file" id="inventory-file" className="hidden" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={onFileUpload} disabled={isLoading} />
          <Button variant="outline" size="sm" onClick={() => document.getElementById('inventory-file')?.click()} disabled={isLoading}>
            <Upload className="mr-2 h-4 w-4" /> 
            {isLoading ? 'Uploading...' : 'Upload File'}
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={onDownloadTemplate} disabled={isLoading}>
          <Download className="mr-2 h-4 w-4" /> Template
        </Button>
        <Button variant="outline" size="sm" onClick={onClearInventory} disabled={isLoading}>
          <Trash2 className="mr-2 h-4 w-4" /> Clear Inventory
        </Button>
      </div>
    </div>;
}
