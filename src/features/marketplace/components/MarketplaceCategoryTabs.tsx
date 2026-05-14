import * as React from "react";
import { cn } from "../../../lib/utils";

interface MarketplaceCategoryTabsProps {
  categories: readonly string[];
  selectedCategory: string;
  onSelect: (category: string) => void;
}

export function MarketplaceCategoryTabs({ categories, selectedCategory, onSelect }: MarketplaceCategoryTabsProps) {
  return (
    <div className="bg-card/60 backdrop-blur-xl border border-border/50 p-2 rounded-[1.75rem] flex gap-1 shadow-lg overflow-x-auto custom-scrollbar">
      {categories.map(cat => (
        <button 
          key={cat}
          onClick={() => onSelect(cat)}
          className={cn(
            "px-6 h-12 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shrink-0",
            selectedCategory === cat ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-muted"
          )}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
