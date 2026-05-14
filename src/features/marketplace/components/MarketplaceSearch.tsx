import * as React from "react";
import { Search, X } from "lucide-react";

interface MarketplaceSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function MarketplaceSearch({ value, onChange, placeholder }: MarketplaceSearchProps) {
  return (
    <div className="flex-1 relative group">
      <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
      <input 
        type="text" 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Search by product, SKU, or supplier..."} 
        className="w-full h-16 bg-card/60 backdrop-blur-xl border border-border/50 focus:border-primary/40 px-16 rounded-[2rem] text-sm font-bold shadow-xl transition-all outline-none"
      />
      {value && (
        <button 
          onClick={() => onChange('')}
          className="absolute right-6 top-1/2 -translate-y-1/2 p-2 hover:bg-muted rounded-xl transition-all"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
