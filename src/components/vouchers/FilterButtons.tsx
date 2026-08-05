
import { Filter, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FilterButtonsProps {
  filterType: string;
  onFilterChange: (type: string) => void;
}

export function FilterButtons({ filterType, onFilterChange }: FilterButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button 
        variant={filterType === "all" ? "default" : "outline"} 
        size="sm" 
        onClick={() => onFilterChange("all")}
      >
        <Filter className="mr-2 h-4 w-4" /> All Vouchers
      </Button>
      <Button 
        variant={filterType === "wassce" ? "default" : "outline"} 
        size="sm" 
        onClick={() => onFilterChange("wassce")}
      >
        <PackageCheck className="mr-2 h-4 w-4" /> WASSCE Vouchers
      </Button>
      <Button 
        variant={filterType === "bece" ? "default" : "outline"} 
        size="sm" 
        onClick={() => onFilterChange("bece")}
      >
        <PackageCheck className="mr-2 h-4 w-4" /> BECE Vouchers
      </Button>
    </div>
  );
}
