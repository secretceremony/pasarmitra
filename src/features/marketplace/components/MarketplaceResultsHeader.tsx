import * as React from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { MARKETPLACE_UI_STRINGS, MARKETPLACE_SORT_OPTIONS } from "../config/marketplace-ui.config";

interface MarketplaceResultsHeaderProps {
  count: number;
  sortBy: string;
  onSortChange: (val: string) => void;
}

export function MarketplaceResultsHeader({ count, sortBy, onSortChange }: MarketplaceResultsHeaderProps) {
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
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="text-xs font-black uppercase bg-card border border-border/60 rounded-xl px-3 py-1.5 h-9 sm:h-10 focus:outline-none focus:border-primary cursor-pointer hover:bg-primary/5 hover:text-primary transition-colors text-foreground"
          >
            {MARKETPLACE_SORT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id} className="font-sans normal-case text-foreground bg-card">
                {opt.label}
              </option>
            ))}
          </select>
       </div>
    </div>
  );
}
