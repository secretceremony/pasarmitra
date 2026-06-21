import * as React from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { MARKETPLACE_UI_STRINGS, MARKETPLACE_SORT_OPTIONS } from "../config/marketplace-ui.config";

interface MarketplaceResultsHeaderProps {
  count: number;
}

export function MarketplaceResultsHeader({ count }: MarketplaceResultsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between pb-4 border-b border-border/30 w-full">
       <div className="flex items-center gap-3 sm:gap-6 flex-wrap">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tighter">{MARKETPLACE_UI_STRINGS.gridTitle}</h2>
          <div className="h-6 w-px bg-border hidden sm:block" />
          <p className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-widest">
             {count} <span className="text-primary italic">{MARKETPLACE_UI_STRINGS.resultsFound}</span>
          </p>
       </div>
       <div className="flex items-center gap-2 sm:gap-4 justify-between sm:justify-start">
          <span className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">{MARKETPLACE_UI_STRINGS.sortBy}</span>
          <Button variant="ghost" className="text-xs font-black uppercase gap-2 hover:bg-primary/5 hover:text-primary h-9 sm:h-10 px-3">
             {MARKETPLACE_SORT_OPTIONS[0].label} <ChevronRight size={14} />
          </Button>
       </div>
    </div>
  );
}
