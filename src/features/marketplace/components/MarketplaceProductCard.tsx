import * as React from "react";
import { motion } from "motion/react";
import { ShieldCheck, Plus } from "lucide-react";
import { ReputationBadge } from "../../../components/common/ReputationBadge";
import { MarketplaceProduct } from "../types/product.types";
import { Button } from "../../../components/ui/button";
import { useAuthStore } from "../../../store/use-auth-store";
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
  const { user } = useAuthStore();
  const tier = SUPPLIER_TIER_CONFIG.GOLD;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={MARKETPLACE_ANIMATIONS.layoutTransition}
      onClick={() => onViewDetails?.(product)}
      className="group bg-white dark:bg-card border border-slate-200/80 dark:border-border/50 rounded-3xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col h-full w-full min-w-0 cursor-pointer"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
         <img 
          src={product.image} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
          alt={product.name} 
          onError={(e) => {
            const target = e.currentTarget;
            if (target.src !== '/assets/fallback-product.png') {
              target.src = '/assets/fallback-product.png';
            }
          }}
        />
         <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-900/95 text-white border border-slate-800 dark:bg-slate-100/95 dark:text-slate-900 dark:border-slate-200 shadow-sm backdrop-blur-md">
              {product.category}
            </span>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border bg-amber-500 text-amber-950 border-amber-400/50 shadow-sm dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30">
               <ShieldCheck size={10} />
               {tier.label}
            </div>
         </div>
         
         {user?.role === 'UMKM' && (
           <button 
            onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
            className="absolute bottom-3 right-3 w-10 h-10 bg-primary text-primary-foreground rounded-xl items-center justify-center shadow-lg hover:scale-105 active:scale-95 shadow-primary/20 cursor-pointer hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20"
            title="Tambah ke Keranjang"
           >
              <Plus size={18} />
           </button>
         )}
      </div>

      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3 min-w-0">
         <div className="space-y-2 min-w-0">
            <div className="flex items-center justify-between gap-2 min-w-0">
               <button 
                 onClick={(e) => { e.stopPropagation(); onDistributorClick(product.distributorId); }}
                 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] hover:text-primary transition-colors truncate text-left min-w-0 flex-1"
               >
                  {product.distributor}
               </button>
                <div className="flex items-center gap-1.5 shrink-0">
                   <ReputationBadge score={product.rating} size="sm" />
                   {product.reviewCount !== undefined && product.reviewCount > 0 && (
                      <span className="text-[9px] font-bold text-muted-foreground">({product.reviewCount})</span>
                   )}
                </div>
            </div>
            <h3 
              className="font-black text-lg sm:text-xl line-clamp-2 break-words text-foreground group-hover:text-primary transition-colors leading-snug"
            >
               {product.name}
            </h3>
         </div>
         
         <div className="space-y-3 mt-auto min-w-0">
            <div className="space-y-2 pt-3 border-t border-border/20 min-w-0">
               <div className="min-w-0">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
                    {MARKETPLACE_UI_STRINGS.pricePer} {product.unit}
                  </p>
                  <span className="text-xl sm:text-2xl font-black text-foreground tracking-tighter block truncate">
                     Rp {product.price.toLocaleString('id-ID')}
                  </span>
               </div>
               
               <div className="rounded-xl bg-slate-50 dark:bg-muted px-3 py-2 text-xs font-bold flex flex-col justify-center min-w-0 border border-slate-100 dark:border-border/10">
                  <span className="block text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">
                     {MARKETPLACE_UI_STRINGS.minOrder}
                  </span>
                  <span className="text-foreground truncate">{product.bulk}</span>
               </div>
            </div>

            <div className="space-y-2 min-w-0">
               {user?.role === 'UMKM' && (
                  <Button 
                    className="w-full h-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 font-black text-xs uppercase tracking-wider cursor-pointer md:hidden flex items-center justify-center gap-1.5"
                    onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
                  >
                    <Plus size={16} />
                    Tambah ke Keranjang
                  </Button>
               )}

               {onNegotiate && (
                  <Button 
                    variant="outline" 
                    className="w-full h-10 rounded-xl border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground font-black text-xs uppercase tracking-wider"
                    onClick={(e) => { e.stopPropagation(); onNegotiate(product); }}
                  >
                    Negosiasi Harga
                  </Button>
               )}
            </div>
         </div>
      </div>
    </motion.div>
  );
}
