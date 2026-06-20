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
}

export function MarketplaceProductCard({ product, onAddToCart, onDistributorClick, onNegotiate }: MarketplaceProductCardProps) {
  const tier = SUPPLIER_TIER_CONFIG.GOLD;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={MARKETPLACE_ANIMATIONS.layoutTransition}
      className="group bg-card border border-border/50 rounded-[3rem] overflow-hidden hover:shadow-3xl hover:border-primary/20 transition-all flex flex-col"
    >
      <div className="relative aspect-square overflow-hidden bg-muted group-hover:shadow-[inset_0_0_80px_rgba(34,197,94,0.1)]">
         <img 
          src={product.image} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 cursor-pointer" 
          alt={product.name} 
          onClick={() => onDistributorClick(product.distributorId)}
        />
         <div className="absolute top-6 left-6 flex flex-col gap-2">
            <StatusBadge 
              label={product.category} 
              type="neutral" 
              className="bg-black/60 text-white border-white/10 backdrop-blur-xl px-4 py-1.5" 
              dot={false}
            />
            <div className={`flex items-center gap-2 px-3 py-1 backdrop-blur-md rounded-lg text-[10px] font-black uppercase border ${tier.colorClass}`}>
               <ShieldCheck size={12} />
               {tier.label}
            </div>
         </div>
         
         <button 
          onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
          className="absolute bottom-6 right-6 w-16 h-16 bg-primary text-primary-foreground rounded-[1.5rem] flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all shadow-primary/30"
         >
            <Plus size={32} />
         </button>
      </div>

      <div className="p-5 sm:p-8 flex-1 flex flex-col justify-between space-y-6">
         <div className="space-y-4">
            <div className="flex items-center justify-between">
               <button 
                 onClick={() => onDistributorClick(product.distributorId)}
                 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] hover:text-primary transition-colors"
               >
                  {product.distributor}
               </button>
               <ReputationBadge score={product.rating} size="sm" />
            </div>
            <h3 className="font-black text-lg sm:text-xl line-clamp-2 group-hover:text-primary transition-colors italic leading-tight">
               {product.name}
            </h3>
         </div>
         
         <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2 pt-4 border-t border-border/30">
               <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">{MARKETPLACE_UI_STRINGS.pricePer} {product.unit}</p>
                  <span className="text-2xl sm:text-3xl font-black text-foreground tracking-tighter block truncate">
                     Rp {product.price.toLocaleString()}
                  </span>
               </div>
               <div className="text-right shrink-0">
                  <p className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded uppercase tracking-tighter mb-1">{MARKETPLACE_UI_STRINGS.minOrder}</p>
                  <p className="text-xs sm:text-sm font-black italic">{product.bulk}</p>
               </div>
            </div>
            {onNegotiate && (
               <Button 
                 variant="outline" 
                 className="w-full h-12 rounded-2xl border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground font-black text-xs uppercase tracking-wider"
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
