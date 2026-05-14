import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Surface } from "../ui/Surface";
import { PriceDisplay } from "./PriceDisplay";
import { InventoryIndicator } from "./InventoryIndicator";
import { SupplierIdentity } from "./SupplierIdentity";
import { ProductSummary } from "../../core/types/commerce";
import { motion } from "motion/react";
import { HOVER_SCALE } from "../../core/animations";

interface ProductCardProps {
  product: ProductSummary;
  onQuickAdd?: (product: ProductSummary) => void;
  className?: string;
}

export function ProductCard({
  product,
  onQuickAdd,
  className,
}: ProductCardProps) {
  return (
    <Surface
      intent="card"
      hover="scale"
      padding="none"
      className={className}
    >
      <div className="relative h-64 overflow-hidden group/img">
        <img
          src={product.image}
          className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110"
          alt={product.name}
        />
        {product.discountTag && (
          <div className="absolute top-6 left-6">
            <span className="px-4 py-1.5 bg-rose-500 text-white font-black text-xs rounded-full shadow-2xl tracking-widest">
              {product.discountTag}
            </span>
          </div>
        )}
        <button
          onClick={() => onQuickAdd?.(product)}
          className="absolute bottom-6 right-6 w-14 h-14 bg-white/10 backdrop-blur-2xl rounded-2xl flex items-center justify-center text-white hover:bg-primary hover:text-black transition-all group-hover/img:scale-110 shadow-2xl"
        >
          <Plus size={28} />
        </button>
      </div>

      <div className="p-8 flex-1 flex flex-col space-y-4">
        <SupplierIdentity supplier={product.supplier} />
        
        <h4 className="text-xl font-black leading-tight group-hover:text-primary transition-colors line-clamp-2">
          {product.name}
        </h4>

        <div className="flex items-center justify-between pt-4">
          <PriceDisplay price={product.price} size="lg" />
          <InventoryIndicator inventory={product.inventory} />
        </div>

        <Button
          onClick={() => onQuickAdd?.(product)}
          className="w-full h-12 bg-secondary hover:bg-primary hover:text-primary-foreground font-black rounded-2xl transition-all opacity-0 group-hover:opacity-100 mt-4 shadow-xl"
        >
          Quick Add
        </Button>
      </div>
    </Surface>
  );
}
