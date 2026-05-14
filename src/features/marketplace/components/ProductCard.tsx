import * as React from "react";
import { motion } from "motion/react";
import { ShieldCheck, Plus } from "lucide-react";
import { StatusBadge } from "../../../components/common/StatusBadge";
import { ReputationBadge } from "../../../components/common/ReputationBadge";
import { Product } from "../types/product.types";

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onViewDistributor: (distributorId: string) => void;
}

export function ProductCard({ product, onAddToCart, onViewDistributor }: ProductCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4 }}
      className="group bg-card border border-border/50 rounded-[3rem] overflow-hidden hover:shadow-3xl hover:border-primary/20 transition-all flex flex-col"
    >
      <div className="relative aspect-square overflow-hidden bg-muted group-hover:shadow-[inset_0_0_80px_rgba(34,197,94,0.1)]">
         <img 
          src={product.image} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 cursor-pointer" 
          alt={product.name} 
          onClick={() => onViewDistributor(product.distributorId)}
        />
         <div className="absolute top-6 left-6 flex flex-col gap-2">
            <StatusBadge 
              label={product.category} 
              type="neutral" 
              className="bg-black/60 text-white border-white/10 backdrop-blur-xl px-4 py-1.5" 
              dot={false}
            />
            <div className="flex items-center gap-2 px-3 py-1 bg-primary/20 backdrop-blur-md rounded-lg text-primary text-[10px] font-black uppercase border border-primary/20">
               <ShieldCheck size={12} />
               Gold Supplier
            </div>
         </div>
         
         <button 
          onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
          className="absolute bottom-6 right-6 w-16 h-16 bg-primary text-primary-foreground rounded-[1.5rem] flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all shadow-primary/30"
         >
            <Plus size={32} />
         </button>
      </div>

      <div className="p-8 flex-1 flex flex-col justify-between space-y-6">
         <div className="space-y-4">
            <div className="flex items-center justify-between">
               <button 
                onClick={() => onViewDistributor(product.distributorId)}
                className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] hover:text-primary transition-colors"
               >
                  {product.distributor}
               </button>
               <ReputationBadge score={product.rating} size="sm" />
            </div>
            <h3 className="font-black text-xl line-clamp-1 group-hover:text-primary transition-colors italic leading-tight">
               {product.name}
            </h3>
         </div>
         
         <div className="flex items-end justify-between pt-4 border-t border-border/30">
            <div>
               <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Price per {product.unit}</p>
               <span className="text-3xl font-black text-foreground tracking-tighter">
                  Rp {product.price.toLocaleString()}
               </span>
            </div>
            <div className="text-right">
               <p className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded uppercase tracking-tighter mb-1">Standard Min.</p>
               <p className="text-sm font-black italic">{product.bulk}</p>
            </div>
         </div>
      </div>
    </motion.div>
  );
}
