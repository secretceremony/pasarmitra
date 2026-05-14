import * as React from "react";
import { Filter } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { MarketplaceSearch } from "./MarketplaceSearch";
import { MarketplaceCategoryTabs } from "./MarketplaceCategoryTabs";
import { cn } from "../../../lib/utils";

interface MarketplaceToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  categories: readonly string[];
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
}

export function MarketplaceToolbar({
  search,
  onSearchChange,
  categories,
  selectedCategory,
  onCategorySelect,
  showFilters,
  onToggleFilters
}: MarketplaceToolbarProps) {
  return (
    <div className="flex flex-col md:flex-row gap-6 sticky top-28 z-30 py-2">
      <MarketplaceSearch value={search} onChange={onSearchChange} />
      
      <div className="flex gap-4">
        <MarketplaceCategoryTabs 
          categories={categories} 
          selectedCategory={selectedCategory} 
          onSelect={onCategorySelect} 
        />
        
        <Button 
           variant="outline" 
           className={cn("h-16 w-16 rounded-[1.75rem] border-border bg-card/60 backdrop-blur-xl", showFilters && "border-primary text-primary")}
           onClick={onToggleFilters}
        >
           <Filter size={24} />
        </Button>
      </div>
    </div>
  );
}
