import * as React from "react";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { MARKETPLACE_HERO_CONFIG, MARKETPLACE_ANIMATIONS } from "../config/marketplace-ui.config";

export function MarketplaceHeroBanner() {
  return (
    <motion.div 
      initial={MARKETPLACE_ANIMATIONS.heroEnter}
      animate={MARKETPLACE_ANIMATIONS.heroActive}
      className="relative h-[260px] sm:h-[300px] md:h-[340px] rounded-[2rem] md:rounded-[3rem] overflow-hidden group shadow-2xl"
    >
      <img 
        src={MARKETPLACE_HERO_CONFIG.image} 
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
        alt="Banner"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/40 to-transparent flex flex-col justify-center px-6 md:px-16">
        <div className="max-w-xl space-y-4 md:space-y-6">
           <div className="flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20 w-fit">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">{MARKETPLACE_HERO_CONFIG.badge}</span>
           </div>
           <h1 className="text-3xl sm:text-4xl md:text-6xl font-black text-white tracking-tighter leading-[1.05]">
              Direct Source <br /><span className="text-accent italic">Wholesale Network.</span>
           </h1>
           <p className="text-xs sm:text-sm md:text-lg text-white/70 font-medium leading-relaxed line-clamp-2 sm:line-clamp-none">{MARKETPLACE_HERO_CONFIG.description}</p>
           <div className="flex flex-wrap gap-2 md:gap-4 pt-2 md:pt-4">
              <Button className="h-12 md:h-14 px-6 md:px-10 rounded-xl md:rounded-2xl bg-accent text-accent-foreground hover:bg-white hover:text-black shadow-2xl shadow-accent/20 font-black tracking-tight flex gap-2 text-xs sm:text-sm md:text-base">
                 {MARKETPLACE_HERO_CONFIG.ctaPrimary}
                 <ArrowRight size={18} />
              </Button>
              <Button variant="outline" className="h-12 md:h-14 px-6 md:px-10 rounded-xl md:rounded-2xl bg-white/5 backdrop-blur-md border border-white/20 text-white font-black text-xs sm:text-sm md:text-base">
                 {MARKETPLACE_HERO_CONFIG.ctaSecondary}
              </Button>
           </div>
        </div>
      </div>
    </motion.div>
  );
}
