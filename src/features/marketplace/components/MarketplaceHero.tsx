import * as React from "react";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Button } from "../../../components/ui/button";

export function MarketplaceHero() {
  return (
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
  );
}
