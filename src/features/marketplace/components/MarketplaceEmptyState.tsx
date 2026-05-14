import * as React from "react";
import { ShoppingBasket } from "lucide-react";
import { Button } from "../../../components/ui/button";

interface MarketplaceEmptyStateProps {
  onReset: () => void;
}

export function MarketplaceEmptyState({ onReset }: MarketplaceEmptyStateProps) {
  return (
    <div className="py-40 flex flex-col items-center justify-center text-center space-y-6 bg-card border border-dashed rounded-[4rem]">
       <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
          <ShoppingBasket size={40} />
       </div>
       <div className="space-y-2">
          <h3 className="text-2xl font-black">No products found</h3>
          <p className="text-muted-foreground font-medium">Try adjusting your filters or search keywords.</p>
       </div>
       <Button 
        variant="outline" 
        onClick={onReset} 
        className="h-12 rounded-2xl border-primary text-primary font-black uppercase px-8"
      >
        Reset All Filters
      </Button>
    </div>
  );
}
