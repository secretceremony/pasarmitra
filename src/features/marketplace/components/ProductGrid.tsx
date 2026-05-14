import * as React from "react";
import { AnimatePresence } from "motion/react";
import { ChevronRight } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { ProductCard } from "./ProductCard";
import { Product } from "../types/product.types";

interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  onViewDistributor: (distributorId: string) => void;
}

export function ProductGrid({ products, onAddToCart, onViewDistributor }: ProductGridProps) {
  return (
    <div className="space-y-10">
      {/* Product List Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border/30">
         <div className="flex items-center gap-6">
            <h2 className="text-3xl font-black tracking-tighter">Marketplace Browse</h2>
            <div className="h-6 w-px bg-border" />
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
               {products.length} <span className="text-primary italic">Results Found</span>
            </p>
         </div>
         <div className="flex items-center gap-4">
            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Sort by:</span>
            <Button variant="ghost" className="text-xs font-black uppercase gap-2 hover:bg-primary/5 hover:text-primary">
               Relativity <ChevronRight size={14} />
            </Button>
         </div>
      </div>

      {/* Main Grid Floor */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        <AnimatePresence mode="popLayout">
          {products.map((prod) => (
            <ProductCard 
              key={prod.id} 
              product={prod} 
              onAddToCart={onAddToCart} 
              onViewDistributor={onViewDistributor} 
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
