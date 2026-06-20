import * as React from "react";
import { ShoppingBag, Leaf, Package, Zap, Users, ShieldCheck, Truck, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../../lib/utils";
import { Surface } from "../../../shared/ui/Surface";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { STAGGER_CONTAINER, FADE_UP } from "../../../core/animations";

const CATEGORIES = [
  { name: 'Sembako', icon: ShoppingBag, color: 'bg-emerald-500/10 text-emerald-500', targetCategory: 'Sembako' },
  { name: 'F&B', icon: Leaf, color: 'bg-green-500/10 text-green-500', targetCategory: 'F&B' },
  { name: 'Household', icon: Package, color: 'bg-blue-500/10 text-blue-500', disabled: true, tooltip: 'Kategori Household segera hadir' },
  { name: 'Elektronik', icon: Zap, color: 'bg-amber-500/10 text-amber-500', disabled: true, tooltip: 'Kategori Elektronik segera hadir' },
  { name: 'Fashion', icon: Users, color: 'bg-purple-500/10 text-purple-500', disabled: true, tooltip: 'Kategori Fashion segera hadir' },
  { name: 'Kesehatan', icon: ShieldCheck, color: 'bg-rose-500/10 text-rose-500', disabled: true, tooltip: 'Kategori Kesehatan segera hadir' },
  { name: 'Industri', icon: Truck, color: 'bg-slate-500/10 text-slate-500', disabled: true, tooltip: 'Kategori Industri segera hadir' },
];

export function CategoryCarousel() {
  const navigate = useNavigate();
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollAmount = clientWidth * 0.75;
      scrollRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl md:text-3xl font-black tracking-tighter text-foreground/90">Market Categories</h3>
        <div className="flex gap-2">
          <button 
            onClick={() => scroll('left')}
            className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            title="Previous"
          >
            <ChevronLeft size={18} />
          </button>
          <button 
            onClick={() => scroll('right')}
            className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            title="Next"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <motion.div 
        ref={scrollRef}
        variants={STAGGER_CONTAINER}
        initial="initial"
        animate="animate"
        className="flex gap-4 md:gap-6 overflow-x-auto pb-4 md:pb-6 custom-scrollbar scroll-smooth"
      >
         {CATEGORIES.map((cat) => (
           <motion.div
             key={cat.name}
             variants={FADE_UP}
             className="relative group/tooltip flex flex-col items-center gap-4 min-w-[110px] md:min-w-[140px] shrink-0"
           >
             <button
               onClick={() => {
                 if (cat.disabled) return;
                 navigate(`/marketplace?category=${encodeURIComponent(cat.targetCategory || '')}`);
               }}
               aria-disabled={cat.disabled ? "true" : undefined}
               className={cn(
                 "flex flex-col items-center gap-4 w-full focus:outline-none transition-all",
                 cat.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
               )}
             >
               <Surface 
                 intent="card" 
                 padding="none" 
                 hover={cat.disabled ? undefined : "glow"}
                 className="flex flex-col items-center gap-3 md:gap-4 w-full group transition-all p-4 md:p-6"
               >
                  <div className={cn(
                    "p-4 md:p-5 rounded-xl md:rounded-2xl transition-all duration-500",
                    !cat.disabled && "group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-2xl",
                    cat.color
                  )}>
                     <cat.icon className="w-6 h-6 md:w-8 md:h-8" />
                  </div>
                  <span className="text-xs md:text-base font-black tracking-tight">{cat.name}</span>
               </Surface>
             </button>

             {cat.disabled && cat.tooltip && (
               <div className="absolute bottom-full mb-3 hidden group-hover/tooltip:block bg-slate-900 text-white text-[10px] py-1.5 px-3 rounded-lg whitespace-nowrap z-50 shadow-lg border border-border/50 font-bold">
                 {cat.tooltip}
               </div>
             )}
           </motion.div>
         ))}
      </motion.div>
    </div>
  );
}

