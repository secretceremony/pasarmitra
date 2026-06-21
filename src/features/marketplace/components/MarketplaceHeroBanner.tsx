import * as React from "react";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { MARKETPLACE_HERO_CONFIG, MARKETPLACE_ANIMATIONS } from "../config/marketplace-ui.config";

interface MarketplaceHeroBannerProps {
  onViewSuppliers?: () => void;
}

export function MarketplaceHeroBanner({ onViewSuppliers }: MarketplaceHeroBannerProps) {
  const navigate = useNavigate();

  const handleBrowseInventory = () => {
    const el = document.getElementById("marketplace-toolbar");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo({ top: 400, behavior: "smooth" });
    }
  };

  const handleViewVerifiedSellers = () => {
    if (onViewSuppliers) {
      onViewSuppliers();
      return;
    }
    // TEMPORARY: Since the main verified suppliers listing resides on the dashboard page,
    // we route to the dashboard and trigger a smooth scroll down to the suppliers section.
    navigate("/umkm/dashboard");
    setTimeout(() => {
      const el = document.getElementById("verified-suppliers-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }, 150);
  };

  return (
    <motion.div 
      initial={MARKETPLACE_ANIMATIONS.heroEnter}
      animate={MARKETPLACE_ANIMATIONS.heroActive}
      className="relative min-h-[300px] sm:min-h-0 sm:h-[300px] md:h-[340px] rounded-[2rem] md:rounded-[3rem] overflow-hidden group shadow-2xl flex flex-col w-full max-w-full"
    >
      <img 
        src={MARKETPLACE_HERO_CONFIG.image} 
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
        alt="Banner"
      />
      <div className="relative sm:absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/40 to-transparent flex-1 flex flex-col justify-center px-5 py-8 sm:py-0 md:px-16">
        <div className="max-w-xl space-y-4 md:space-y-6">
           <div className="flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20 w-fit">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">{MARKETPLACE_HERO_CONFIG.badge}</span>
           </div>
           <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tighter leading-[1.05]">
              {MARKETPLACE_HERO_CONFIG.title}
           </h1>
           <p className="text-xs sm:text-sm md:text-lg text-white/70 font-medium leading-relaxed line-clamp-2 sm:line-clamp-none">{MARKETPLACE_HERO_CONFIG.description}</p>
           <div className="flex flex-wrap gap-2 md:gap-3 pt-1.5 md:pt-2.5">
              <Button 
                onClick={handleBrowseInventory}
                className="h-10 sm:h-11 md:h-12 px-4 sm:px-5 rounded-lg bg-accent text-accent-foreground hover:bg-white hover:text-black shadow-lg shadow-accent/20 font-bold tracking-tight flex gap-2 text-xs sm:text-sm cursor-pointer"
              >
                 {MARKETPLACE_HERO_CONFIG.ctaPrimary}
                 <ArrowRight size={16} />
              </Button>
              <Button 
                variant="outline" 
                onClick={handleViewVerifiedSellers}
                className="h-10 sm:h-11 md:h-12 px-4 sm:px-5 rounded-lg bg-white/5 backdrop-blur-md border border-white/20 text-white font-bold text-xs sm:text-sm cursor-pointer"
              >
                 {MARKETPLACE_HERO_CONFIG.ctaSecondary}
              </Button>
           </div>
        </div>
      </div>
    </motion.div>
  );
}

