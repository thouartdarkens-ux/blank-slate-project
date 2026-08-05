
import { MainLayout } from "@/components/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/vouchers/SearchBar";
import { FilterButtons } from "@/components/vouchers/FilterButtons";
import { FileUploadSection } from "@/components/vouchers/FileUploadSection";
import { InventoryTable } from "@/components/vouchers/InventoryTable";
import { SoldVouchersDialog } from "@/components/vouchers/SoldVouchersDialog";
import { useInventoryManagement } from "@/hooks/useInventoryManagement";

export default function VouchersPage() {
  const {
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
  } = useInventoryManagement();

  return (
    <MainLayout title="Inventory">
      <div className="space-y-6 animate-fade-in">
        <Card 
          className="bg-gradient-to-br from-blue-50 to-indigo-100 
          dark:from-blue-900/20 dark:to-indigo-800/30"
        >
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between space-y-2 md:space-y-0">
              <div>
                <CardTitle>Manage Inventory</CardTitle>
                <CardDescription>Upload, view and manage your vouchers and pins.</CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button onClick={fetchInventory} variant="outline" size="sm">
                  <RefreshCw className="mr-2 h-4 w-4" /> Refresh Data
                </Button>
                <SoldVouchersDialog />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <SearchBar 
                  searchQuery={searchQuery} 
                  onSearchChange={setSearchQuery} 
                />
              </div>

              <FilterButtons 
                filterType={filterType} 
                onFilterChange={setFilterType} 
              />

              <Card 
                className="bg-gradient-to-br from-purple-50 to-violet-100 
                dark:from-purple-900/20 dark:to-violet-800/30"
              >
                <CardContent className="p-4">
                  <FileUploadSection 
                    selectedVoucherType={selectedVoucherType}
                    onVoucherTypeChange={setSelectedVoucherType}
                    onFileUpload={handleFileUpload}
                    onDownloadTemplate={downloadTemplate}
                    onClearInventory={clearInventory}
                    isLoading={isLoading}
                  />
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-br from-green-50 to-emerald-100 
          dark:from-green-900/20 dark:to-emerald-800/30"
        >
          <CardContent className="p-0">
            {isLoading && (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            )}
            <InventoryTable 
              inventory={filteredInventory}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
