import * as React from "react";
import { motion } from "motion/react";
import { ShieldCheck, Plus } from "lucide-react";
import { StatusBadge } from "../../../components/common/StatusBadge";
import { ReputationBadge } from "../../../components/common/ReputationBadge";
import { MarketplaceProduct } from "../types/product.types";
import { Button } from "../../../components/ui/button";
import { 
  SUPPLIER_TIER_CONFIG, 
  MARKETPLACE_UI_STRINGS, 
  MARKETPLACE_ANIMATIONS 
} from "../config/marketplace-ui.config";

interface MarketplaceProductCardProps {
  product: MarketplaceProduct;
  onAddToCart(product: MarketplaceProduct): void;
  onDistributorClick(id: string): void;
  onNegotiate?(product: MarketplaceProduct): void;
  onViewDetails?(product: MarketplaceProduct): void;
}

export function MarketplaceProductCard({ product, onAddToCart, onDistributorClick, onNegotiate, onViewDetails }: MarketplaceProductCardProps) {
  const tier = SUPPLIER_TIER_CONFIG.GOLD;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={MARKETPLACE_ANIMATIONS.layoutTransition}
      className="group bg-card border border-border/50 rounded-3xl overflow-hidden hover:shadow-3xl hover:border-primary/20 transition-all flex flex-col h-full"
    >
      <div className="relative aspect-square overflow-hidden bg-muted group-hover:shadow-[inset_0_0_80px_rgba(34,197,94,0.1)]">
         <img 
          src={product.image} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 cursor-pointer" 
          alt={product.name} 
          onClick={() => onViewDetails ? onViewDetails(product) : onDistributorClick(product.distributorId)}
        />
         <div className="absolute top-4 left-4 flex flex-col gap-2">
            <StatusBadge 
              label={product.category} 
              type="neutral" 
              className="bg-black/60 text-white border-white/10 backdrop-blur-xl px-3 py-1 text-[9px]" 
              dot={false}
            />
            <div className={`flex items-center gap-1.5 px-2.5 py-0.5 backdrop-blur-md rounded-lg text-[9px] font-black uppercase border ${tier.colorClass}`}>
               <ShieldCheck size={10} />
               {tier.label}
            </div>
         </div>
         
         <button 
          onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
          className="absolute bottom-4 right-4 w-12 h-12 bg-primary text-primary-foreground rounded-xl flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all shadow-primary/30 cursor-pointer"
         >
            <Plus size={22} />
         </button>
      </div>

      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
         <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
               <button 
                 onClick={() => onDistributorClick(product.distributorId)}
                 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] hover:text-primary transition-colors truncate max-w-[70%]"
               >
                  {product.distributor}
               </button>
               <ReputationBadge score={product.rating} size="sm" />
            </div>
            <h3 
              onClick={() => onViewDetails?.(product)}
              className="font-black text-base sm:text-lg line-clamp-2 group-hover:text-primary transition-colors leading-tight cursor-pointer"
            >
               {product.name}
            </h3>
         </div>
         
         <div className="space-y-3 mt-auto">
            <div className="flex items-end justify-between gap-2 pt-3 border-t border-border/20">
               <div className="min-w-0">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">{MARKETPLACE_UI_STRINGS.pricePer} {product.unit}</p>
                  <span className="text-xl sm:text-2xl font-black text-foreground tracking-tighter block">
                     Rp {product.price.toLocaleString()}
                  </span>
               </div>
               <div className="text-right shrink-0">
                  <p className="text-[9px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded uppercase tracking-tighter mb-0.5">{MARKETPLACE_UI_STRINGS.minOrder}</p>
                  <p className="text-xs font-black italic">{product.bulk}</p>
               </div>
            </div>
            {onNegotiate && (
               <Button 
                 variant="outline" 
                 className="w-full h-10 rounded-xl border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground font-black text-[10px] uppercase tracking-wider"
                 onClick={(e) => { e.stopPropagation(); onNegotiate(product); }}
               >
                 Negosiasi Harga
               </Button>
            )}
         </div>
      </div>
    </motion.div>
  );
}
