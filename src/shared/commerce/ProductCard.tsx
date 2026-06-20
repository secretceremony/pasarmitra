import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Surface } from "../ui/Surface";
import { PriceDisplay } from "./PriceDisplay";
import { InventoryIndicator } from "./InventoryIndicator";
import { SupplierIdentity } from "./SupplierIdentity";
import { ProductSummary } from "../../core/types/commerce";
import { cn } from "../../lib/utils";
import { motion } from "motion/react";
import { HOVER_SCALE } from "../../core/animations";

interface ProductCardProps {
  product: ProductSummary;
  onQuickAdd?: (product: ProductSummary) => void;
  onViewDetails?: (product: ProductSummary) => void;
  className?: string;
}

export function ProductCard({
  product,
  onQuickAdd,
  onViewDetails,
  className,
}: ProductCardProps) {
  return (
    <Surface
      intent="card"
      hover="scale"
      padding="none"
      className={cn("flex flex-col h-full", className)}
    >
      <div className="relative aspect-square overflow-hidden group/img bg-muted">
        <img
          src={product.image}
          className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110 cursor-pointer"
          alt={product.name}
          onClick={() => onViewDetails?.(product)}
        />
        {product.discountTag && (
          <div className="absolute top-4 left-4">
            <span className="px-3 py-1 bg-rose-500 text-white font-black text-[10px] rounded-full shadow-2xl tracking-widest">
              {product.discountTag}
            </span>
          </div>
        )}
        <button
          onClick={() => onQuickAdd?.(product)}
          className="absolute bottom-4 right-4 w-12 h-12 bg-white/10 backdrop-blur-2xl rounded-xl flex items-center justify-center text-white hover:bg-primary hover:text-black transition-all group-hover/img:scale-110 shadow-2xl cursor-pointer"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-2">
          <SupplierIdentity supplier={product.supplier} />
          
          <h4 
            onClick={() => onViewDetails?.(product)}
            className="text-base sm:text-lg font-black leading-tight group-hover:text-primary transition-colors line-clamp-2 cursor-pointer"
          >
            {product.name}
          </h4>
        </div>

        <div className="mt-auto pt-3 border-t border-border/20">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <PriceDisplay price={product.price} size="md" />
            <InventoryIndicator inventory={product.inventory} />
          </div>

          <Button
            onClick={() => onQuickAdd?.(product)}
            className="w-full h-10 bg-secondary hover:bg-primary hover:text-primary-foreground font-black rounded-xl transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 mt-3 shadow-xl text-xs"
          >
            Quick Add
          </Button>
        </div>
      </div>
    </Surface>
  );
}
