import * as React from "react";
import { AnimatePresence } from "motion/react";
import { MarketplaceProductCard } from "./MarketplaceProductCard";
import { MarketplaceProduct } from "../types/product.types";

interface MarketplaceGridProps {
  products: MarketplaceProduct[];
  onAddToCart: (product: MarketplaceProduct) => void;
  onViewDistributor: (distributorId: string) => void;
}

export function MarketplaceGrid({ products, onAddToCart, onViewDistributor }: MarketplaceGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
      <AnimatePresence mode="popLayout">
        {products.map((prod) => (
          <MarketplaceProductCard 
            key={prod.id} 
            product={prod} 
            onAddToCart={onAddToCart} 
            onDistributorClick={onViewDistributor} 
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
