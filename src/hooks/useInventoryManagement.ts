
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import * as XLSX from 'xlsx';

interface VoucherData {
  id: string;
  serial: string;
  pin: string;
  type: string;
  created_at?: string;
}

export function useInventoryManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [inventoryData, setInventoryData] = useState<VoucherData[]>([]);
  const [filterType, setFilterType] = useState("all");
  const [selectedVoucherType, setSelectedVoucherType] = useState<string>("WASSCE");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*');
      
      if (error) throw error;
      setInventoryData(data || []);
      console.log("Fetched inventory data:", data);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      toast({
        title: "Error fetching inventory",
        description: error instanceof Error ? error.message : "Failed to fetch inventory data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const csvData = XLSX.utils.sheet_to_json(worksheet);

        console.log("Parsed CSV data:", csvData);

        if (csvData.length === 0) {
          throw new Error("No data found in the uploaded file");
        }

        const voucherData = csvData.map((item: any) => ({
          serial: item.serial || item.Serial || item.SERIAL || item.serialCode || "",
          pin: item.pin || item.Pin || item.PIN || "",
          type: selectedVoucherType
        }));

        console.log("Transformed voucher data:", voucherData);

        const { error } = await supabase
          .from('inventory')
          .insert(voucherData);

        if (error) throw error;

        toast({
          title: "Success",
          description: `${voucherData.length} vouchers uploaded successfully`
        });

        fetchInventory();
      } catch (error) {
        console.error("Upload error:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to process file",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      toast({
        title: "Error",
        description: "Failed to read file",
        variant: "destructive"
      });
      setIsLoading(false);
    };

    reader.readAsBinaryString(file);
    event.target.value = '';
  };

  const downloadTemplate = () => {
    const sampleData = [
      {
        serial: "SN12345678",
        pin: "1234567890",
      }
    ];
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleData);
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "inventory_template.xlsx");
  };

  const clearInventory = async () => {
    if (confirm("Are you sure you want to clear all inventory data? This cannot be undone.")) {
      setIsLoading(true);
      try {
        const { error: deleteError } = await supabase
          .from('inventory')
          .delete()
          .neq('id', 'none');

        if (deleteError) throw deleteError;

        setInventoryData([]);
        toast({
          title: "Inventory cleared",
          description: "All inventory data has been removed successfully."
        });

        fetchInventory();
      } catch (error) {
        console.error("Error clearing inventory:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to clear inventory",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const filteredInventory = inventoryData.filter(item => {
    const matchesSearch = 
      item.serial.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.pin.includes(searchQuery) || 
      item.type.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterType === "all") return matchesSearch;
    if (filterType === "wassce") return matchesSearch && item.type === "WASSCE";
    if (filterType === "bece") return matchesSearch && item.type === "BECE";
    return matchesSearch;
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    selectedVoucherType,
    setSelectedVoucherType,
    isLoading,
    filteredInventory,
    handleFileUpload,
    downloadTemplate,
    clearInventory,
    fetchInventory
  };
}
