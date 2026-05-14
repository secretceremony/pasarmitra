import * as React from "react";
import { ShoppingBag, Leaf, Package, Zap, Users, ShieldCheck, Truck } from "lucide-react";
import { cn } from "../../../lib/utils";
import { Surface } from "../../../shared/ui/Surface";
import { motion } from "motion/react";
import { STAGGER_CONTAINER, FADE_UP } from "../../../core/animations";

const CATEGORIES = [
  { name: 'Sembako', icon: ShoppingBag, color: 'bg-emerald-500/10 text-emerald-500' },
  { name: 'F&B', icon: Leaf, color: 'bg-green-500/10 text-green-500' },
  { name: 'Household', icon: Package, color: 'bg-blue-500/10 text-blue-500' },
  { name: 'Elektronik', icon: Zap, color: 'bg-amber-500/10 text-amber-500' },
  { name: 'Fashion', icon: Users, color: 'bg-purple-500/10 text-purple-500' },
  { name: 'Kesehatan', icon: ShieldCheck, color: 'bg-rose-500/10 text-rose-500' },
  { name: 'Industri', icon: Truck, color: 'bg-slate-500/10 text-slate-500' },
];

export function CategoryCarousel() {
  return (
    <div className="space-y-8">
      <h3 className="text-3xl font-black tracking-tighter text-foreground/90">Market Categories</h3>
      <motion.div 
        variants={STAGGER_CONTAINER}
        initial="initial"
        animate="animate"
        className="flex gap-6 overflow-x-auto pb-6 custom-scrollbar scroll-smooth"
      >
         {CATEGORIES.map((cat) => (
           <motion.button
             key={cat.name}
             variants={FADE_UP}
             className="flex flex-col items-center gap-4 min-w-[140px] shrink-0"
           >
             <Surface 
               intent="card" 
               padding="lg" 
               hover="glow"
               className="flex flex-col items-center gap-4 w-full group transition-all"
             >
               <div className={cn("p-5 rounded-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-2xl", cat.color)}>
                  <cat.icon size={32} />
               </div>
               <span className="text-base font-black tracking-tight">{cat.name}</span>
             </Surface>
           </motion.button>
         ))}
      </motion.div>
    </div>
  );
}
