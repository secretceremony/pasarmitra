import * as React from "react";
import { AnimatePresence } from "motion/react";
import { MarketplaceProductCard } from "./MarketplaceProductCard";
import { MarketplaceProduct } from "../types/product.types";

interface MarketplaceGridProps {
  products: MarketplaceProduct[];
  onAddToCart: (product: MarketplaceProduct) => void;
  onViewDistributor: (distributorId: string) => void;
  onNegotiate?: (product: MarketplaceProduct) => void;
  onViewDetails?: (product: MarketplaceProduct) => void;
}

export function MarketplaceGrid({ products, onAddToCart, onViewDistributor, onNegotiate, onViewDetails }: MarketplaceGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      <AnimatePresence mode="popLayout">
        {products.map((prod) => (
          <MarketplaceProductCard 
            key={prod.id} 
            product={prod} 
            onAddToCart={onAddToCart} 
            onDistributorClick={onViewDistributor} 
            onNegotiate={onNegotiate}
            onViewDetails={onViewDetails}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
