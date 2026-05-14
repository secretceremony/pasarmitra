import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBasket, 
  Star, 
  ArrowRight, 
  Percent, 
  Truck, 
  ShieldCheck,
  Plus,
  Search,
  Filter,
  X,
  ChevronRight,
  ShoppingCart
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { ReputationBadge } from '../components/common/ReputationBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { useNotificationStore } from '../store/useNotificationStore'; // Still needed for some components possibly, or removed if unused.
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { PRODUCTS } from '../features/marketplace/data/products';
import { CATEGORIES } from '../features/marketplace/data/categories';
import { useMarketplaceFilters } from '../features/marketplace/hooks/useMarketplaceFilters';
import { useMarketplaceCart } from '../features/marketplace/hooks/useMarketplaceCart';

export default function Marketplace() {
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();

  const { 
    search, 
    setSearch, 
    selectedCategory, 
    setSelectedCategory, 
    filteredProducts 
  } = useMarketplaceFilters();

  const { handleAddToCart } = useMarketplaceCart();

  return (
    <div className="space-y-12">
      {/* Featured Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative h-[340px] rounded-[3rem] overflow-hidden group shadow-2xl"
      >
        <img 
          src="https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&q=80&w=2000" 
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
          alt="Banner"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/40 to-transparent flex flex-col justify-center px-16">
          <div className="max-w-xl space-y-6">
             <div className="flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20 w-fit">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Harvest Season 2024</span>
             </div>
             <h1 className="text-6xl font-black text-white tracking-tighter leading-[1.05]">
                Direct Source <br /><span className="text-accent italic">Wholesale Network.</span>
             </h1>
             <p className="text-white/70 font-medium text-lg leading-relaxed">Connect directly with vetted local harvesters and distributors at industrial wholesale rates.</p>
             <div className="flex gap-4 pt-4">
                <Button className="h-14 px-10 rounded-2xl bg-accent text-accent-foreground hover:bg-white hover:text-black shadow-2xl shadow-accent/20 font-black tracking-tight flex gap-2">
                   Browse Fresh Produce
                   <ArrowRight size={20} />
                </Button>
                <Button variant="outline" className="h-14 px-10 rounded-2xl bg-white/5 backdrop-blur-md border border-white/20 text-white font-black">
                   Featured Farms
                </Button>
             </div>
          </div>
        </div>
      </motion.div>

      {/* Advanced Search & Filtering Area */}
      <div className="flex flex-col md:flex-row gap-6 sticky top-28 z-30 py-2">
         <div className="flex-1 relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product, SKU, or supplier..." 
              className="w-full h-16 bg-card/60 backdrop-blur-xl border border-border/50 focus:border-primary/40 px-16 rounded-[2rem] text-sm font-bold shadow-xl transition-all outline-none"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-6 top-1/2 -translate-y-1/2 p-2 hover:bg-muted rounded-xl transition-all"
              >
                <X size={16} />
              </button>
            )}
         </div>
         
         <div className="flex gap-4">
            <div className="bg-card/60 backdrop-blur-xl border border-border/50 p-2 rounded-[1.75rem] flex gap-1 shadow-lg">
               {CATEGORIES.slice(0, 4).map(cat => (
                 <button 
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-6 h-12 rounded-2xl text-xs font-black uppercase tracking-widest transition-all",
                    selectedCategory === cat ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-muted"
                  )}
                 >
                   {cat}
                 </button>
               ))}
            </div>
            
            <Button 
               variant="outline" 
               className={cn("h-16 w-16 rounded-[1.75rem] border-border bg-card/60 backdrop-blur-xl", showFilters && "border-primary text-primary")}
               onClick={() => setShowFilters(!showFilters)}
            >
               <Filter size={24} />
            </Button>
         </div>
      </div>

      {/* Product List Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border/30">
         <div className="flex items-center gap-6">
            <h2 className="text-3xl font-black tracking-tighter">Marketplace Browse</h2>
            <div className="h-6 w-px bg-border" />
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
               {filteredProducts.length} <span className="text-primary italic">Results Found</span>
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
          {filteredProducts.map((prod, i) => (
            <motion.div
              layout
              key={prod.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="group bg-card border border-border/50 rounded-[3rem] overflow-hidden hover:shadow-3xl hover:border-primary/20 transition-all flex flex-col"
            >
              <div className="relative aspect-square overflow-hidden bg-muted group-hover:shadow-[inset_0_0_80px_rgba(34,197,94,0.1)]">
                 <img 
                  src={prod.image} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                  alt={prod.name} 
                  onClick={() => navigate(`/distributor/${prod.distributorId}`)}
                />
                 <div className="absolute top-6 left-6 flex flex-col gap-2">
                    <StatusBadge 
                      label={prod.category} 
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
                  onClick={(e) => { e.stopPropagation(); handleAddToCart(prod); }}
                  className="absolute bottom-6 right-6 w-16 h-16 bg-primary text-primary-foreground rounded-[1.5rem] flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all shadow-primary/30"
                 >
                    <Plus size={32} />
                 </button>
              </div>

              <div className="p-8 flex-1 flex flex-col justify-between space-y-6">
                 <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <button 
                        onClick={() => navigate(`/distributor/${prod.distributorId}`)}
                        className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] hover:text-primary transition-colors"
                       >
                          {prod.distributor}
                       </button>
                       <ReputationBadge score={prod.rating} size="sm" />
                    </div>
                    <h3 className="font-black text-xl line-clamp-1 group-hover:text-primary transition-colors italic leading-tight">
                       {prod.name}
                    </h3>
                 </div>
                 
                 <div className="flex items-end justify-between pt-4 border-t border-border/30">
                    <div>
                       <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Price per {prod.unit}</p>
                       <span className="text-3xl font-black text-foreground tracking-tighter">
                          Rp {prod.price.toLocaleString()}
                       </span>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded uppercase tracking-tighter mb-1">Standard Min.</p>
                       <p className="text-sm font-black italic">{prod.bulk}</p>
                    </div>
                 </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="py-40 flex flex-col items-center justify-center text-center space-y-6 bg-card border border-dashed rounded-[4rem]">
           <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <ShoppingBasket size={40} />
           </div>
           <div className="space-y-2">
              <h3 className="text-2xl font-black">No products found</h3>
              <p className="text-muted-foreground font-medium">Try adjusting your filters or search keywords.</p>
           </div>
           <Button variant="outline" onClick={() => { setSearch(''); setSelectedCategory('All'); }} className="h-12 rounded-2xl border-primary text-primary font-black uppercase px-8">Reset All Filters</Button>
        </div>
      )}
    </div>
  );
}