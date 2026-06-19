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
    <div className="flex flex-col md:flex-row gap-6">
      <MarketplaceSearch value={search} onChange={onSearchChange} />
      
      <div className="flex gap-2 sm:gap-4 flex-1 min-w-0 items-center">
        <div className="flex-1 min-w-0">
          <MarketplaceCategoryTabs 
            categories={categories} 
            selectedCategory={selectedCategory} 
            onSelect={onCategorySelect} 
          />
        </div>
        
        <Button 
           variant="outline" 
           className={cn("h-12 w-12 sm:h-16 sm:w-16 rounded-2xl sm:rounded-[1.75rem] border-border bg-card/60 backdrop-blur-xl shrink-0 flex items-center justify-center p-0", showFilters && "border-primary text-primary")}
           onClick={onToggleFilters}
        >
           <Filter className="w-5 h-5 sm:w-6 sm:h-6" />
        </Button>
      </div>
    </div>
  );
}
